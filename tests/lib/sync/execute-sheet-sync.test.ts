import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  verifyCronSecret,
  resolveAgencySyncAuthorId,
  executeSheetSync,
} from '@/lib/sync/execute-sheet-sync';

const runSyncMock = vi.fn();
vi.mock('@/lib/sync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/sync')>();
  return { ...actual, runSync: (...args: unknown[]) => runSyncMock(...args) };
});

const getAdminClientMock = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => getAdminClientMock(),
}));

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/sync', { headers });
}

describe('verifyCronSecret', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts x-cron-secret header', () => {
    const request = makeRequest({ 'x-cron-secret': 'test-secret' });
    expect(verifyCronSecret(request)).toBe(true);
  });

  it('accepts Authorization Bearer header', () => {
    const request = makeRequest({ authorization: 'Bearer test-secret' });
    expect(verifyCronSecret(request)).toBe(true);
  });

  it('rejects missing or wrong secret', () => {
    expect(verifyCronSecret(makeRequest())).toBe(false);
    expect(verifyCronSecret(makeRequest({ 'x-cron-secret': 'wrong' }))).toBe(false);
  });
});

describe('resolveAgencySyncAuthorId', () => {
  it('returns profile id from rpc', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: 'uuid-1', error: null }),
    };
    await expect(resolveAgencySyncAuthorId(client)).resolves.toBe('uuid-1');
  });

  it('throws when rpc fails', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
    };
    await expect(resolveAgencySyncAuthorId(client)).rejects.toThrow('Failed to resolve agency admin');
  });
});

describe('executeSheetSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SHEET_ID', 'sheet-1');
    getAdminClientMock.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: 'author-uuid', error: null }),
    });
    runSyncMock.mockResolvedValue({ created: 1, updated: 0, skipped_stories: 0, errors: 0, og_images_found: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns error when SHEET_ID is missing', async () => {
    vi.stubEnv('SHEET_ID', '');
    const result = await executeSheetSync();
    expect(result).toEqual({ ok: false, error: 'SHEET_ID not configured', status: 500 });
  });

  it('returns error when no agency admin exists', async () => {
    getAdminClientMock.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    const result = await executeSheetSync();
    expect(result).toEqual({ ok: false, error: 'no agency admin found', status: 500 });
  });

  it('runs sync with oldest agency admin profile id', async () => {
    const result = await executeSheetSync();
    expect(result.ok).toBe(true);
    expect(runSyncMock).toHaveBeenCalledWith(
      expect.objectContaining({ adminId: 'author-uuid', sheetId: 'sheet-1' })
    );
  });

  it('returns error when sync reports row errors', async () => {
    runSyncMock.mockResolvedValue({ created: 0, updated: 0, skipped_stories: 0, errors: 2, og_images_found: 0 });
    const result = await executeSheetSync();
    expect(result).toEqual({
      ok: false,
      error: 'sync completed with 2 row error(s)',
      status: 500,
    });
  });
});
