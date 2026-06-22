'use server';

import { getCurrentProfile } from '@/lib/auth';
import { runSync, type SyncSummary } from '@/lib/sync';

export type SyncActionResult =
  | { ok: true; summary: SyncSummary }
  | { ok: false; error: string };

export async function runSyncAction(): Promise<SyncActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: 'Não autenticado' };
  if (!profile.is_admin) return { ok: false, error: 'Sem permissão' };

  const sheetId = process.env.SHEET_ID;
  const gid = process.env.SHEET_GID ?? '0';
  const colMap = process.env.SHEET_COL_MAP
    ? Object.fromEntries(
        process.env.SHEET_COL_MAP.split(',')
          .map((kv) => kv.split('=') as [string, string])
          .filter(([k, v]) => k && v)
      )
    : undefined;
  if (!sheetId) return { ok: false, error: 'SHEET_ID não configurado' };

  try {
    const summary = await runSync({ sheetId, gid, colMap, adminId: profile.id });
    return { ok: true, summary };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}