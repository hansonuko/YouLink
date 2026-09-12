# Session Handoff

Last updated: 2026-09-12, after Phase 4 (Chat) merged in full.

This file is the "pick up where we left off" doc — current status, what's
live, what's provisioned, patterns worth knowing before touching this
codebase, and what's next. `BLUEPRINT.md` / `DESIGN_SYSTEM.md` /
`BUILD_PHASES.md` are the architecture/design/roadmap references and
don't change often; this file does, and should be updated at the end of
each work session.

---

## 1. Status: Phases 0–4 complete and merged

19 PRs merged to `main`, each verified against the live Supabase project
before merge (not just code review — see §4). In order:

| # | PR | Phase |
|---|---|---|
| 1 | `feat: scaffold Next.js app with design tokens and motion primitives` | 0 |
| 2 | `feat(db): Phase 1 identity & data foundation schema` (#1) | 1 |
| 3 | `feat(auth): anonymous guest identity bootstrap in middleware` (#2) | 1 |
| 4 | `feat(auth): magic-link sign-in, OAuth, and guest-upgrade pages` (#3) | 1 |
| 5 | `feat(db): seed script for owner profile + sample works` (#4) | 1 |
| 6 | `feat(db): Storage buckets for avatars and work media` (#5) | 2 |
| 7 | `feat(profile): ProfileHeader wired into the homepage` (#6) | 2 |
| 8 | `feat(feed): WorkCard grid/list, cursor pagination, skeletons, entrance motion` (#7) | 2 |
| 9 | `feat(works): work detail page with media lightbox + dynamic OG image` (#8) | 2 |
| 10 | `feat(dashboard): owner dashboard for create/edit/publish` (#9) | 2 |
| 11 | `feat(social): LikeButton with realtime cross-tab count sync` (#10) | 3 |
| 12 | `feat(social): FollowButton with realtime follower count` (#11) | 3 |
| 13 | `feat(social): ShareSheet with native share fallback + realtime count` (#12) | 3 |
| 14 | `feat(social): comments on works, guest-facing with owner moderation` (#13) | 3 (stretch, pulled forward) |
| 15 | `feat(social): Love/Like/Clap reactions, replacing the plain like toggle` (#14) | 3 (upgrade beyond original scope, user-requested) |
| 16 | `feat(security): real Upstash rate limiting + Turnstile bot gate` (#15) | 3 (hardening item) |
| 17 | `feat(chat): core data layer, Server Actions, and abuse guardrails` (#16) | 4 |
| 18 | `feat(chat): ChatDock/ChatLauncher guest-facing UI` (#17) | 4 |
| 19 | `feat(chat): owner inbox in the dashboard` (#18) | 4 |
| 20 | `feat(chat): typing indicator, cross-wired between dock and inbox` (#19) | 4 |

Phase 3 ended up broader than `BUILD_PHASES.md`'s original three items
(Like/Follow/Share) — Comments was pulled in from the Stretch list, the
single Like was upgraded to a three-reaction picker (Love/Like/Clap) at
the user's request, and the phase's own hardening checklist item
(Upstash + Turnstile) was completed before starting Phase 4, per the
user's explicit call to harden before building the highest-abuse-surface
feature (Chat).

**Not started:** Phase 5 (Motion & Visual Polish), Phase 6 (Launch
Hardening). See §6.

---

## 2. What's live

- **App:** https://youlink-hansonuko.netlify.app (Netlify site
  `youlink-hansonuko`, account `mytelcoins`, auto-deploys from `main` via
  the GitHub integration — every merge to `main` triggers a production
  build unless builds are paused).
- **Database:** Supabase project `jsokuminmbgyaqibjzvq` (Postgres + Auth +
  Realtime + Storage), 6 migrations applied, all under `supabase/migrations/`.
- **Repo:** https://github.com/hansonuko/YouLink, public.
- **Netlify builds:** the user manages build-minute usage manually and
  pauses/unpauses the site's build capability between sessions to
  conserve free-tier credit — check with them before assuming a merge to
  `main` will auto-deploy, and don't unpause/trigger a build without
  asking first.

---

## 3. What's provisioned (real credentials, not test/placeholder)

All of these live in `.env.local` (gitignored) and the matching ones are
also set in Netlify's environment variables (Site settings →
Environment variables) for production. Names only below — see
`.env.example` for the exact variable names, never this file for values.

| Service | Status | Notes |
|---|---|---|
| Supabase | ✅ real project | anon key, service role key, DB password all live |
| Netlify | ✅ real site | deployed, GitHub-integrated |
| Upstash Redis | ✅ real instance | rate limiting is genuinely enforced, not fail-open, as of PR #15 |
| Cloudflare Turnstile | ✅ real widget | invisible mode, domains `localhost` + `youlink-hansonuko.netlify.app` — **editable any time** via the same widget (no re-issuing keys) once a custom domain exists; see §6 |
| Resend | ✅ key present in `.env.local` | **not yet wired into any code path** — no email is actually sent anywhere yet (magic-link auth uses Supabase's own email delivery, not Resend). Phase 6 territory (deliverability) or the deferred "Pulses" email digest. |
| Google/GitHub OAuth | ❌ empty | `EmailAuthForm`'s "Continue with Google/GitHub" buttons exist in the UI but have no real client ID/secret behind them — currently non-functional if clicked |
| `AUTH_SECRET` | ❌ empty, unused | scaffolded early, never referenced anywhere in code — Supabase Auth manages its own session tokens, this var doesn't do anything. Safe to ignore or remove from `.env.example` in a later cleanup. |
| Sentry / Plausible | ❌ empty | correctly not yet provisioned — Phase 6 |
| `NEXT_PUBLIC_FEATURE_CHAT` / `NEXT_PUBLIC_FEATURE_EMAIL_DIGEST` | ⚠️ set but **dead** | not referenced anywhere in the codebase — chat shipped without ever being gated behind this flag. Either wire them up or remove them; don't assume they control anything today. |

---

## 4. Patterns and workflow established this project — read before continuing

**Branch → PR → CI → user merges.** Every change goes through a feature
branch and a PR with `gh pr checks --watch` confirmed green before
telling the user it's ready. The user explicitly approves every merge —
never merge unprompted. (Twice this session a commit landed directly on
`main` by mistake before realizing no branch had been created — caught
before pushing both times via `git branch <name>` + `git reset --hard
origin/main` + `git checkout <name>`, since the commit already existed
locally. Always run `git checkout -b feat/...` **before** the first edit
of a new item, not after.)

**Migrations can't be applied from this sandbox.** There's no way to
reach the Postgres instance directly (Session Pooler auth fails for
unclear reasons, direct connection needs IPv6 the sandbox doesn't route).
The working pattern: write the migration file, paste its exact contents
in a message to the user, ask them to run it in Supabase's SQL Editor,
then verify it landed via the REST API (`curl .../rest/v1/<table>` with
the service role key) before writing any code that depends on it.

**RLS is the real enforcement everywhere; Server Actions are a second
layer, not the only one.** Every table has explicit policies from the
migration that creates it. When testing a security boundary (blocked
identity, non-owner trying an owner action, cross-identity access), test
it directly against the database with two independent Supabase
identities — see the next point.

**Two tabs in the same browser profile do NOT give independent
sessions.** Discovered during the owner-inbox work: cookies are shared
per-origin regardless of tab, so injecting a minted owner session into
one tab silently clobbers whatever guest session was active in every
other open tab on `localhost:3000`. When a test needs two genuinely
different identities at once (owner + guest), drive one side through the
real browser UI and the other through a small script using
`@supabase/supabase-js` directly (signInAnonymously for a guest,
`admin.generateLink` + `verifyOtp` for the owner) that mirrors the exact
DB operations and Realtime broadcasts the real Server Action would
perform. This still exercises real RLS and real Realtime, which is what
actually matters.

**A long-lived browser tab needs a real reload after `rm -rf .next && npm
run build`.** Stale client bundles reference Server Action IDs that no
longer exist in a fresh build's manifest ("Failed to find Server Action"
error) — always navigate fresh, don't trust a tab that's been open across
a rebuild.

**Test with real credentials first; fall back to Cloudflare's public
Turnstile test keys (documented at
developers.cloudflare.com/turnstile/troubleshooting/testing) only to
isolate testing a *feature* from testing Turnstile's own bot-detection.**
This sandbox's browser automation genuinely trips Turnstile's real bot
detection (error 300010, "bot behavior detected") — confirmed that's
correct behavior, not a bug, then swapped to the test sitekey/secret to
verify chat functionality in isolation. Always swap back to the real
keys and do a clean rebuild before finishing.

**Verification is always live, never just code review.** Every item this
session was checked against the actual running app and the actual
Supabase project — real guest identities, real broadcasts, direct DB
queries before/after — with all test data cleaned up afterward and DB
state confirmed pristine before commit. Two real bugs were caught this
way that code review alone would have missed: a Tailwind responsive-
positioning conflict (`inset-0`/`sm:inset-auto` mixed with individual
`sm:bottom-24`/`sm:right-6` — different utility categories touching the
same properties, so Tailwind's generated stylesheet order decided the
winner, not source order in the className) that pushed `ChatDock` off-
screen on short viewports, and `TurnstileGate`'s `strategy="lazyOnload"`
(no bound on when it runs) versus `afterInteractive`.

---

## 5. Known environment quirks (this sandbox specifically)

- Occasional full network/DNS outages — confirmed via failed resolution
  to unrelated hosts, not an app bug. Wait and retry rather than debug
  the app.
- Browser automation (`claude-in-chrome`) tools are flaky under rapid
  successive calls: `Page.captureScreenshot` sometimes times out on a
  perfectly responsive tab, `javascript_exec` occasionally returns
  "Couldn't determine which page this action targets" on a valid tab id
  (retry the exact same call, it usually succeeds the second time), and
  `read_console_messages` has returned stale/cached entries from a prior
  page load rather than the current one more than once. When a DOM-level
  JS check and a screenshot disagree, trust the JS check.
- Next.js 16's Turbopack persistent build cache does not reliably
  invalidate on a bare `.env.local` edit — after changing an env var
  (e.g., swapping Turnstile keys for testing), run `rm -rf .next && npm
  run build`, not just `npm run build`, or the old value can silently
  stay baked into the client bundle.

---

## 6. What's next

Per `BUILD_PHASES.md`:

- **Phase 5 — Motion & Visual Polish Pass**: full sweep against
  `DESIGN_SYSTEM.md` §5 (page transitions, magnetic buttons, ambient hero
  drift, skeleton shimmer), themed empty/error/404/offline states,
  Lighthouse CI performance gate, full accessibility audit.
- **Phase 6 — Launch Hardening**: Sentry, Plausible, SEO pass, custom
  domain + Resend deliverability, final RLS/secrets/dependency audit.

Smaller loose threads, not blocking either phase:

- **Custom domain for Turnstile**: whenever the user has one, add it to
  the existing widget's domain list (Cloudflare dashboard or the same API
  token used to create it) — no code change, no new keys.
- **"Pulses" notifications** (toast + bell dropdown, daily email digest):
  in `BLUEPRINT.md` §5 but not in `BUILD_PHASES.md`'s Phase 4 checklist —
  deliberately deferred, not forgotten. Natural home is Phase 5 (toast
  UI) or Phase 6 (email digest via the already-present Resend key).
- **Dead env vars**: `AUTH_SECRET`, `NEXT_PUBLIC_FEATURE_CHAT`,
  `NEXT_PUBLIC_FEATURE_EMAIL_DIGEST` — see §3. Either wire them up or
  remove them from `.env.example` at some point.
- **OAuth buttons**: Google/GitHub sign-in UI exists but has no real
  credentials behind it yet.
