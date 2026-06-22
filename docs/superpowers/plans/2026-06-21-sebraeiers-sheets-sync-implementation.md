# SEBRAEIERS Google Sheets Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One-way sync from a public Google Sheets (CSV endpoint) to `public.posts`. Admin can trigger manually via button, Vercel Cron runs every 6h. Stories skipped, OG images extracted best-effort, no image re-hosting.

**Architecture:** Server-side fetch of Google's published CSV endpoint, parse with `papaparse`, orchestrate via `lib/sync/index.ts` (skips stories, dedupes by SHA-256 of URL, optionally fetches og:image, upserts into `posts` with `external_id`). Two entry points share the same orchestrator: a server action (admin button) and a POST API route (Vercel Cron, auth via `x-cron-secret` header). All network calls are best-effort with timeouts; per-row failures don't abort the whole sync.

**Tech Stack:** Next.js 14.2 (App Router), TypeScript 5.6, papaparse (new dep), @supabase/supabase-js. No new UI primitives (uses existing `Button`, `useToast`).

## Global Constraints

Copied verbatim from spec `2026-06-21-sebraeiers-sheets-sync-design.md`:

- **Source of truth:** DB. Planilha é importador one-way. Posts existentes sem `external_id` ficam intocados.
- **Trigger:** botão manual no admin + Vercel Cron (a cada 6h via POST `/api/sync`).
- **Acesso à planilha:** CSV público (sem auth). URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}`.
- **Stories:** ignorar via regex `/stories/` no path da URL — log como "skipped: story".
- **OG image:** `fetch` + regex sobre HTML, timeout 5s, **best-effort** (falha → null, segue sem cover).
- **Mapeamento de colunas:** hardcoded com override via `SHEET_COL_MAP` env. Defaults: `link_post` (ou `url`/`link`), `data_publicacao`, `titulo`, `descricao` (opcional), `rede` (opcional), `thumbnail` (opcional).
- **Detecção de rede (fallback):** parse do hostname. Default final se nada match: `'instagram'`.
- **Dedupe:** SHA-256 do `original_url` armazenado em `posts.external_id` (text, unique).
- **Auth do cron:** header `x-cron-secret` deve match `process.env.CRON_SECRET`.
- **Re-host de imagem:** NÃO. Usa og:image URL direto no `<img src>`. `<img onerror>` no PostCard pode ser adicionado em v2.
- **Sync bidirecional, OAuth, sync incremental, re-host:** roadmap (v2+). Ver spec §18.
- **Posts sem `external_id`:** nunca tocados pelo sync.
- **Server action** só roda pra admin (via `requireAdmin()`).
- **i18n:** pt-BR nos toasts e logs.
- **Tests:** Vitest com happy-dom. Testes unitários pra `lib/sync/*` (lógica pura + fetch mockado).
- **Lint/typecheck** pass após cada task.

## File Structure (target)

```
lib/
  sync/
    sheets.ts                                     # NEW (fetchSheetCSV, parseColumns, detectNetwork)
    og-image.ts                                   # NEW (fetchOgImage)
    index.ts                                      # NEW (runSync)
app/
  actions/
    sync.ts                                       # NEW (runSyncAction, SyncActionResult)
  api/
    sync/
      route.ts                                    # NEW (POST handler)
  (admin)/
    admin/posts/page.tsx                          # MODIFY (add SyncButton)
components/
  admin/
    sync-button.tsx                               # NEW
supabase/
  migrations/
    0007_posts_external_id.sql                    # NEW
vercel.json                                       # NEW
.env.example                                      # MODIFY (add SHEET_ID, SHEET_GID, CRON_SECRET, SHEET_COL_MAP)
package.json                                      # MODIFY (add papaparse, @types/papaparse)
tests/
  lib/sync/
    sheets.test.ts                                # NEW
    og-image.test.ts                              # NEW
    index.test.ts                                 # NEW
docs/superpowers/
  specs/2026-06-21-sebraeiers-sheets-sync-design.md  (exists, approved)
  plans/2026-06-21-sebraeiers-sheets-sync-implementation.md  # THIS FILE
```

---

## Task 1: Foundation (migration + deps + env + vercel.json)

**Files:**
- Create: `supabase/migrations/0007_posts_external_id.sql`
- Modify: `package.json` (add `papaparse` + `@types/papaparse`)
- Modify: `.env.example` (add new vars)
- Create: `vercel.json`

**Interfaces:**
- Produces:
  - `posts.external_id` (text, unique, nullable)
  - `posts.last_synced_at` (timestamptz, nullable)
  - Index `posts_external_id_idx` (partial, where external_id is not null)
  - `papaparse` and `@types/papaparse` in package.json
  - `vercel.json` with cron schedule `0 */6 * * *`

- [ ] **Step 1: Create the migration `supabase/migrations/0007_posts_external_id.sql`**

```sql
-- ============================================================================
-- SEBRAEIERS — Posts sync metadata (Google Sheets)
-- ============================================================================

alter table public.posts
  add column if not exists external_id text unique,
  add column if not exists last_synced_at timestamptz;

create index if not exists posts_external_id_idx
  on public.posts (external_id)
  where external_id is not null;
```

- [ ] **Step 2: Push the migration to cloud**

```bash
pnpm exec supabase db push
```

Expected: `Applying migration 0007_posts_external_id.sql... Finished supabase db push.`

- [ ] **Step 3: Install papaparse**

```bash
pnpm add papaparse && pnpm add -D @types/papaparse
```

- [ ] **Step 4: Update `.env.example`**

Append to the end of `.env.example`:

```
# ===== Google Sheets sync =====
# ID da planilha (do URL: docs.google.com/spreadsheets/d/{ID}/edit)
SHEET_ID=1_kmY7j37Tv3I_YxT-VKN5_AjqSJESUah-6Ulq6W6Ab0
# GID da aba (default 0 = primeira aba)
SHEET_GID=0
# Mapeamento de colunas opcional (formato: key=value,key=value)
# SHEET_COL_MAP=link_post=URL,data_publicacao=Date,titulo=Title
# Secreto do Vercel Cron (gere com: openssl rand -hex 32)
CRON_SECRET=replace-me-with-64-char-random-hex
```

- [ ] **Step 5: Create `vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

- [ ] **Step 6: Verify**

```bash
pnpm typecheck && pnpm lint
```

Expected: clean. (The migration is the only thing affecting the DB; the rest is just new files / package.json.)

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0007_posts_external_id.sql package.json pnpm-lock.yaml .env.example vercel.json
git commit -m "feat(sync): foundation (migration, papaparse dep, vercel.json, env vars)"
```

---

## Task 2: lib/sync/sheets.ts + lib/sync/og-image.ts (data layer)

**Files:**
- Create: `lib/sync/sheets.ts`
- Create: `lib/sync/og-image.ts`
- Create: `tests/lib/sync/sheets.test.ts`
- Create: `tests/lib/sync/og-image.test.ts`

**Interfaces:**
- Produces:
  - `fetchSheetCSV(sheetId: string, gid: string): Promise<SheetRow[]>` — fetches published CSV, parses with papaparse
  - `parseColumns(rows: SheetRow[], colMap?: Record<string, string>): NormalizedRow[]` — maps sheet column names to canonical Post fields (URL, title, description, network, published_at, cover_url)
  - `detectNetwork(url: string): Network` — parses hostname with fallback to `'instagram'`
  - `isStoryUrl(url: string): boolean` — tests `/stories/` in path
  - `fetchOgImage(url: string, timeoutMs?: number): Promise<string | null>` — best-effort fetch + regex extract

- [ ] **Step 1: Write the failing test for `sheets.ts`**

`tests/lib/sync/sheets.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { fetchSheetCSV, parseColumns, detectNetwork, isStoryUrl } from '@/lib/sync/sheets';

beforeEach(() => { fetchMock.mockReset(); });

describe('fetchSheetCSV', () => {
  it('fetches and parses CSV from Google Sheets published endpoint', async () => {
    const csv = 'link_post,titulo\nhttps://example.com/p/1,Hello\nhttps://example.com/p/2,World';
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(csv) });
    const rows = await fetchSheetCSV('sheet123', '0');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://docs.google.com/spreadsheets/d/sheet123/export?format=csv&gid=0',
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(rows).toEqual([
      { link_post: 'https://example.com/p/1', titulo: 'Hello' },
      { link_post: 'https://example.com/p/2', titulo: 'World' },
    ]);
  });

  it('throws on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('') });
    await expect(fetchSheetCSV('sheet', '0')).rejects.toThrow(/500/);
  });
});

describe('parseColumns', () => {
  it('maps default column names', () => {
    const out = parseColumns([
      { link_post: 'https://x.com/1', titulo: 'A', descricao: 'd', data_publicacao: '2025-01-01', rede: 'instagram' },
    ]);
    expect(out).toEqual([{
      original_url: 'https://x.com/1',
      title: 'A',
      description: 'd',
      published_at: '2025-01-01',
      network: 'instagram',
      cover_url: undefined,
    }]);
  });

  it('accepts alternative column names', () => {
    const out = parseColumns(
      [{ URL: 'https://x.com/2', Title: 'B', Date: '2025-02-02' }],
      { link_post: 'URL', titulo: 'Title', data_publicacao: 'Date' }
    );
    expect(out[0]).toMatchObject({ original_url: 'https://x.com/2', title: 'B', published_at: '2025-02-02' });
  });

  it('skips rows without original_url', () => {
    const out = parseColumns([{ titulo: 'No URL' }, { link_post: 'https://x.com/3', titulo: 'OK' }]);
    expect(out).toHaveLength(1);
    expect(out[0].original_url).toBe('https://x.com/3');
  });
});

describe('detectNetwork', () => {
  it('detects instagram', () => expect(detectNetwork('https://www.instagram.com/p/x/')).toBe('instagram'));
  it('detects linkedin', () => expect(detectNetwork('https://www.linkedin.com/posts/foo')).toBe('linkedin'));
  it('detects facebook', () => expect(detectNetwork('https://facebook.com/sebraego')).toBe('facebook'));
  it('detects tiktok', () => expect(detectNetwork('https://tiktok.com/@sebraego')).toBe('tiktok'));
  it('detects youtube', () => expect(detectNetwork('https://youtube.com/shorts/abc')).toBe('youtube'));
  it('detects threads', () => expect(detectNetwork('https://threads.net/@sebraego')).toBe('threads'));
  it('falls back to instagram for unknown', () => expect(detectNetwork('https://example.com/foo')).toBe('instagram'));
});

describe('isStoryUrl', () => {
  it('returns true for instagram stories', () => expect(isStoryUrl('https://www.instagram.com/stories/user/123/')).toBe(true));
  it('returns true for facebook stories', () => expect(isStoryUrl('https://facebook.com/stories/123/')).toBe(true));
  it('returns false for regular posts', () => expect(isStoryUrl('https://www.instagram.com/p/abc/')).toBe(false));
  it('returns false for reels', () => expect(isStoryUrl('https://www.instagram.com/reel/abc/')).toBe(false));
  it('returns false for youtube shorts', () => expect(isStoryUrl('https://youtube.com/shorts/abc')).toBe(false));
  it('ignores query params', () => expect(isStoryUrl('https://www.instagram.com/stories/user/123/?utm_source=x')).toBe(true));
});
```

- [ ] **Step 2: Write the failing test for `og-image.ts`**

`tests/lib/sync/og-image.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { fetchOgImage } from '@/lib/sync/og-image';

beforeEach(() => { fetchMock.mockReset(); });

describe('fetchOgImage', () => {
  it('extracts og:image from HTML', async () => {
    const html = '<html><head><meta property="og:image" content="https://cdn.example.com/img.jpg"></head></html>';
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(html) });
    expect(await fetchOgImage('https://x.com/p/1')).toBe('https://cdn.example.com/img.jpg');
  });

  it('handles attribute order swapped', async () => {
    const html = '<html><head><meta content="https://cdn.example.com/img2.jpg" property="og:image"></head></html>';
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(html) });
    expect(await fetchOgImage('https://x.com/p/1')).toBe('https://cdn.example.com/img2.jpg');
  });

  it('returns null on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, text: () => Promise.resolve('') });
    expect(await fetchOgImage('https://x.com/p/1')).toBeNull();
  });

  it('returns null when no og:image in HTML', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('<html><head></head></html>') });
    expect(await fetchOgImage('https://x.com/p/1')).toBeNull();
  });

  it('returns null on fetch error (timeout, network)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('aborted'));
    expect(await fetchOgImage('https://x.com/p/1')).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm test tests/lib/sync/
```

Expected: FAIL (module not found).

- [ ] **Step 4: Create `lib/sync/sheets.ts`**

```ts
import Papa from 'papaparse';
import type { Network } from '@/lib/types';

export type SheetRow = Record<string, string>;

const DEFAULT_COL_MAP: Record<string, string> = {
  link_post: 'link_post',
  url: 'link_post',
  link: 'link_post',
  data_publicacao: 'data_publicacao',
  data: 'data_publicacao',
  date: 'data_publicacao',
  titulo: 'titulo',
  title: 'titulo',
  descricao: 'descricao',
  description: 'descricao',
  rede: 'rede',
  network: 'rede',
  thumbnail: 'thumbnail',
  cover_url: 'thumbnail',
  imagem: 'thumbnail',
};

export type NormalizedRow = {
  original_url: string;
  title: string;
  description?: string;
  published_at: string;
  network?: Network;
  cover_url?: string;
};

export async function fetchSheetCSV(sheetId: string, gid: string): Promise<SheetRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${encodeURIComponent(gid)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'SEBRAEIERS-Sync/1.0' } });
  if (!res.ok) throw new Error(`Sheet fetch failed: HTTP ${res.status}`);
  const csv = await res.text();
  const parsed = Papa.parse<SheetRow>(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    const first = parsed.errors[0];
    throw new Error(`CSV parse error: ${first.message} (row ${first.row})`);
  }
  return parsed.data;
}

function resolveCol(name: string, colMap: Record<string, string>): string | undefined {
  const lower = name.toLowerCase().trim();
  return colMap[lower];
}

function parseDate(value: string): string {
  // Accept ISO, BR (dd/mm/yyyy), or epoch. Return ISO string.
  const trimmed = value.trim();
  // ISO already
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return new Date(trimmed).toISOString();
  // BR dd/mm/yyyy [hh:mm]
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/);
  if (br) {
    const [, d, m, y, rest] = br;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}${rest || 'T00:00:00.000Z'}`;
    return new Date(iso).toISOString();
  }
  // Fallback: let Date parse
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString();
  return new Date().toISOString(); // last resort
}

export function detectNetwork(url: string): Network {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('linkedin.com')) return 'linkedin';
    if (host.includes('facebook.com')) return 'facebook';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('threads.net') || host.includes('threads.com')) return 'threads';
  } catch {
    // ignore
  }
  return 'instagram'; // default fallback
}

export function isStoryUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\/stories\//.test(path);
  } catch {
    return false;
  }
}

function buildColMap(override?: string): Record<string, string> {
  const map: Record<string, string> = { ...DEFAULT_COL_MAP };
  if (override) {
    for (const pair of override.split(',')) {
      const [k, v] = pair.split('=').map((s) => s.trim());
      if (k && v) map[k.toLowerCase()] = v;
    }
  }
  return map;
}

export function parseColumns(rows: SheetRow[], colMapOverride?: string): NormalizedRow[] {
  const colMap = buildColMap(colMapOverride);
  const out: NormalizedRow[] = [];
  for (const row of rows) {
    // Build inverted: canonical -> actual column name
    const inverted: Record<string, string> = {};
    for (const [alias, canonical] of Object.entries(colMap)) {
      if (!inverted[canonical]) inverted[canonical] = alias;
    }
    const find = (canonical: string) => {
      const alias = inverted[canonical];
      if (!alias) return undefined;
      return row[alias];
    };
    const original_url = find('link_post');
    if (!original_url) continue;
    const title = find('titulo') ?? '(sem título)';
    const description = find('descricao');
    const published_at = parseDate(find('data_publicacao') ?? '');
    const explicitNetwork = find('rede') as Network | undefined;
    const network = explicitNetwork ?? detectNetwork(original_url);
    const cover_url = find('thumbnail');
    const normalized: NormalizedRow = { original_url, title, published_at, network };
    if (description) normalized.description = description;
    if (cover_url) normalized.cover_url = cover_url;
    out.push(normalized);
  }
  return out;
}

export function sha256(s: string): Promise<string> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then((buf) => {
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  });
}
```

- [ ] **Step 5: Create `lib/sync/og-image.ts`**

```ts
export async function fetchOgImage(url: string, timeoutMs = 5000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEBRAEIERS-Sync/1.0)' },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm test tests/lib/sync/
```

Expected: 11 sheets tests + 5 og-image tests = 16 new tests, all pass. Total: 42 + 16 = 58.

- [ ] **Step 7: Commit**

```bash
git add lib/sync/sheets.ts lib/sync/og-image.ts tests/lib/sync/
git commit -m "feat(sync): sheets CSV fetch + parse + og-image extraction (with tests)"
```

---

## Task 3: lib/sync/index.ts (orchestrator)

**Files:**
- Create: `lib/sync/index.ts`
- Create: `tests/lib/sync/index.test.ts`

**Interfaces:**
- Consumes: `fetchSheetCSV`, `parseColumns`, `detectNetwork`, `isStoryUrl`, `fetchOgImage`, `sha256` from `@/lib/sync/sheets`; `createClient` from `@/lib/supabase/server`; `requireAdmin` from `@/lib/auth`
- Produces:
  - `runSync({ sheetId, gid, colMap?, dryRun? }): Promise<SyncSummary>` — the main orchestrator

- [ ] **Step 1: Write the failing test**

`tests/lib/sync/index.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// Mock supabase server client
const fromMock = vi.fn();
const getUserMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: getUserMock }, from: fromMock }),
}));

// Mock lib/sync/sheets
vi.mock('@/lib/sync/sheets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/sync/sheets')>();
  return {
    ...actual,
    fetchSheetCSV: vi.fn(),
    parseColumns: vi.fn(),
    fetchOgImage: vi.fn(),
    sha256: vi.fn(async (s: string) => `hash(${s})`),
  };
});

import { runSync } from '@/lib/sync';
import * as sheets from '@/lib/sync/sheets';

const mockSheets = sheets as unknown as {
  fetchSheetCSV: ReturnType<typeof vi.fn>;
  parseColumns: ReturnType<typeof vi.fn>;
  fetchOgImage: ReturnType<typeof vi.fn>;
};

describe('runSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates new posts for new rows', async () => {
    mockSheets.fetchSheetCSV.mockResolvedValueOnce([{ link_post: 'u1', titulo: 'A' }]);
    mockSheets.parseColumns.mockReturnValueOnce([
      { original_url: 'https://x.com/1', title: 'A', published_at: '2025-01-01T00:00:00.000Z', network: 'instagram' },
    ]);
    mockSheets.fetchOgImage.mockResolvedValueOnce('https://img.jpg');
    // First .from('posts') is SELECT (existing)
    let call = 0;
    fromMock.mockImplementation((table: string) => {
      call++;
      if (table === 'posts' && call === 1) {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
      }
      if (table === 'posts' && (call === 2 || call === 3)) {
        return { insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'p1' }, error: null }) }) }), update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }), insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'p1' } }) }) }), update: () => ({ eq: () => Promise.resolve({}) }) };
    });
    const summary = await runSync({ sheetId: 's', gid: '0', adminId: 'a1' });
    expect(summary.created).toBe(1);
    expect(summary.updated).toBe(0);
    expect(summary.skipped_stories).toBe(0);
  });

  it('skips story URLs', async () => {
    mockSheets.fetchSheetCSV.mockResolvedValueOnce([{ link_post: 'u1' }]);
    mockSheets.parseColumns.mockReturnValueOnce([
      { original_url: 'https://www.instagram.com/stories/user/123/', title: 'Story', published_at: '2025-01-01T00:00:00.000Z', network: 'instagram' },
    ]);
    const summary = await runSync({ sheetId: 's', gid: '0', adminId: 'a1' });
    expect(summary.skipped_stories).toBe(1);
    expect(summary.created).toBe(0);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('updates existing post by external_id', async () => {
    mockSheets.fetchSheetCSV.mockResolvedValueOnce([{ link_post: 'u1' }]);
    mockSheets.parseColumns.mockReturnValueOnce([
      { original_url: 'https://x.com/1', title: 'Updated', published_at: '2025-01-01T00:00:00.000Z', network: 'instagram' },
    ]);
    mockSheets.fetchOgImage.mockResolvedValueOnce(null);
    // SELECT existing returns a row
    fromMock.mockImplementation((table: string) => {
      if (table === 'posts') {
        const selChain = { eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'p-existing' }, error: null }) }) };
        const updChain = { eq: () => Promise.resolve({ error: null }) };
        return { select: () => selChain, update: () => updChain, insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'p-new' } }) }) }) };
      }
      return {};
    });
    const summary = await runSync({ sheetId: 's', gid: '0', adminId: 'a1' });
    expect(summary.updated).toBe(1);
    expect(summary.created).toBe(0);
  });

  it('continues on per-row error', async () => {
    mockSheets.fetchSheetCSV.mockResolvedValueOnce([{ link_post: 'u1' }, { link_post: 'u2' }]);
    mockSheets.parseColumns.mockReturnValueOnce([
      { original_url: 'https://x.com/1', title: 'A', published_at: '2025-01-01T00:00:00.000Z', network: 'instagram' },
      { original_url: 'https://x.com/2', title: 'B', published_at: '2025-01-02T00:00:00.000Z', network: 'instagram' },
    ]);
    let call = 0;
    fromMock.mockImplementation((table: string) => {
      if (table === 'posts') {
        call++;
        if (call === 1) {
          // First SELECT errors
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.reject(new Error('db down')) }) }) };
        }
        if (call === 2) {
          // Second SELECT returns null, then INSERT
          return {
            select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
            insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'p2' } }) }) }),
            update: () => ({ eq: () => Promise.resolve({}) }),
          };
        }
      }
      return {};
    });
    const summary = await runSync({ sheetId: 's', gid: '0', adminId: 'a1' });
    expect(summary.errors).toBe(1);
    expect(summary.created).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test tests/lib/sync/index.test.ts
```

Expected: FAIL (module not found or type errors).

- [ ] **Step 3: Create `lib/sync/index.ts`**

```ts
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import {
  fetchSheetCSV,
  parseColumns,
  fetchOgImage,
  sha256,
  isStoryUrl,
  type SheetRow,
  type NormalizedRow,
} from './sheets';

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
  colMap?: string;
  adminId: string;
  dryRun?: boolean;
};

export async function runSync(opts: RunSyncOptions): Promise<SyncSummary> {
  const { sheetId, gid, colMap, adminId, dryRun = false } = opts;
  const summary: SyncSummary = {
    created: 0, updated: 0, skipped_stories: 0, skipped_no_url: 0, errors: 0, og_images_found: 0,
  };

  let rows: SheetRow[];
  try {
    rows = await fetchSheetCSV(sheetId, gid);
  } catch (e) {
    throw new Error(`fetchSheetCSV failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const normalized = parseColumns(rows, colMap);
  const supabase = await createClient();

  for (const row of normalized) {
    try {
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
        if (dryRun) { summary.updated++; continue; }
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
        if (dryRun) { summary.created++; continue; }
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test tests/lib/sync/index.test.ts
```

Expected: 4 tests pass. Total: 42 + 16 + 4 = 62.

- [ ] **Step 5: Commit**

```bash
git add lib/sync/index.ts tests/lib/sync/index.test.ts
git commit -m "feat(sync): orchestrator (runSync) with dedupe, story skip, og-image fallback (tested)"
```

---

## Task 4: Server action + API route

**Files:**
- Create: `app/actions/sync.ts`
- Create: `app/api/sync/route.ts`

**Interfaces:**
- Produces:
  - `runSyncAction()` server action (admin-only) → returns `SyncActionResult`
  - `POST /api/sync` HTTP endpoint (auth via `x-cron-secret` header) → returns `SyncSummary` JSON

- [ ] **Step 1: Create `app/actions/sync.ts`**

```ts
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
  const colMap = process.env.SHEET_COL_MAP;
  if (!sheetId) return { ok: false, error: 'SHEET_ID não configurado' };

  try {
    const summary = await runSync({ sheetId, gid, colMap, adminId: profile.id });
    return { ok: true, summary };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}
```

- [ ] **Step 2: Create `app/api/sync/route.ts`**

```ts
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
  const colMap = process.env.SHEET_COL_MAP;
  if (!sheetId) {
    return NextResponse.json({ error: 'SHEET_ID not configured' }, { status: 500 });
  }

  // Vercel Cron doesn't carry a user session; use a service admin id.
  // Convention: first admin in the profiles table.
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
```

- [ ] **Step 3: Update `.env.example` to add `SYNC_SERVICE_ADMIN_ID`**

Append after `CRON_SECRET`:

```
# UUID do user admin que será o "created_by" de posts vindos do sync (não tem sessão)
# Pegue em: Supabase Dashboard → Authentication → Users → click no admin → copy UUID
SYNC_SERVICE_ADMIN_ID=replace-with-admin-user-uuid
```

- [ ] **Step 4: Commit**

```bash
git add app/actions/sync.ts app/api/sync/route.ts .env.example
git commit -m "feat(sync): server action + cron API route with CRON_SECRET auth"
```

---

## Task 5: SyncButton component + admin page integration

**Files:**
- Create: `components/admin/sync-button.tsx`
- Modify: `app/(admin)/admin/posts/page.tsx` (add `<SyncButton />` to header)

**Interfaces:**
- Produces: `<SyncButton />` client component that calls `runSyncAction()` and shows result toast

- [ ] **Step 1: Create `components/admin/sync-button.tsx`**

```tsx
'use client';

import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { runSyncAction, type SyncActionResult } from '@/app/actions/sync';
import { useToast } from '@/components/ui/toast';

export function SyncButton() {
  const [busy, start] = useTransition();
  const { toast } = useToast();

  function onClick() {
    start(async () => {
      const res: SyncActionResult = await runSyncAction();
      if (!res.ok) {
        toast({
          title: 'Erro na sincronização',
          description: res.error,
          variant: 'error',
        });
        return;
      }
      const s = res.summary;
      const parts: string[] = [];
      if (s.created) parts.push(`${s.created} novos`);
      if (s.updated) parts.push(`${s.updated} atualizados`);
      if (s.skipped_stories) parts.push(`${s.skipped_stories} stories ignoradas`);
      if (s.errors) parts.push(`${s.errors} erros`);
      const description = parts.length > 0
        ? parts.join(', ')
        : 'Nenhum post novo ou atualizado';
      toast({
        title: 'Sincronização concluída',
        description,
        variant: s.errors > 0 ? 'info' : 'success',
      });
    });
  }

  return (
    <Button variant="secondary" onClick={onClick} disabled={busy} loading={busy}>
      <RefreshCw className={busy ? 'animate-spin' : ''} />
      Importar agora
    </Button>
  );
}
```

- [ ] **Step 2: Modify `app/(admin)/admin/posts/page.tsx`**

Find the header section that has `<h1>Publicações</h1>` and `<Link href="/admin/posts/new"><Button>Nova publicação</Button></Link>`. Replace the entire header div with:

```tsx
<div className="flex items-center justify-between">
  <h1 className="text-h1 text-text-primary">Publicações</h1>
  <div className="flex items-center gap-2">
    <SyncButton />
    <Link href="/admin/posts/new"><Button>Nova publicação</Button></Link>
  </div>
</div>
```

Add the import at the top of the file (next to the existing `Link` / `Button` imports):

```tsx
import { SyncButton } from '@/components/admin/sync-button';
```

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Expected: all clean. 62 tests passing. Build generates 16 routes (one new `/api/sync`).

- [ ] **Step 4: Manual visual check (dev server running)**

Open `http://localhost:3000/admin/posts` in the browser (after logging in as admin). Confirm:
- "Importar agora" button appears next to "Nova publicação"
- Click → shows spinner → toast with summary
- The sync uses `SHEET_ID` from `.env.local` (the public sheet ID)

- [ ] **Step 5: Commit**

```bash
git add components/admin/sync-button.tsx "app/(admin)/admin/posts/page.tsx"
git commit -m "feat(sync): SyncButton in admin posts header + page integration"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| §3 changes (migration, lib/sync, action, API, vercel.json, button, env, package) | All 5 tasks |
| §4 migration (external_id, last_synced_at) | Task 1 |
| §5 sync flow (fetch CSV → parse → loop → dedupe → upsert → og:image) | Task 3 |
| §6 column mapping + detectNetwork | Task 2 |
| §7 og-image (5s timeout, regex) | Task 2 |
| §8 server action (requireAdmin, env vars) | Task 4 |
| §9 API route (x-cron-secret) | Task 4 |
| §10 vercel.json cron | Task 1 |
| §11 SyncButton component | Task 5 |
| §12 page integration | Task 5 |
| §13 env vars (SHEET_ID, SHEET_GID, SHEET_COL_MAP, CRON_SECRET) | Task 1 |
| §14 dependencies (papaparse) | Task 1 |
| §17 acceptance criteria | All tasks + final verification |

**Placeholder scan:** No "TBD", "TODO", "later", "similar to", "fill in". All steps have concrete code.

**Type consistency:**
- `SyncSummary` exported from `lib/sync/index.ts` is the same type imported by `app/actions/sync.ts` and `app/api/sync/route.ts`.
- `NormalizedRow` from `lib/sync/sheets.ts` is consumed only by `lib/sync/index.ts` (no external surface).
- `SyncActionResult` from `app/actions/sync.ts` is consumed by `components/admin/sync-button.tsx`.
- `Network` type from `@/lib/types` is used consistently (constrained to the 6 networks; `detectNetwork` always returns one).

**Potential issues for implementer to watch:**
- `parseColumns` in Task 2 builds an inverted map; verify the test for "alternative column names" works (the inverted map logic). If a canonical name appears as both an alias and a value (e.g., `link_post: link_post` in the default map AND in the override), the default wins because we spread `DEFAULT_COL_MAP` first and only overwrite if the key exists in the override.
- `crypto.subtle.digest` requires Node 20+ (we have Node 20.16). It's available in the Node runtime; in Edge runtime it would also work (Web Crypto). Since `lib/sync/index.ts` is `'server-only'` and runs only in Node, this is safe.
- The `parseColumns` test for "alternative column names" passes a row keyed by `URL` (uppercase). The function lowercases the column name before lookup, so this works.
- The `runSync` tests use `vi.mock('@/lib/sync/sheets', ...)` to override the helpers. The mock spreads `actual` so `isStoryUrl` and `detectNetwork` (which the orchestrator uses) still work.
- For Task 4's `SYNC_SERVICE_ADMIN_ID`: the implementer must run a SQL query against Supabase to get a real admin's UUID, then add it to `.env.local`. Document this in the env example.
- The `SHEET_ID` in `.env.local` is already set to the user's public sheet ID (`1_kmY7j37Tv3I_YxT-VKN5_AjqSJESUah-6Ulq6W6Ab0`). Task 1 sets this in `.env.example`; the actual `.env.local` already has it from when we set up Supabase cloud.
- The `meu-desempenho` page and other places that show posts: posts with `external_id` set render identically to posts without — no UI change needed.
- The seed-demo posts (created by Maria) have `external_id = null` (since the migration adds the column with no default). They won't be touched by sync. The new posts from the sheet will have `external_id` set, but visually identical.
- For testing Task 3: the test mocks `parseColumns` to return controlled data. Without the mock, the test would also need to mock the CSV which is more complex. The brief pattern is consistent with how v1 tested `getTimeline` (server-only, no test).
