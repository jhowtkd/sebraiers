-- ============================================================================
-- SEBRAEIERS — Posts sync metadata (Google Sheets)
-- ============================================================================

alter table public.posts
  add column if not exists external_id text unique,
  add column if not exists last_synced_at timestamptz;

create index if not exists posts_external_id_idx
  on public.posts (external_id)
  where external_id is not null;