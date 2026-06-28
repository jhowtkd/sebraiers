import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchSheetCSV,
  parseColumns,
  parseColMap,
  sha256,
  isStoryUrl,
  type NormalizedRow,
} from './sheets';
import { fetchOgImage } from './og-image';
import { chunkArray, mapWithConcurrency } from './concurrency';

export { parseColMap };

const EXISTING_LOOKUP_CHUNK = 100;
const UPSERT_CHUNK = 50;
const OG_FETCH_CONCURRENCY = 8;

export type SyncSummary = {
  created: number;
  updated: number;
  skipped_stories: number;
  errors: number;
  og_images_found: number;
};

type RunSyncOptions = {
  sheetId: string;
  gid: string;
  colMap?: Record<string, string>;
  adminId: string;
  dryRun?: boolean;
  client?: SupabaseClient;
};

type WorkItem = {
  row: NormalizedRow;
  external_id: string;
  cover_url?: string;
};

type ExistingPost = { id: string; cover_url: string | null; external_id: string };

async function loadExistingByExternalId(
  supabase: SupabaseClient,
  externalIds: string[],
): Promise<Map<string, ExistingPost>> {
  const map = new Map<string, ExistingPost>();
  for (const chunk of chunkArray(externalIds, EXISTING_LOOKUP_CHUNK)) {
    const { data, error } = await supabase
      .from('posts')
      .select('id, cover_url, external_id')
      .in('external_id', chunk);
    if (error) throw error;
    for (const post of data ?? []) {
      if (post.external_id) map.set(post.external_id, post as ExistingPost);
    }
  }
  return map;
}

async function resolveCoverUrls(
  items: WorkItem[],
  existingById: Map<string, ExistingPost>,
  summary: SyncSummary,
): Promise<void> {
  const needsOg: WorkItem[] = [];
  for (const item of items) {
    const existing = existingById.get(item.external_id);
    item.cover_url = item.row.cover_url ?? existing?.cover_url ?? undefined;
    if (!item.cover_url) needsOg.push(item);
  }

  if (needsOg.length === 0) return;

  await mapWithConcurrency(needsOg, OG_FETCH_CONCURRENCY, async (item) => {
    const og = await fetchOgImage(item.row.original_url);
    if (og) {
      item.cover_url = og;
      summary.og_images_found++;
    }
  });
}

async function upsertWorkItems(
  supabase: SupabaseClient,
  items: WorkItem[],
  existingById: Map<string, ExistingPost>,
  adminId: string,
  summary: SyncSummary,
): Promise<void> {
  const now = new Date().toISOString();

  for (const chunk of chunkArray(items, UPSERT_CHUNK)) {
    const rows = chunk.map((item) => {
      const existing = existingById.get(item.external_id);
      return {
        ...(existing ? { id: existing.id } : {}),
        title: item.row.title,
        description: item.row.description ?? null,
        network: item.row.network!,
        original_url: item.row.original_url,
        cover_url: item.cover_url ?? null,
        published_at: item.row.published_at,
        created_by: adminId,
        is_active: true,
        external_id: item.external_id,
        last_synced_at: now,
      };
    });

    const { error } = await supabase.from('posts').upsert(rows, { onConflict: 'external_id' });
    if (error) throw error;

    for (const item of chunk) {
      if (existingById.has(item.external_id)) summary.updated++;
      else summary.created++;
    }
  }
}

export async function runSync(opts: RunSyncOptions): Promise<SyncSummary> {
  const { sheetId, gid, colMap, adminId, dryRun = false } = opts;
  const summary: SyncSummary = {
    created: 0,
    updated: 0,
    skipped_stories: 0,
    errors: 0,
    og_images_found: 0,
  };

  let rows;
  try {
    rows = await fetchSheetCSV(sheetId, gid);
  } catch (e) {
    throw new Error(`fetchSheetCSV failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const normalized = parseColumns(rows, colMap);
  const supabase: SupabaseClient = opts.client ?? (await createClient());

  const workItems: WorkItem[] = [];
  for (const row of normalized) {
    if (isStoryUrl(row.original_url)) {
      summary.skipped_stories++;
      continue;
    }
    try {
      const external_id = await sha256(row.original_url);
      workItems.push({ row, external_id });
    } catch (e) {
      console.error(`[sync] error hashing ${row.original_url}:`, e);
      summary.errors++;
    }
  }

  if (workItems.length === 0) return summary;

  let existingById: Map<string, ExistingPost>;
  try {
    existingById = await loadExistingByExternalId(
      supabase,
      workItems.map((item) => item.external_id),
    );
  } catch (e) {
    throw new Error(`loadExistingByExternalId failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    await resolveCoverUrls(workItems, existingById, summary);
  } catch (e) {
    console.error('[sync] OG resolution failed:', e);
    summary.errors += workItems.length;
    return summary;
  }

  if (dryRun) {
    for (const item of workItems) {
      if (existingById.has(item.external_id)) summary.updated++;
      else summary.created++;
    }
    return summary;
  }

  try {
    await upsertWorkItems(supabase, workItems, existingById, adminId, summary);
  } catch (e) {
    console.error('[sync] upsert failed:', e);
    summary.errors += workItems.length;
    summary.created = 0;
    summary.updated = 0;
  }

  return summary;
}
