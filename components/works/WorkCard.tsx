import { Heart, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { GlowBorder } from "@/components/motion/GlowBorder";
import type { WorkSummary } from "@/lib/data/works";
import { cn, formatRelativeTime } from "@/lib/utils";

interface WorkCardProps {
  work: WorkSummary;
  view: "grid" | "list";
}

/** `WorkCard` from DESIGN_SYSTEM.md §6. Like/share are static counts here —
 * the interactive `LikeButton`/`ShareSheet` land in Phase 3. */
export function WorkCard({ work, view }: WorkCardProps) {
  const cover = work.media[0];
  const isList = view === "list";

  return (
    <Link
      href={`/works/${work.slug}`}
      className="block rounded-[var(--radius-lg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
    >
      <GlowBorder
        className={cn(
          "h-full overflow-hidden transition-transform hover:scale-[1.01]",
          isList && "flex items-stretch",
        )}
      >
        <div
          className={cn(
            "relative shrink-0",
            isList ? "h-28 w-36 sm:w-44" : "h-40 w-full",
            !cover && "flex items-center justify-center",
          )}
          style={!cover ? { background: "var(--aurora-soft)" } : undefined}
        >
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.alt ?? work.title}
              fill
              sizes={isList ? "176px" : "(min-width: 640px) 320px, 100vw"}
              className="object-cover"
            />
          ) : (
            <span
              className="font-[family-name:var(--font-display)] text-2xl font-bold opacity-40"
              style={{ color: "var(--text-primary)" }}
            >
              {work.title.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-4">
          <h3
            className="font-[family-name:var(--font-display)] text-base font-bold leading-snug"
            style={{ color: "var(--text-primary)" }}
          >
            {work.title}
          </h3>
          {work.summary && (
            <p className="line-clamp-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              {work.summary}
            </p>
          )}
          <div
            className="mt-auto flex items-center gap-4 pt-1 text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            <span className="flex items-center gap-1">
              <Heart className="size-3.5" aria-hidden />
              {work.likeCount}
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="size-3.5" aria-hidden />
              {work.shareCount}
            </span>
            {work.publishedAt && <span>{formatRelativeTime(work.publishedAt)}</span>}
          </div>
        </div>
      </GlowBorder>
    </Link>
  );
}
