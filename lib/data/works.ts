import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export interface WorkMedia {
  url: string;
  type: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface WorkSummary {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  media: WorkMedia[];
  likeCount: number;
  shareCount: number;
  publishedAt: string | null;
  /** Has the *current viewer* liked this work — batched, not N+1. */
  liked: boolean;
}

/** One query for a whole page of works instead of one per card. */
async function getLikedWorkIdSet(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the generated Database type isn't wired up yet (no `supabase gen types` on this platform, see BUILD_PHASES.md)
  supabase: SupabaseClient<any>,
  workIds: string[],
): Promise<Set<string>> {
  if (workIds.length === 0) return new Set();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from("likes")
    .select("work_id")
    .eq("identity_id", user.id)
    .in("work_id", workIds);

  if (error) {
    console.error("[works] failed to load liked work ids:", error.message);
    return new Set();
  }
  return new Set(data.map((row: { work_id: string }) => row.work_id));
}

export interface WorksPage {
  works: WorkSummary[];
  nextCursor: string | null;
}

export interface WorkDetail extends WorkSummary {
  bodyMd: string | null;
  externalUrl: string | null;
  status: "draft" | "published" | "archived";
}

const WORK_DETAIL_COLUMNS =
  "id, title, slug, summary, body_md, media, external_url, status, like_count, share_count, published_at";

interface WorkDetailRow {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body_md: string | null;
  media: unknown;
  external_url: string | null;
  status: "draft" | "published" | "archived";
  like_count: number;
  share_count: number;
  published_at: string | null;
}

function mapWorkDetailRow(data: WorkDetailRow, liked: boolean): WorkDetail {
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    summary: data.summary,
    bodyMd: data.body_md,
    externalUrl: data.external_url,
    status: data.status,
    media: Array.isArray(data.media) ? (data.media as WorkMedia[]) : [],
    likeCount: data.like_count,
    shareCount: data.share_count,
    publishedAt: data.published_at,
    liked,
  };
}

export const FEED_PAGE_SIZE = 6;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function encodeCursor(publishedAt: string, id: string) {
  return Buffer.from(`${publishedAt}|${id}`, "utf8").toString("base64url");
}

/** Returns null (treated as "start over") for anything malformed — a
 * tampered cursor should degrade to page one, never throw or leak into a
 * raw filter string unchecked. */
function decodeCursor(cursor: string): { publishedAt: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const [publishedAt, id] = decoded.split("|");
    if (!publishedAt || !id) return null;
    if (Number.isNaN(Date.parse(publishedAt))) return null;
    if (!UUID_RE.test(id)) return null;
    return { publishedAt, id };
  } catch {
    return null;
  }
}

/**
 * Published works, newest first, keyset-paginated on (published_at, id) —
 * BLUEPRINT.md §5 Feed contract. Offset pagination isn't stable under
 * concurrent publishes, which is why this isn't just `.range()`.
 */
export async function getPublishedWorksPage(
  cursor?: string | null,
  limit: number = FEED_PAGE_SIZE,
): Promise<WorksPage> {
  const supabase = await createClient();

  let query = supabase
    .from("works")
    .select("id, title, slug, summary, media, like_count, share_count, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  const decoded = cursor ? decodeCursor(cursor) : null;
  if (decoded) {
    query = query.or(
      `published_at.lt.${decoded.publishedAt},and(published_at.eq.${decoded.publishedAt},id.lt.${decoded.id})`,
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("[works] failed to load feed page:", error.message);
    return { works: [], nextCursor: null };
  }

  const hasMore = data.length > limit;
  const page = hasMore ? data.slice(0, limit) : data;

  const likedIds = await getLikedWorkIdSet(supabase, page.map((w) => w.id));

  const works: WorkSummary[] = page.map((w) => ({
    id: w.id,
    title: w.title,
    slug: w.slug,
    summary: w.summary,
    media: Array.isArray(w.media) ? (w.media as WorkMedia[]) : [],
    likeCount: w.like_count,
    shareCount: w.share_count,
    publishedAt: w.published_at,
    liked: likedIds.has(w.id),
  }));

  const last = page.at(-1);
  const nextCursor = hasMore && last?.published_at ? encodeCursor(last.published_at, last.id) : null;

  return { works, nextCursor };
}

/**
 * A single work by slug, for the detail page. RLS (works' own "published
 * works are publicly readable" policy from the Phase 1 migration) is what
 * actually enforces visibility here — an anonymous visitor gets null for a
 * draft slug, the owner gets the real row. This function doesn't re-check
 * status itself, it just surfaces whatever RLS already decided.
 */
export async function getWorkBySlug(slug: string): Promise<WorkDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("works")
    .select(WORK_DETAIL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[works] failed to load work by slug:", error.message);
    return null;
  }
  if (!data) return null;

  const likedIds = await getLikedWorkIdSet(supabase, [data.id]);
  return mapWorkDetailRow(data, likedIds.has(data.id));
}

/** For the dashboard edit page — editing keys off id, not slug (slug can change). */
export async function getWorkById(id: string): Promise<WorkDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("works")
    .select(WORK_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[works] failed to load work by id:", error.message);
    return null;
  }
  if (!data) return null;

  const likedIds = await getLikedWorkIdSet(supabase, [data.id]);
  return mapWorkDetailRow(data, likedIds.has(data.id));
}

export interface OwnerWorkListItem {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  createdAt: string;
  publishedAt: string | null;
}

/**
 * Every work the owner has, any status — the dashboard list. RLS's
 * "published works are publicly readable" policy also grants the owner
 * `auth.uid() = owner_id` visibility into their own drafts/archived works,
 * so no extra filter is needed here beyond calling this with the owner's
 * own session (enforced by the dashboard layout, not by this function).
 */
export async function getOwnerWorks(): Promise<OwnerWorkListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("works")
    .select("id, title, slug, status, created_at, published_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[works] failed to load owner works list:", error.message);
    return [];
  }

  return data.map((w) => ({
    id: w.id,
    title: w.title,
    slug: w.slug,
    status: w.status,
    createdAt: w.created_at,
    publishedAt: w.published_at,
  }));
}
