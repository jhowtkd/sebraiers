import { NextResponse, type NextRequest } from 'next/server';
import { executeSheetSync, verifyCronSecret } from '@/lib/sync/execute-sheet-sync';

async function handleCronSync() {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const result = await executeSheetSync();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.summary);
}

async function authorizeCron(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/** Cloudflare Cron (POST via worker) and manual triggers. */
export async function POST(request: NextRequest) {
  const authError = await authorizeCron(request);
  if (authError) return authError;
  return handleCronSync();
}

/** Vercel Cron and HTTP-based schedulers (GET + Authorization header). */
export async function GET(request: NextRequest) {
  const authError = await authorizeCron(request);
  if (authError) return authError;
  return handleCronSync();
}
