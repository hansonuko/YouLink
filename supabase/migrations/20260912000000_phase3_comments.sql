-- Phase 3 — Comments on works
-- Pulled in from BUILD_PHASES.md's Stretch list at the user's explicit
-- request, alongside Like/Follow/Share. Follows the exact likes/shares
-- pattern from 20260911060000_phase1_identity_and_data_foundation.sql:
-- an append-mostly log table, RLS default-deny, and a denormalized count
-- trigger on works. This file is never hand-edited after merge (CLAUDE.md)
-- — anything further is a new timestamped migration.

alter table public.works add column comment_count integer not null default 0;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works (id) on delete cascade,
  identity_id uuid not null references public.identities (id) on delete cascade,
  -- Snapshotted at insert time by the trigger below rather than joined
  -- live from identities: identities' own RLS ("identity can read its own
  -- row") only lets a viewer read their own row, or the owner read a row
  -- with an open conversation — a public comment listing could never join
  -- to another commenter's display_name otherwise.
  author_display_name text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index comments_work_idx on public.comments (work_id, created_at);

alter table public.comments enable row level security;

-- comments: visible under the same rule as the work itself (public once
-- published, owner sees their own regardless of status). Any identity can
-- comment on a published work as themselves; the commenter can remove
-- their own comment, and the owner can moderate any comment on their own
-- work — comments are guest-facing like every other social action
-- (CLAUDE.md) but moderation is owner-only.
create policy "comments on visible works are readable"
  on public.comments for select
  using (
    exists (
      select 1 from public.works w
      where w.id = comments.work_id
        and (w.status = 'published' or w.owner_id = auth.uid())
    )
  );

create policy "identity can comment on published works"
  on public.comments for insert
  with check (
    auth.uid() = identity_id
    and exists (select 1 from public.works w where w.id = work_id and w.status = 'published')
  );

create policy "commenter or owner can delete a comment"
  on public.comments for delete
  using (auth.uid() = identity_id or public.is_site_owner());

-- No update policy: comments are immutable once posted (default-deny).

-- Snapshot the commenter's current display name onto the row at insert
-- time — see the column comment above for why this isn't a live join.
-- security definer so it can read identities regardless of the caller's
-- own identities SELECT policy.
create or replace function public.snapshot_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select display_name into new.author_display_name
  from public.identities
  where id = new.identity_id;
  return new;
end;
$$;

create trigger on_comment_insert
  before insert on public.comments
  for each row execute function public.snapshot_comment_author();

-- Denormalized comment_count on works, same pattern as like_count/share_count.
create or replace function public.sync_work_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.works set comment_count = comment_count + 1 where id = new.work_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.works set comment_count = greatest(comment_count - 1, 0) where id = old.work_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute function public.sync_work_comment_count();
