# YouLink — Design System

A dark-first, motion-forward visual language. The signature is the **Aurora token** — a three-stop gradient used as a consistent "signature" across avatars, buttons, live indicators, and loading states, the same way Facebook uses solid blue as its signature. Where Facebook is flat and utilitarian, YouLink is glassy, glowing, and kinetic — closer to a premium product launch site than a classic social feed.

---

## 1. Color Tokens

### 1.1 The Aurora token (signature)

```css
--aurora: linear-gradient(135deg, #7C5CFF 0%, #00D8C0 50%, #FF5C8A 100%);
--aurora-soft: linear-gradient(135deg, #7C5CFF14 0%, #00D8C014 50%, #FF5C8A14 100%);
```
Use for: primary CTA fills, active-state rings (avatar/like), the profile cover glow, chat launcher, progress/skeleton shimmer, "live" presence dot pulse. Never use the full gradient for body text or large flat fills — it's an accent, not a background.

### 1.2 Core palette

| Token | Hex | Usage |
|---|---|---|
| `--violet-500` (primary) | `#7C5CFF` | Primary actions, links, focus rings |
| `--violet-600` | `#6A46F0` | Primary hover/pressed |
| `--teal-400` (secondary) | `#00D8C0` | Success, live/online, chart accents |
| `--coral-400` (tertiary) | `#FF5C8A` | Like/heart, notifications, energy accents |
| `--amber-400` | `#FFB020` | Warnings |
| `--red-500` | `#FF4D4F` | Errors, destructive actions |

### 1.3 Neutrals — dark (default)

| Token | Hex | Usage |
|---|---|---|
| `--bg-canvas` | `#0A0A12` | App background |
| `--bg-surface` | `#13131F` | Cards, panels |
| `--bg-surface-raised` | `#1B1B2B` | Modals, chat dock, popovers |
| `--border-subtle` | `#26263A` | Hairlines |
| `--text-primary` | `#F4F4FA` | Headings, body |
| `--text-secondary` | `#A2A2BD` | Meta text, captions |
| `--text-tertiary` | `#6B6B85` | Disabled, placeholders |

### 1.4 Neutrals — light (alt theme)

| Token | Hex |
|---|---|
| `--bg-canvas` | `#FAFAFE` |
| `--bg-surface` | `#FFFFFF` |
| `--bg-surface-raised` | `#FFFFFF` (with `--shadow-lg`) |
| `--border-subtle` | `#E7E7F1` |
| `--text-primary` | `#14141F` |
| `--text-secondary` | `#5B5B75` |
| `--text-tertiary` | `#9494AC` |

Theme is user-toggleable (`theme_pref`), defaults to `system`. All tokens ship as CSS custom properties on `:root`/`[data-theme]` so Tailwind reads them via `theme.extend.colors` — no hardcoded hex in components.

### 1.5 Glass & glow primitives

```css
--glass-bg: rgba(19, 19, 31, 0.6);
--glass-border: rgba(255, 255, 255, 0.08);
--glass-blur: 16px;
--glow-violet: 0 0 24px 0 rgba(124, 92, 255, 0.45);
--glow-coral: 0 0 24px 0 rgba(255, 92, 138, 0.45);
```
Used on: chat dock, hero cover panel, active nav item, modals. Backdrop blur must degrade gracefully (fallback solid `--bg-surface-raised`) on browsers without `backdrop-filter`.

---

## 2. Typography

| Role | Font | Notes |
|---|---|---|
| Display / Headings | **Space Grotesk** | Geometric, futuristic, loads via `next/font/google` |
| Body / UI | **Inter** | Workhorse readability at small sizes |
| Mono (labels, timestamps, code snippets in works) | **JetBrains Mono** | |

Scale (fluid via `clamp()`):

| Token | Size (desktop) | Weight |
|---|---|---|
| `--text-display` | clamp(2.5rem, 5vw, 4.5rem) | 700 |
| `--text-h1` | clamp(1.875rem, 3vw, 2.75rem) | 700 |
| `--text-h2` | clamp(1.5rem, 2vw, 2rem) | 600 |
| `--text-h3` | 1.25rem | 600 |
| `--text-body` | 1rem | 400 |
| `--text-sm` | 0.875rem | 400 |
| `--text-xs` | 0.75rem | 500 (used uppercase, tracked +0.04em for meta labels) |

## 3. Spacing, Radius, Elevation

- Spacing scale: 4px base (`4,8,12,16,24,32,48,64,96`) — Tailwind default scale, no custom overrides needed.
- Radius: `--radius-sm: 8px` (chips, badges), `--radius-md: 16px` (cards, inputs), `--radius-lg: 24px` (modals, chat dock), `--radius-full` (avatars, pill buttons).
- Elevation via layered shadow + glow, not just `box-shadow` alone — every raised surface in dark mode gets a **1px inner border** (`--glass-border`) since dark-on-dark shadows read poorly without an edge.

## 4. Breakpoints (Tailwind defaults, mobile-first)

`sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`. Feed is single-column below `lg`, two-column (feed + sticky profile rail) at `lg+`, matching Facebook's classic rail pattern but with the rail sticky + glass rather than flat white.

## 5. Motion System

Motion is the headline differentiator — every interactive element responds, nothing is inert. Governed by a small set of reusable primitives in `components/motion/` so animation stays consistent instead of ad hoc.

### 5.1 Principles
1. **Physical, not linear** — spring physics (Framer Motion `type: "spring"`) for anything that responds to touch/click; `ease` curves only for passive/ambient motion (background gradient drift, skeleton shimmer).
2. **Fast in, considerate out** — enter transitions ≤ 250ms, exit ≤ 180ms. Nothing blocks interaction waiting on an animation.
3. **Motion communicates state**, not decoration: a like isn't just "liked," it's a heart that scales past 100% and settles with a coral particle burst — the animation *is* the confirmation, no separate toast needed.
4. **Respect `prefers-reduced-motion`** — every primitive checks it and swaps spring→instant / parallax→static automatically. This is not optional polish, it's baked into `components/motion/Reveal.tsx` etc.

### 5.2 Tokens

```ts
export const spring = {
  snappy: { type: "spring", stiffness: 500, damping: 30 },   // buttons, toggles
  bouncy: { type: "spring", stiffness: 300, damping: 15 },   // like burst, badges
  gentle: { type: "spring", stiffness: 120, damping: 20 },   // modals, page transitions
};
export const ease = {
  standard: [0.22, 1, 0.36, 1],   // "easeOutExpo"-ish, default for fades/slides
  ambient: [0.37, 0, 0.63, 1],    // slow background drift
};
export const duration = { xs: 0.12, sm: 0.18, md: 0.25, lg: 0.4, xl: 0.6 };
```

### 5.3 Signature interactions

| Interaction | Spec |
|---|---|
| **Route/page transition** | Shared-layout crossfade + 12px slide-up (`gentle` spring), feed scroll position restored |
| **Feed card entrance** | Staggered reveal on scroll (`whileInView`), 40ms stagger, opacity+8px translateY |
| **Like button** | Scale 1 → 1.3 → 1 (`bouncy`), coral particle burst (canvas-free, 6 small divs), count increments with a rolling-odometer digit animation |
| **Follow button** | Fill sweeps in with the Aurora gradient (`snappy`), label swaps "Follow" → "Following" with crossfade |
| **Share sheet** | Bottom-sheet spring-up on mobile, popover scale+fade on desktop; each channel icon has a 20ms stagger |
| **Chat dock open** | Expands from launcher pill with `gentle` spring, message bubbles enter with 60ms stagger + spring |
| **New message / live like received (Realtime)** | Subtle Aurora-glow pulse ring, no layout shift |
| **Hover (desktop only)** | Magnetic buttons: element translates up to 6px toward cursor within its bounds (`components/motion/Magnetic.tsx`) |
| **Loading** | Skeletons with Aurora shimmer sweep, never a bare spinner on the feed |
| **Hero cover** | Slow ambient gradient drift (`ambient` ease, 12s loop) behind glass profile card; pauses on reduced-motion |

### 5.4 Accessibility guardrails
- All motion primitives respect `prefers-reduced-motion: reduce` (swap to instant `duration: 0` / opacity-only).
- Focus states are never purely color — always a visible `--violet-500` ring (`focus-visible`), 2px offset, on every interactive element regardless of motion state.
- Minimum tap target 44×44px on touch.
- Contrast: body text ≥ 4.5:1 against `--bg-canvas`/`--bg-surface` in both themes (verified in Tailwind config comments, not just eyeballed).

## 6. Component Inventory (v1)

`Avatar` (with Aurora ring on active/live) · `Button` (primary/secondary/ghost/destructive) · `WorkCard` · `LikeButton` · `FollowButton` · `ShareSheet` · `ChatDock` / `ChatLauncher` · `MessageBubble` · `Badge` · `Tag` · `SkeletonCard` · `Toast/Pulse` · `ThemeToggle` · `NavRail` · `ProfileHeader` · `MediaLightbox` · `EmptyState`.

Built on **shadcn/ui** primitives (Radix under the hood) for anything structural (Dialog, Popover, Sheet, DropdownMenu, Tooltip) — never reinvent focus-trapping/portal logic by hand; only the visual skin and motion wrapper are custom.

## 7. Logo / Brand Mark (placeholder direction)

Wordmark "YouLink" in Space Grotesk 700, the "o" in "You" replaced by a small Aurora-gradient ring (doubles as a live/online dot motif used elsewhere in the product) — ties the brand mark directly to the "live presence" visual language used in chat/likes. Final mark to be produced in Phase 5 polish.
