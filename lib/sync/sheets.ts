import 'server-only';
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

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSheetCSV(sheetId: string, gid: string): Promise<SheetRow[]> {
  const id = encodeURIComponent(sheetId);
  const g = encodeURIComponent(gid);
  const headers = { 'User-Agent': 'SEBRAEIERS-Sync/1.0' };
  const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${g}`;
  let res = await fetchWithTimeout(exportUrl, { headers });
  if (!res.ok) {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${g}`;
    res = await fetchWithTimeout(gvizUrl, { headers });
    if (!res.ok) throw new Error(`Sheet fetch failed: HTTP ${res.status} (tried /export and /gviz/tq)`);
  }
  const csv = await res.text();
  const parsed = Papa.parse<SheetRow>(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    const fatal = parsed.errors.find((e) => e.type === 'Delimiter' || e.code === 'UndetectableDelimiter');
    if (fatal) {
      throw new Error(`CSV parse fatal: ${fatal.message} (row ${fatal.row})`);
    }
    console.warn(`[sync] CSV has ${parsed.errors.length} non-fatal parse warnings (e.g., ragged rows); continuing`);
  }
  return parsed.data;
}

function buildCanonicalMap(override?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [alias, canonical] of Object.entries(DEFAULT_COL_MAP)) {
    if (!(canonical in out)) out[canonical] = alias;
  }
  if (override) {
    for (const [canonical, actual] of Object.entries(override)) {
      out[canonical] = actual;
    }
  }
  return out;
}

function parseDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return new Date(trimmed).toISOString();
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/);
  if (br) {
    const [, d, m, y, rest] = br;
    const time = rest
      ? rest.startsWith('T')
        ? rest
        : `T${rest.trim()}`
      : 'T00:00:00.000Z';
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}${time}`;
    const dt = new Date(iso);
    if (!isNaN(dt.getTime())) return dt.toISOString();
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString();
  return new Date().toISOString();
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
    if (host === 'x.com' || host === 'twitter.com' || host.endsWith('.x.com') || host.endsWith('.twitter.com')) return 'x';
  } catch {
    // ignore
  }
  return 'instagram';
}

const NETWORK_HEADS = new Set<Network>([
  'instagram',
  'linkedin',
  'facebook',
  'tiktok',
  'youtube',
  'threads',
  'x',
]);

/**
 * Parse the `rede` column from the sheet. The sheet encodes "Network/Format"
 * or "Network:Format/Type" (e.g. "Instagram/Carrossel", "Instagram:Feed/Story",
 * "LinkedIn/Artigo", "X"). Returns the network name, falling back to
 * detectNetwork(originalUrl) when the value is missing or unrecognized.
 */
export function parseRede(rede: string | undefined, originalUrl: string): Network {
  if (!rede) return detectNetwork(originalUrl);
  const head = rede.split(/[/:]/)[0].trim().toLowerCase();
  if (NETWORK_HEADS.has(head as Network)) return head as Network;
  return detectNetwork(originalUrl);
}

export function isStoryUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\/stories\//.test(path);
  } catch {
    return false;
  }
}

export function parseColMap(value: string | undefined): Record<string, string> | undefined {
  if (!value) return undefined;
  const out: Record<string, string> = {};
  for (const kv of value.split(',')) {
    const [k, v] = kv.split('=') as [string, string];
    if (k && v) out[k.trim()] = v.trim();
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function parseColumns(
  rows: SheetRow[],
  colMap?: Record<string, string>,
): NormalizedRow[] {
  const canonicalToActual = buildCanonicalMap(colMap);
  const find = (row: SheetRow, canonical: string) => {
    const actual = canonicalToActual[canonical];
    if (!actual) return undefined;
    return row[actual];
  };

  const out: NormalizedRow[] = [];
  for (const row of rows) {
    const original_url = find(row, 'link_post');
    if (!original_url) continue;
    const title = find(row, 'titulo') ?? '(sem título)';
    const description = find(row, 'descricao');
    const published_at = parseDate(find(row, 'data_publicacao') ?? '');
    const explicitNetwork = find(row, 'rede');
    const network: Network = parseRede(explicitNetwork, original_url);
    const cover_url = find(row, 'thumbnail');
    const normalized: NormalizedRow = {
      original_url,
      title,
      description,
      published_at,
      network,
      cover_url,
    };
    out.push(normalized);
  }
  return out;
}

export function sha256(s: string): Promise<string> {
  return crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(s))
    .then((buf) =>
      Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
    );
}
