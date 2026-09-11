// Phase 1 seed — one owner profile + a handful of sample works, for local
// dev (BUILD_PHASES.md Phase 1). Idempotent: safe to re-run any time.
//
// Run with: npm run db:seed
//
// Uses the service_role key to bypass RLS and create the owner's auth user
// directly via the Admin API — this is exactly the kind of trusted,
// server-only, never-shipped-to-the-client context CLAUDE.md's Security
// defaults call out as the only acceptable place for that key.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "owner@example.com";
const OWNER_USERNAME = process.env.NEXT_PUBLIC_OWNER_USERNAME ?? "your-username";
const OWNER_DISPLAY_NAME = process.env.OWNER_DISPLAY_NAME ?? "Your Name";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run via `npm run db:seed` (loads .env.local automatically) rather than `node scripts/seed.mjs` directly.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SAMPLE_WORKS = [
  {
    title: "Building YouLink: a single-owner social network",
    slug: "building-youlink",
    summary:
      "Why YouLink is intentionally single-owner, and what that unlocks in the data model.",
    body_md:
      "## Why single-owner\n\nMost portfolio sites either lock you into a template or bolt on a full multi-tenant social graph you don't need. YouLink keeps `profiles` to exactly one row and makes every social action — like, follow, share, chat — work for guests, not just members.",
    status: "published",
  },
  {
    title: "Designing the Aurora motion system",
    slug: "aurora-motion-system",
    summary: "Spring physics, reduced-motion fallbacks, and the token set behind every animation.",
    body_md:
      '## Motion as confirmation\n\nA like isn\'t just "liked" — it\'s a heart that scales past 100% and settles with a coral particle burst. The animation *is* the confirmation, no separate toast needed.',
    status: "published",
  },
  {
    title: "Guest identity without the localStorage trap",
    slug: "guest-identity",
    summary:
      "How real Supabase anonymous auth keeps guest activity intact across devices and cache clears.",
    body_md:
      "## The problem with localStorage guests\n\nMost \"lite\" social clones fingerprint or localStorage-flag guests, which loses everything on a cache clear or device switch. Real anonymous auth rows mean RLS, rate limiting, and moderation all apply uniformly to guests and members.",
    status: "published",
  },
  {
    title: "A work still in progress",
    slug: "work-in-progress",
    summary: "Draft-status sample — only visible to the owner, proving the RLS policy actually works.",
    body_md: "Not published yet.",
    status: "draft",
  },
];

async function ensureOwner() {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id, username")
    .limit(1)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    console.log(`✓ Owner profile already exists: @${existing.username} (${existing.id})`);
    return existing.id;
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: OWNER_EMAIL,
    email_confirm: true,
    user_metadata: { seeded: true },
  });
  if (createError) throw createError;

  const ownerId = created.user.id;

  const { error: profileError } = await supabase.from("profiles").insert({
    id: ownerId,
    username: OWNER_USERNAME,
    display_name: OWNER_DISPLAY_NAME,
    bio: "Building in public. This profile was created by the Phase 1 seed script.",
    links: [],
  });
  if (profileError) throw profileError;

  console.log(`✓ Created owner profile: @${OWNER_USERNAME} (${ownerId}) <${OWNER_EMAIL}>`);
  return ownerId;
}

async function seedWorks(ownerId) {
  const rows = SAMPLE_WORKS.map((work) => ({
    ...work,
    owner_id: ownerId,
    published_at: work.status === "published" ? new Date().toISOString() : null,
  }));

  const { data, error } = await supabase
    .from("works")
    .upsert(rows, { onConflict: "slug" })
    .select("slug, status");

  if (error) throw error;

  data.forEach((w) => console.log(`✓ Work seeded: ${w.slug} (${w.status})`));
}

async function main() {
  console.log("Seeding YouLink Phase 1 data…\n");
  const ownerId = await ensureOwner();
  await seedWorks(ownerId);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Seed failed:", err.message ?? err);
  process.exit(1);
});
