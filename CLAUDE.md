# CLAUDE.md

Guidance for Claude Code (and any agent) working in this repository.

## What this project is

YouLink — a single-owner ("lite") social network for showcasing a personal portfolio, built with Next.js + Supabase. Full context lives in:
- `BLUEPRINT.md` — architecture, data model, feature contracts. Read this before touching data model or Server Actions.
- `DESIGN_SYSTEM.md` — color tokens, typography, motion spec. Read this before writing/styling any component.
- `BUILD_PHASES.md` — the phase we're in dictates what's in/out of scope right now. Don't build Phase 4 (chat) work while Phase 1 (identity) is incomplete.

## Stack facts (don't re-derive, don't substitute)

- Next.js 15, App Router, TypeScript strict, React Server Components by default — mark `"use client"` only where interactivity/hooks require it.
- Styling: Tailwind CSS v4 with CSS-variable design tokens from `styles/tokens.css`. **Never hardcode hex colors in components** — use the token names from `DESIGN_SYSTEM.md` §1.
- Animation: Framer Motion, via the shared primitives in `components/motion/`. Don't hand-roll a one-off `motion.div` with inline spring config when a primitive (`Reveal`, `Magnetic`, `GlowBorder`) already covers the case — extend the primitive instead.
- Data: Supabase (Postgres + Auth + Realtime + Storage). Prefer Server Actions calling the Supabase server client (`lib/supabase/server.ts`) over new Route Handlers, unless the caller genuinely isn't a form/mutation from our own UI (webhooks, OG image generation).
- Validation: every Server Action input is parsed with a Zod schema from `lib/validation/` before touching the DB — no unchecked `formData.get()` straight into a query.
- State: server state via RSC/Server Actions; client-only UI state (chat dock open/closed, theme toggle, optimistic like state) via Zustand — don't reach for Redux/Context-as-store patterns.

## Guest identity is load-bearing

Guests are real Supabase anonymous-auth users (`lib/guest/`), not localStorage flags. Any feature touching likes/follows/messages must work identically whether `identity.kind` is `guest` or `member` — never branch UI logic on "is this a real account," only on whether an action requires persistence Supabase already gives guests for free (it does). See `BLUEPRINT.md` §4.

## Security defaults

- Every new table needs an RLS policy in the same migration that creates it — no table ships open.
- Never import or reference the Supabase `service_role` key in anything that ships to the client. It's server-only, used inside trusted Server Actions/Route Handlers only.
- Any Server Action reachable by a guest (unauthenticated-capable) must be rate-limited (Upstash) — check `BLUEPRINT.md` §6 before adding a new guest-writable action.

## Motion & accessibility, non-negotiable

- Every animation must degrade correctly under `prefers-reduced-motion` — use the shared motion primitives, which already handle this; don't bypass them with raw `motion.*` unless you also add the reduced-motion branch yourself.
- Every interactive element needs a visible focus-visible state and a ≥44px touch target. Don't rely on color alone for state.

## Workflow conventions

- This repo is not yet a git repository as of the planning commit — initialize with `git init` before the first commit if it isn't already.
- Commit messages: conventional commits style (`feat:`, `fix:`, `chore:`, `docs:`) — this repo's history doubles as a portfolio artifact, keep it clean.
- Don't commit `.env.local` or any real secret — only `.env.example` with placeholder values is tracked.
- Before marking a phase's checklist item done, it should be reachable by clicking through the actual running app (`npm run dev`), not just present in code — see the "Demo" bullet at the end of each phase in `BUILD_PHASES.md`.
- Database schema changes go in `supabase/migrations/` as new timestamped SQL files — never hand-edit a prior migration once it's merged.

## What NOT to do

- Don't add a second UI library alongside shadcn/ui "just for one component."
- Don't introduce a friend-graph / multi-user feed model — this is intentionally single-owner (§1 of `BLUEPRINT.md`). If asked to genuinely multi-tenant it, treat that as a scoped migration, not a quick patch.
- Don't ship a like/follow/share/chat feature without its guest-facing path — every social action must work for a non-signed-up visitor per the product frame.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
