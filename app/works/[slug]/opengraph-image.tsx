import { ImageResponse } from "next/og";

import { getWorkBySlug } from "@/lib/data/works";

export const alt = "YouLink";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * BLUEPRINT.md §5 Share — a branded preview card, not a bare URL, for
 * every shared work link. RLS already hides drafts from this route the
 * same way it does the detail page (anonymous fetch of a draft slug comes
 * back null), so an unpublished/unknown slug just falls back to generic
 * YouLink branding instead of leaking a draft title.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const work = await getWorkBySlug(slug);
  const isPublished = work?.status === "published";
  const title = isPublished ? work.title : "YouLink";
  const summary = isPublished ? work.summary : "Your work. Your link. Your network.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 48,
          background: "#0a0a12",
          backgroundImage: "linear-gradient(135deg, #7c5cff 0%, #00d8c0 50%, #ff5c8a 100%)",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 24,
            background: "rgba(10,10,18,0.85)",
            borderRadius: 32,
            padding: 64,
          }}
        >
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#f4f4fa" }}>
            You
            <span style={{ color: "#00d8c0" }}>Link</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 58,
              fontWeight: 700,
              color: "#f4f4fa",
              lineHeight: 1.15,
            }}
          >
            {title}
          </div>
          {summary && (
            <div style={{ display: "flex", fontSize: 28, color: "#a2a2bd" }}>{summary}</div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
