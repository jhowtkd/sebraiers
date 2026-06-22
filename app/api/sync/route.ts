import { NextResponse, type NextRequest } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { runSync, type SyncSummary, parseColMap } from '@/lib/sync';

export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const provided = request.headers.get('x-cron-secret');
  if (provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sheetId = process.env.SHEET_ID;
  const gid = process.env.SHEET_GID ?? '0';
  const colMap = parseColMap(process.env.SHEET_COL_MAP);
  if (!sheetId) {
    return NextResponse.json({ error: 'SHEET_ID not configured' }, { status: 500 });
  }

  const authorProfileId = process.env.SYNC_AUTHOR_PROFILE_ID;
  if (!authorProfileId) {
    return NextResponse.json(
      { error: 'SYNC_AUTHOR_PROFILE_ID not configured' },
      { status: 500 }
    );
  }

  try {
    const admin = getAdminClient();
    const summary: SyncSummary = await runSync({
      sheetId,
      gid,
      colMap,
      adminId: authorProfileId,
      client: admin,
    });
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
