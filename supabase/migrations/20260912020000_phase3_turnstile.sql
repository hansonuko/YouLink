-- Phase 3 — Turnstile verification flag, closing out the item 4 hardening
-- checklist from BUILD_PHASES.md ("Rate limiting (Upstash) + Turnstile
-- challenge wired to all three guest-writable actions" — now four, with
-- Comments). BLUEPRINT.md §6: "Turnstile ... on the first guest write of a
-- session to block bot floods without adding friction for humans." One
-- flag per identity, set once, never re-challenged.

alter table public.identities add column turnstile_verified_at timestamptz;

-- No RLS policy change needed: identities' own "identity can update its own
-- row" policy (Phase 1 migration) already lets an identity set this column
-- on itself; the verifyTurnstile Server Action is what actually restricts
-- *when* it gets set (only after a real siteverify success), same trust
-- boundary as every other identity-owned column.
