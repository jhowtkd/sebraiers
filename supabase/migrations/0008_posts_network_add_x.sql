-- Add 'x' (Twitter/X) to the posts network enum
-- Backward compatible: existing rows are not affected.
-- Forward compatible: new INSERTs/UPDATEs can use 'x' as a network value.

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_network_check;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_network_check
  CHECK (network IN ('instagram','linkedin','facebook','tiktok','youtube','threads','x'));
