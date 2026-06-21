-- ============================================================================
-- SEBRAEIERS — Engagement (reactions + comments)
-- ============================================================================

create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('fire','muscle','clap','raised','laugh')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction)
);
create index post_reactions_post_idx on public.post_reactions (post_id);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index post_comments_post_created_idx on public.post_comments (post_id, created_at desc);

create table public.checkin_reactions (
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'clap' check (reaction in ('clap')),
  created_at timestamptz not null default now(),
  primary key (checkin_id, user_id, reaction)
);
create index checkin_reactions_checkin_idx on public.checkin_reactions (checkin_id);

create table public.checkin_comments (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index checkin_comments_checkin_created_idx on public.checkin_comments (checkin_id, created_at desc);

-- ===== RLS =====
alter table public.post_reactions enable row level security;
alter table public.post_comments enable row level security;
alter table public.checkin_reactions enable row level security;
alter table public.checkin_comments enable row level security;

-- post_reactions: any logged in can read, can insert own on active post, can delete own or admin
create policy "post_reactions_select_all"
  on public.post_reactions for select to authenticated using (true);

create policy "post_reactions_insert_own_active"
  on public.post_reactions for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.posts where posts.id = post_reactions.post_id and posts.is_active = true)
  );

create policy "post_reactions_delete_own_or_admin"
  on public.post_reactions for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- post_comments: select on active post OR own comment; insert own on active; delete own or admin
create policy "post_comments_select_visible"
  on public.post_comments for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.posts where posts.id = post_comments.post_id and posts.is_active = true)
  );

create policy "post_comments_insert_own_active"
  on public.post_comments for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.posts where posts.id = post_comments.post_id and posts.is_active = true)
  );

create policy "post_comments_delete_own_or_admin"
  on public.post_comments for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- checkin_reactions: select if owner, author of checkin, or admin; insert own on approved; delete own or admin
create policy "checkin_reactions_select_visible"
  on public.checkin_reactions for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.checkins c where c.id = checkin_reactions.checkin_id and c.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "checkin_reactions_insert_own_approved"
  on public.checkin_reactions for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.checkins c where c.id = checkin_reactions.checkin_id and c.status = 'approved')
  );

create policy "checkin_reactions_delete_own_or_admin"
  on public.checkin_reactions for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- checkin_comments: same shape as checkin_reactions
create policy "checkin_comments_select_visible"
  on public.checkin_comments for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.checkins c where c.id = checkin_comments.checkin_id and c.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "checkin_comments_insert_own_approved"
  on public.checkin_comments for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.checkins c where c.id = checkin_comments.checkin_id and c.status = 'approved')
  );

create policy "checkin_comments_delete_own_or_admin"
  on public.checkin_comments for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );