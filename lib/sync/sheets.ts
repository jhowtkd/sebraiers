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
  return value.trim();
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
  return 'instagram';
}

export function isStoryUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\/stories\//.test(path);
  } catch {
    return false;
  }
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
    const explicitNetwork = find(row, 'rede') as Network | undefined;
    const network: Network | undefined = explicitNetwork ?? detectNetwork(original_url);
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
