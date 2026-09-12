-- Phase 3 — Love/Like/Clap reactions, replacing the plain like/unlike toggle
-- Requested by the user as a follow-up once Comments landed. `likes` stays
-- the same table — still one row per identity per work, still exactly what
-- on_like_change counts into works.like_count — this just records *which*
-- reaction that row is, and lets an identity change it in place instead of
-- deleting and re-inserting.

alter table public.likes
  add column reaction text not null default 'like' check (reaction in ('love', 'like', 'clap'));

-- Switching reaction type is an UPDATE, not a delete+insert (that would
-- double-count in on_like_change, which only fires on insert/delete) — the
-- Phase 1 migration never granted update on likes, so this needs its own
-- policy. Same actor restriction as the existing insert/delete policies.
create policy "identity can change their own reaction"
  on public.likes for update
  using (auth.uid() = identity_id)
  with check (auth.uid() = identity_id);
