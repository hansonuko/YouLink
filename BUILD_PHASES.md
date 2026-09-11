# YouLink — Build Phases

Each phase ends in a demoable state. Nothing is "done" until it's deployed to a Netlify Deploy Preview and clickable.

---

### Phase 0 — Scaffold (foundation)
- `git init`, `create-next-app` (TS, App Router, Tailwind, ESLint).
- Install core deps: Framer Motion, shadcn/ui (init + base primitives), Zustand, Zod, Supabase JS client.
- Wire design tokens (`styles/tokens.css`) into Tailwind config.
- Supabase project created; local `.env.local` populated from `.env.example`.
- Base `app/layout.tsx` with theme provider, font loading, global motion `prefers-reduced-motion` context.
- `netlify.toml` with `@netlify/plugin-nextjs`; CI skeleton via GitHub Actions running `lint` + `typecheck` + `build` on PR (Netlify itself runs the deploy build).
- **Demo:** empty themed shell deployed to a Netlify Deploy Preview, dark/light toggle works.

### Phase 1 — Identity & Data Foundation
- Supabase schema migration for §3 of `BLUEPRINT.md` (all tables + RLS policies + triggers for denormalized counts).
- Anonymous auth bootstrap in middleware; guest cookie/session flow.
- Auth pages: magic link sign-in, OAuth (Google/GitHub), guest-upgrade flow.
- Seed script: one owner profile + a handful of sample works for local dev.
- **Demo:** visiting the site silently creates a guest identity; signing up upgrades it (verified in Supabase table editor).

### Phase 2 — Profile & Feed (core showcase)
- `ProfileHeader` (cover, avatar w/ Aurora ring, bio, links, follower count).
- Feed: `WorkCard` grid/list, cursor pagination, skeleton loading states, entrance animations.
- Work detail page with media lightbox, dynamic OG image route.
- Owner dashboard: create/edit/publish a work (rich-ish markdown body + media upload to Supabase Storage).
- **Demo:** owner publishes a work from the dashboard, it appears live in the feed with full animation.

### Phase 3 — Social Actions (like, follow, share)
- `LikeButton` with optimistic update + realtime count sync + burst animation.
- `FollowButton` with realtime follower count.
- `ShareSheet` (native share + fallback channels) + share tracking.
- Rate limiting (Upstash) + Turnstile challenge wired to all three guest-writable actions.
- **Demo:** open the feed in two tabs (one guest, one signed-in) — a like in one tab animates live in the other.

### Phase 4 — Chat
- `ChatDock`/`ChatLauncher` persistent across public routes, lazy-loaded.
- Realtime conversation + message send/receive, typing indicator, read receipts.
- Owner inbox in dashboard (unread-first, reply from same UI).
- Abuse guardrails: message rate limit, length cap, spam heuristic, owner block/mute.
- **Demo:** guest opens chat with no sign-up, sends a message, owner replies in real time from the dashboard inbox.

### Phase 5 — Motion & Visual Polish Pass
- Full pass against `DESIGN_SYSTEM.md` §5: page transitions, magnetic buttons, ambient hero drift, skeleton shimmer, odometer counters, particle like-burst.
- Empty states, error states, 404, offline states — all themed and animated, none left as framework defaults.
- Performance pass against the §7 budget (Lighthouse CI in GitHub Actions, fails build below thresholds).
- Accessibility audit (axe, keyboard-only pass, reduced-motion pass, contrast check both themes).
- **Demo:** Lighthouse ≥ 95 across categories on the public feed; full keyboard-only walkthrough of like/follow/share/chat.

### Phase 6 — Launch Hardening
- Sentry error tracking, Plausible analytics, uptime check.
- SEO pass: metadata, sitemap, robots, structured data (Person/CreativeWork schema.org on profile/work pages).
- Custom domain + email deliverability (Resend domain verification).
- Final security review (RLS re-audit, secrets rotation, dependency audit).
- **Demo:** production URL on custom domain, shareable work links render rich previews on X/LinkedIn/WhatsApp/iMessage.

---

## Stretch (post-v1, not in initial scope)
- Multi-reaction (beyond single Like), comments on works, PWA installability/push notifications, multi-owner/tenant support, AI-assisted work write-ups, public "guestbook" wall.
