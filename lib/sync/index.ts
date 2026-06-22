import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchSheetCSV,
  parseColumns,
  sha256,
  isStoryUrl,
  type SheetRow,
} from './sheets';
import { fetchOgImage } from './og-image';

export type SyncSummary = {
  created: number;
  updated: number;
  skipped_stories: number;
  skipped_no_url: number;
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

export async function runSync(opts: RunSyncOptions): Promise<SyncSummary> {
  const { sheetId, gid, colMap, adminId, dryRun = false } = opts;
  const summary: SyncSummary = {
    created: 0,
    updated: 0,
    skipped_stories: 0,
    skipped_no_url: 0,
    errors: 0,
    og_images_found: 0,
  };

  let rows: SheetRow[];
  try {
    rows = await fetchSheetCSV(sheetId, gid);
  } catch (e) {
    throw new Error(`fetchSheetCSV failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const normalized = parseColumns(rows, colMap);
  const supabase: SupabaseClient = opts.client ?? (await createClient());

  for (const row of normalized) {
    try {
      if (!row.original_url) {
        summary.skipped_no_url++;
        continue;
      }
      if (isStoryUrl(row.original_url)) {
        summary.skipped_stories++;
        continue;
      }
      const external_id = await sha256(row.original_url);
      const { data: existing } = await supabase
        .from('posts')
        .select('id, cover_url')
        .eq('external_id', external_id)
        .maybeSingle();

      let cover_url = row.cover_url;
      if (!cover_url) {
        const og = await fetchOgImage(row.original_url);
        if (og) {
          cover_url = og;
          summary.og_images_found++;
        }
      }

      const now = new Date().toISOString();
      if (existing) {
        if (dryRun) {
          summary.updated++;
          continue;
        }
        const { error } = await supabase
          .from('posts')
          .update({
            title: row.title,
            description: row.description ?? null,
            network: row.network!,
            original_url: row.original_url,
            cover_url: cover_url ?? existing.cover_url ?? null,
            published_at: row.published_at,
            last_synced_at: now,
          })
          .eq('id', existing.id);
        if (error) throw error;
        summary.updated++;
      } else {
        if (dryRun) {
          summary.created++;
          continue;
        }
        const { error } = await supabase.from('posts').insert({
          title: row.title,
          description: row.description ?? null,
          network: row.network!,
          original_url: row.original_url,
          cover_url: cover_url ?? null,
          published_at: row.published_at,
          created_by: adminId,
          is_active: true,
          external_id,
          last_synced_at: now,
        });
        if (error) throw error;
        summary.created++;
      }
    } catch (e) {
      console.error(`[sync] error processing ${row.original_url}:`, e);
      summary.errors++;
    }
  }

  return summary;
}