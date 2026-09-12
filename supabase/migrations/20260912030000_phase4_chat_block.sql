-- Phase 4 — Chat: owner block/mute
-- conversations/messages themselves (tables, RLS, the last_message_at
-- trigger) were already built in the Phase 1 migration, ahead of this
-- phase. The one real gap for Chat's abuse guardrails
-- (BUILD_PHASES.md Phase 4 / BLUEPRINT.md §5) is a way for the owner to
-- block a guest — this migration adds that.

alter table public.identities add column blocked_at timestamptz;

-- The owner blocking/unblocking a guest updates a DIFFERENT identity's
-- row, which the existing "identity can update its own row" policy
-- (auth.uid() = id) doesn't cover. Mirrors "owner can manage tags"'s
-- existing is_site_owner() trust model — the owner is already trusted
-- broadly elsewhere in this schema; this isn't a new category of trust.
create policy "owner can moderate an identity"
  on public.identities for update
  using (public.is_site_owner())
  with check (public.is_site_owner());

-- Redefine the Phase 1 "participants can send messages as themselves"
-- policy to also reject a blocked identity's own messages — a soft ban
-- (BLUEPRINT.md §6: "owner can block an identity_id (soft ban — writes
-- silently no-op)"). The Server Action pre-checks blocked_at itself so a
-- blocked guest gets a clean error instead of a raw RLS violation; this
-- is the enforcement backstop.
drop policy "participants can send messages as themselves" on public.messages;

create policy "participants can send messages as themselves"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (
          (sender_kind = 'owner' and c.owner_id = auth.uid())
          or (
            sender_kind = 'identity'
            and c.identity_id = auth.uid()
            and sender_identity_id = auth.uid()
            and not exists (
              select 1 from public.identities i
              where i.id = auth.uid() and i.blocked_at is not null
            )
          )
        )
    )
  );
