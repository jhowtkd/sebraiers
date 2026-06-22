-- ============================================================================
-- SEBRAEIERS — Schema inicial
-- ============================================================================

-- ===== Extensões =====
create extension if not exists "pgcrypto";

-- ===== Tabelas =====

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(full_name) between 2 and 120),
  username text not null unique check (username ~ '^[a-z0-9_.]{3,30}$'),
  is_admin boolean not null default false,
  is_active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.user_socials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  instagram text,
  linkedin text,
  facebook text,
  tiktok text,
  youtube text,
  threads text,
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 200),
  description text check (description is null or length(description) <= 2000),
  network text not null check (network in ('instagram','linkedin','facebook','tiktok','youtube','threads')),
  original_url text not null check (length(original_url) <= 2048),
  cover_url text,
  published_at timestamptz not null,
  created_by uuid not null references public.profiles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_published_at_idx on public.posts (published_at desc);
create index posts_network_idx on public.posts (network) where is_active = true;

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  action text not null check (action in ('like','comment','share')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  points integer not null check (points in (1, 2, 3)),
  declared_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id),
  admin_note text,
  unique (user_id, post_id, action)
);

create index checkins_user_status_idx on public.checkins (user_id, status);
create index checkins_status_declared_idx on public.checkins (status, declared_at desc);

create table public.checkin_approvals (
  id bigserial primary key,
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  admin_id uuid not null references public.profiles(id),
  decision text not null check (decision in ('approved','rejected')),
  note text,
  created_at timestamptz not null default now()
);

create index checkin_approvals_checkin_idx on public.checkin_approvals (checkin_id);

-- ===== View: user_points (somatório por usuário aprovado) =====
create or replace view public.user_points as
select
  c.user_id,
  coalesce(sum(c.points), 0)::int as total_points,
  count(*)::int as approved_checkins,
  max(c.decided_at) as last_approved_at,
  p.full_name,
  p.username,
  p.avatar_url
from public.checkins c
join public.profiles p on p.id = c.user_id
where c.status = 'approved'
group by c.user_id, p.full_name, p.username, p.avatar_url;

-- ===== Trigger: ao criar user, cria profile =====
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_emails text;
  is_admin_user boolean := false;
  v_full_name text;
  v_username text;
begin
  -- full_name e username vêm do raw_user_meta_data (set no signup)
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', '');
  v_username := coalesce(new.raw_user_meta_data->>'username', '');

  -- ADMIN_EMAILS é uma env var do Next, mas para o trigger do banco funcionar
  -- sem acesso à env, o client envia via raw_user_meta_data também:
  -- raw_user_meta_data.admin_email_hint = email do admin (se aplicável)
  if coalesce(new.raw_user_meta_data->>'admin_email_hint', '') = lower(new.email) then
    is_admin_user := true;
  end if;

  -- fallback: emails em uma tabela de admins (configurável via SQL)
  if exists (select 1 from public.admin_whitelist where lower(email) = lower(new.email)) then
    is_admin_user := true;
  end if;

  insert into public.profiles (id, full_name, username, is_admin, is_active)
  values (new.id, v_full_name, v_username, is_admin_user, true);

  insert into public.user_socials (user_id) values (new.id);

  return new;
end;
$$;

-- Tabela de whitelist de admins (alternativa à env var, configurável via SQL)
create table if not exists public.admin_whitelist (
  email text primary key,
  added_at timestamptz not null default now()
);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Trigger: ao inserir checkin, computa points baseado em action =====
create or replace function public.set_checkin_points()
returns trigger
language plpgsql
as $$
begin
  if new.action = 'like' then
    new.points := 1;
  elsif new.action = 'comment' then
    new.points := 2;
  elsif new.action = 'share' then
    new.points := 3;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_checkin_points on public.checkins;
create trigger trg_set_checkin_points
  before insert on public.checkins
  for each row execute function public.set_checkin_points();

-- ===== RLS =====

alter table public.profiles enable row level security;
alter table public.user_socials enable row level security;
alter table public.posts enable row level security;
alter table public.checkins enable row level security;
alter table public.checkin_approvals enable row level security;

-- profiles: qualquer logado lê; insert/update só do próprio (exceto is_admin/is_active)
create policy "profiles_select_all_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_admin_update"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- user_socials: próprio lê/edita; admin lê tudo
create policy "user_socials_select_own"
  on public.user_socials for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_socials_admin_select"
  on public.user_socials for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "user_socials_insert_self"
  on public.user_socials for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_socials_update_self"
  on public.user_socials for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- posts: qualquer logado lê ativos; admin faz tudo
create policy "posts_select_active"
  on public.posts for select
  to authenticated
  using (is_active = true);

create policy "posts_select_admin"
  on public.posts for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "posts_admin_write"
  on public.posts for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- checkins: próprio lê/cria; admin lê tudo e decide
create policy "checkins_select_own"
  on public.checkins for select
  to authenticated
  using (auth.uid() = user_id);

create policy "checkins_select_admin"
  on public.checkins for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "checkins_insert_self_pending"
  on public.checkins for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.is_active = true
    )
  );

create policy "checkins_admin_update"
  on public.checkins for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- checkin_approvals: só admin lê/cria
create policy "approvals_admin_all"
  on public.checkin_approvals for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ===== Storage bucket: post-covers =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-covers', 'post-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Qualquer logado pode ler cover público
create policy "post_covers_select_public"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'post-covers');

-- Apenas admins podem fazer upload
create policy "post_covers_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-covers'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "post_covers_admin_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'post-covers'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "post_covers_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-covers'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );