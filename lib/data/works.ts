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

  const works: WorkSummary[] = page.map((w) => ({
    id: w.id,
    title: w.title,
    slug: w.slug,
    summary: w.summary,
    media: Array.isArray(w.media) ? (w.media as WorkMedia[]) : [],
    likeCount: w.like_count,
    shareCount: w.share_count,
    publishedAt: w.published_at,
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
    .select(
      "id, title, slug, summary, body_md, media, external_url, status, like_count, share_count, published_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[works] failed to load work by slug:", error.message);
    return null;
  }
  if (!data) return null;

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
  };
}
