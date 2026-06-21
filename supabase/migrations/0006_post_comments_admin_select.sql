-- ============================================================================
-- SEBRAEIERS — post_comments admin SELECT on inactive posts
-- ============================================================================
-- Spec §5: post_comments SELECT should be "próprio user + admin".
-- Migration 0005 allowed SELECT only on own comment OR post-active.
-- Admins need to moderate comments on inactive posts too.

drop policy if exists "post_comments_select_visible" on public.post_comments;
create policy "post_comments_select_visible"
  on public.post_comments for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.posts where posts.id = post_comments.post_id and posts.is_active = true)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
