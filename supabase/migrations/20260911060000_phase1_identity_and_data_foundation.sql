-- Phase 1 — Identity & Data Foundation
-- Tables + RLS policies + triggers per BLUEPRINT.md §3 (Data Model), §4 (Identity Model),
-- and §6 (Security & Abuse Prevention). See supabase/migrations/README conventions in
-- CLAUDE.md: this file is never hand-edited after merge — follow-up changes are new
-- timestamped migrations.

create extension if not exists "pgcrypto" with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  cover_url text,
  bio text,
  links jsonb not null default '[]'::jsonb,
  theme_pref text not null default 'system' check (theme_pref in ('system', 'light', 'dark')),
  created_at timestamptz not null default now()
);

create table public.identities (
  id uuid primary key references auth.users (id) on delete cascade,
  kind text not null default 'guest' check (kind in ('guest', 'member')),
  display_name text not null default 'Guest',
  avatar_url text,
  linked_member_id uuid references public.identities (id),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.works (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  slug text not null unique,
  summary text,
  body_md text,
  media jsonb not null default '[]'::jsonb,
  external_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  like_count integer not null default 0,
  share_count integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index works_feed_idx on public.works (status, published_at desc);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  slug text not null unique
);

create table public.tags_on_works (
  work_id uuid not null references public.works (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (work_id, tag_id)
);

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_identity_id uuid not null references public.identities (id) on delete cascade,
  followee_profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_identity_id, followee_profile_id)
);
create index follows_followee_idx on public.follows (followee_profile_id);

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.identities (id) on delete cascade,
  work_id uuid not null references public.works (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (identity_id, work_id)
);
create index likes_work_idx on public.likes (work_id);

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.identities (id) on delete cascade,
  work_id uuid not null references public.works (id) on delete cascade,
  channel text not null check (channel in ('copy_link', 'x', 'linkedin', 'whatsapp', 'email', 'native')),
  created_at timestamptz not null default now()
);
create index shares_work_idx on public.shares (work_id);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.identities (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'archived')),
  last_message_at timestamptz,
  unique (owner_id, identity_id)
);
create index conversations_owner_idx on public.conversations (owner_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_kind text not null check (sender_kind in ('owner', 'identity')),
  sender_identity_id uuid references public.identities (id),
  body text not null check (char_length(body) between 1 and 4000),
  read_by_owner boolean not null default false,
  read_by_visitor boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    (sender_kind = 'owner' and sender_identity_id is null)
    or (sender_kind = 'identity' and sender_identity_id is not null)
  )
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- Helper: is the current JWT the single site owner?
-- profiles has exactly one row in v1 (§3 note), so "owner" == "the profiles row".
-- security definer so it can be used inside RLS policies on other tables without
-- those policies needing their own read grant on `profiles`. Defined here, after all
-- tables exist, because CREATE FUNCTION ... LANGUAGE SQL validates the body against
-- the catalog at creation time (unlike plpgsql, which defers to execution).
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_site_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS — every table enabled + explicit policies, default deny (BLUEPRINT.md §6).
-- ─────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.identities enable row level security;
alter table public.works enable row level security;
alter table public.tags enable row level security;
alter table public.tags_on_works enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.shares enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- profiles: publicly readable (it's the portfolio page), owner-writable only.
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "owner can insert their own profile row"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "owner can update their own profile row"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- identities: self-serve read/update only, plus the owner may read identities of
-- guests/members who have an open conversation with them (needed for the inbox UI).
-- Rows are created exclusively by the auth.users trigger below — no client insert policy.
create policy "identity can read its own row"
  on public.identities for select
  using (
    auth.uid() = id
    or (
      public.is_site_owner()
      and exists (
        select 1 from public.conversations c
        where c.identity_id = identities.id and c.owner_id = auth.uid()
      )
    )
  );

create policy "identity can update its own row"
  on public.identities for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- works: published works are public; the owner also sees drafts/archived and has full CRUD.
create policy "published works are publicly readable"
  on public.works for select
  using (status = 'published' or auth.uid() = owner_id);

create policy "owner can insert works"
  on public.works for insert
  with check (auth.uid() = owner_id);

create policy "owner can update works"
  on public.works for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "owner can delete works"
  on public.works for delete
  using (auth.uid() = owner_id);

-- tags / tags_on_works: public read (feed filtering), owner-only write.
create policy "tags are publicly readable"
  on public.tags for select
  using (true);

create policy "owner can manage tags"
  on public.tags for all
  using (public.is_site_owner())
  with check (public.is_site_owner());

create policy "tags_on_works are publicly readable"
  on public.tags_on_works for select
  using (true);

create policy "owner can tag works"
  on public.tags_on_works for insert
  with check (public.is_site_owner());

create policy "owner can untag works"
  on public.tags_on_works for delete
  using (public.is_site_owner());

-- follows: any identity can follow/unfollow themselves; the follower list itself is
-- not publicly enumerable (BLUEPRINT.md §5 Follow) — only the follower and the owner see it.
create policy "identity can follow"
  on public.follows for insert
  with check (auth.uid() = follower_identity_id);

create policy "identity can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_identity_id);

create policy "follow visibility is self or owner only"
  on public.follows for select
  using (auth.uid() = follower_identity_id or public.is_site_owner());

-- likes: identity manages its own like row; visibility limited to self + owner.
create policy "identity can like"
  on public.likes for insert
  with check (auth.uid() = identity_id);

create policy "identity can unlike"
  on public.likes for delete
  using (auth.uid() = identity_id);

create policy "like visibility is self or owner only"
  on public.likes for select
  using (auth.uid() = identity_id or public.is_site_owner());

-- shares: append-only analytics log, same visibility model as likes.
create policy "identity can log a share"
  on public.shares for insert
  with check (auth.uid() = identity_id);

create policy "share visibility is self or owner only"
  on public.shares for select
  using (auth.uid() = identity_id or public.is_site_owner());

-- conversations: only the two participants (the visiting identity and the owner) can see or
-- touch a thread. owner_id must be the single real owner, never an arbitrary profile id.
create policy "participants can read their conversation"
  on public.conversations for select
  using (auth.uid() = identity_id or auth.uid() = owner_id);

create policy "identity can open a conversation with the owner"
  on public.conversations for insert
  with check (
    auth.uid() = identity_id
    and owner_id = (select id from public.profiles limit 1)
  );

create policy "owner can update conversation status"
  on public.conversations for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- messages: only conversation participants can read/send; sender identity must match who
-- they claim to be. Content immutability (only read receipts may change after insert) is
-- enforced by the trigger below, not by RLS.
create policy "participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.identity_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

create policy "participants can send messages as themselves"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (
          (sender_kind = 'owner' and c.owner_id = auth.uid())
          or (sender_kind = 'identity' and c.identity_id = auth.uid() and sender_identity_id = auth.uid())
        )
    )
  );

create policy "participants can update read receipts"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.identity_id = auth.uid() or c.owner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.identity_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────

-- Mirror every new auth.users row into identities (BLUEPRINT.md §4.1) — guest or member,
-- decided by Supabase's own `is_anonymous` flag. Runs as the function owner so it isn't
-- blocked by the identities table's self-serve-only RLS policies.
create or replace function public.handle_new_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.identities (id, kind, display_name, first_seen_at, last_seen_at)
  values (
    new.id,
    case when coalesce(new.is_anonymous, false) then 'guest' else 'member' end,
    'Guest',
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_identity();

-- Guest → member upgrade (BLUEPRINT.md §4.3): same row, same uuid, kind flips in place
-- the moment Supabase flips `is_anonymous` to false via linkIdentity/OTP.
create or replace function public.handle_identity_upgrade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_anonymous = true and new.is_anonymous = false then
    update public.identities set kind = 'member' where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_upgraded
  after update on auth.users
  for each row execute function public.handle_identity_upgrade();

-- Denormalized like_count on works (BLUEPRINT.md §3 note) — feed rendering never COUNT(*)s.
create or replace function public.sync_work_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.works set like_count = like_count + 1 where id = new.work_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.works set like_count = greatest(like_count - 1, 0) where id = old.work_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_like_change
  after insert or delete on public.likes
  for each row execute function public.sync_work_like_count();

-- Denormalized share_count on works, same pattern as likes.
create or replace function public.sync_work_share_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.works set share_count = share_count + 1 where id = new.work_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.works set share_count = greatest(share_count - 1, 0) where id = old.work_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_share_change
  after insert or delete on public.shares
  for each row execute function public.sync_work_share_count();

-- Keep conversations.last_message_at current so the inbox can sort "unread-first,
-- most-recent" without a join (BLUEPRINT.md §5 Chat).
create or replace function public.touch_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_message_inserted
  after insert on public.messages
  for each row execute function public.touch_conversation_last_message();

-- Messages are immutable once sent, except for the two read-receipt flags — a message's
-- content, sender, or thread can't be rewritten after the fact.
create or replace function public.prevent_message_content_mutation()
returns trigger
language plpgsql
as $$
begin
  if new.body is distinct from old.body
    or new.sender_kind is distinct from old.sender_kind
    or new.sender_identity_id is distinct from old.sender_identity_id
    or new.conversation_id is distinct from old.conversation_id
  then
    raise exception 'messages are immutable except for read receipts';
  end if;
  return new;
end;
$$;

create trigger on_message_update
  before update on public.messages
  for each row execute function public.prevent_message_content_mutation();
