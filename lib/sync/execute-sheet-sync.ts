import 'server-only';
import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase/admin';
import { runSync, type SyncSummary, parseColMap } from '@/lib/sync';

export type SheetSyncResult =
  | { ok: true; summary: SyncSummary }
  | { ok: false; error: string; status: number };

export function verifyCronSecret(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const fromHeader = request.headers.get('x-cron-secret');
  if (fromHeader === expected) return true;

  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer === expected;
}

export async function resolveAgencySyncAuthorId(
  client: Pick<SupabaseClient, 'rpc'>
): Promise<string | null> {
  const { data, error } = await client.rpc('get_oldest_agency_admin_profile_id');
  if (error) {
    throw new Error(`Failed to resolve agency admin: ${error.message}`);
  }
  return data ?? null;
}

export async function executeSheetSync(): Promise<SheetSyncResult> {
  const sheetId = process.env.SHEET_ID;
  const gid = process.env.SHEET_GID ?? '0';
  const colMap = parseColMap(process.env.SHEET_COL_MAP);
  if (!sheetId) {
    return { ok: false, error: 'SHEET_ID not configured', status: 500 };
  }

  try {
    const admin = getAdminClient();
    const authorProfileId = await resolveAgencySyncAuthorId(admin);
    if (!authorProfileId) {
      return { ok: false, error: 'no agency admin found', status: 500 };
    }

    const summary = await runSync({
      sheetId,
      gid,
      colMap,
      adminId: authorProfileId,
      client: admin,
    });
    return { ok: true, summary };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
      status: 500,
    };
  }
}
