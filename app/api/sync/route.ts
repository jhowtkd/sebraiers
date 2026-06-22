import { NextResponse, type NextRequest } from 'next/server';
import { runSync, type SyncSummary } from '@/lib/sync';

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
  const colMap = process.env.SHEET_COL_MAP
    ? Object.fromEntries(
        process.env.SHEET_COL_MAP.split(',')
          .map((kv) => kv.split('=') as [string, string])
          .filter(([k, v]) => k && v)
      )
    : undefined;
  if (!sheetId) {
    return NextResponse.json({ error: 'SHEET_ID not configured' }, { status: 500 });
  }

  const serviceAdminId = process.env.SYNC_SERVICE_ADMIN_ID;
  if (!serviceAdminId) {
    return NextResponse.json(
      { error: 'SYNC_SERVICE_ADMIN_ID not configured' },
      { status: 500 }
    );
  }

  try {
    const summary: SyncSummary = await runSync({ sheetId, gid, colMap, adminId: serviceAdminId });
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}