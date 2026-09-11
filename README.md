# YouLink

> **Your work. Your link. Your network.**

YouLink is a lightweight, single-owner social network built to showcase a personal portfolio the way Facebook showcases a life — a profile, a feed of "works," follows, likes, shares, and real-time chat — wrapped in a fast, heavily-animated, futuristic UI. Anyone can browse, like, share, follow, and message the owner. No account required for the social actions; an account only unlocks persistence across devices.

This repo currently contains the **planning and scaffolding layer** — architecture, design system, and config — described below. Code scaffolding (Phase 0 in [`BUILD_PHASES.md`](./BUILD_PHASES.md)) starts on your call.

---

## ✨ Concept

| Facebook concept | YouLink equivalent |
|---|---|
| Timeline / News Feed | **Feed** — reverse-chron stream of the owner's "works" (projects, case studies, shots, writeups) |
| Profile | **Owner Profile** — the single showcased identity, with cover, avatar, bio, links |
| Friends / Follow | **Follow** — visitors follow the owner (one-directional, creator-model, like IG/X not mutual friending) |
| Like / React | **Like** — single reaction with a signature animated burst (room to grow to multi-reaction later) |
| Share | **Share** — copy link, native share sheet, or repost-with-note to socials |
| Messenger | **Chat** — real-time 1:1 chat with the owner, works for guests *and* signed-in users |
| Notifications | **Pulses** — lightweight toast + bell feed for new likes/follows/messages (owner-side) |

Guests get a durable anonymous identity (cookie-backed Supabase anonymous session) so their likes/follows/chat history persist and can be **upgraded** to a real account later without losing history.

---

## 🧱 Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router, React Server Components, Server Actions) | One deployable, fast by default, great DX |
| Language | **TypeScript** (strict) | Type safety across UI/data layer |
| Styling | **Tailwind CSS v4** + CSS variables design tokens | Rapid, consistent, themeable |
| Motion | **Framer Motion** (+ `tailwindcss-animate` for utility-level transitions) | First-class animation everywhere without hand-rolled CSS keyframes for every interaction |
| Components | **shadcn/ui** (Radix primitives) | Accessible headless primitives, fully ownable/customizable, not a black-box dependency |
| State | **Zustand** (client UI state) + React Server Components (server state) | Minimal boilerplate, no over-fetching |
| Backend/DB | **Supabase** (Postgres, Auth incl. Anonymous, Realtime, Storage) | One managed platform covers DB + auth + realtime chat + media storage; generous free tier fits "lite" |
| Validation | **Zod** | Shared schema validation client/server |
| Email | **Resend** (magic link / notification emails) | Simple, modern deliverability |
| Rate limiting | **Upstash Redis** (`@upstash/ratelimit`) | Protects guest-writable endpoints (like/follow/message) from abuse |
| Hosting | **Netlify** (app, via `@netlify/plugin-nextjs`) + **Supabase Cloud** (data) | Zero-ops, generous free tier, deploy previews per PR; chosen over Vercel because Vercel's Hobby tier ToS restricts commercial use and this portfolio has commercial intent |
| Analytics | **Plausible** (privacy-friendly, cookieless) + Netlify's built-in deploy/traffic logs | Portfolio traffic insight without cookie banners or a Vercel dependency |

Full rationale and data model: see [`BLUEPRINT.md`](./BLUEPRINT.md).
Visual language, tokens, motion spec: see [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).
How Claude Code should work in this repo: see [`CLAUDE.md`](./CLAUDE.md).

---

## 📂 Planned Structure

```
youlink/
├─ app/                    # Next.js App Router
│  ├─ (public)/            # Feed, profile, work detail, share landing — no auth required
│  ├─ (auth)/              # Sign in / sign up / magic link callback
│  ├─ (owner)/dashboard/   # Owner-only: post works, inbox, analytics
│  ├─ api/                 # Route handlers (webhooks, edge functions the client can't call directly)
│  └─ layout.tsx
├─ components/
│  ├─ ui/                  # shadcn/ui primitives (generated, then customized)
│  ├─ feed/                # WorkCard, LikeButton, ShareSheet, FollowButton
│  ├─ chat/                # ChatDock, ConversationList, MessageBubble
│  └─ motion/              # Reusable Framer Motion wrappers (Reveal, Magnetic, GlowBorder…)
├─ lib/
│  ├─ supabase/            # client.ts, server.ts, middleware.ts
│  ├─ guest/                # anonymous identity helpers
│  └─ validation/          # zod schemas
├─ styles/
│  └─ tokens.css           # design tokens as CSS variables
├─ supabase/
│  ├─ migrations/          # SQL migrations
│  └─ seed.sql
├─ public/
├─ BLUEPRINT.md
├─ DESIGN_SYSTEM.md
├─ BUILD_PHASES.md
├─ CLAUDE.md
├─ .env.example
└─ package.json
```

## 🚀 Getting Started (once Phase 0 scaffolding lands)

```bash
git init
npm install
cp .env.example .env.local   # fill in Supabase + Resend + Upstash keys
npm run dev
```

Required accounts (all free tier): [Supabase](https://supabase.com), [Netlify](https://netlify.com), [Resend](https://resend.com), [Upstash](https://upstash.com).

## 🗺️ Roadmap

See [`BUILD_PHASES.md`](./BUILD_PHASES.md) for the full phased plan from scaffold → MVP → motion polish → launch.

## 📄 License

All Rights Reserved — see [`LICENSE`](./LICENSE). Source is public for portfolio/demo review only.
