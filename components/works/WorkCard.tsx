import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { GlowBorder } from "@/components/motion/GlowBorder";
import { LikeButton } from "@/components/works/LikeButton";
import { ShareSheet } from "@/components/works/ShareSheet";
import type { WorkSummary } from "@/lib/data/works";
import { cn, formatRelativeTime } from "@/lib/utils";

interface WorkCardProps {
  work: WorkSummary;
  view: "grid" | "list";
}

/** `WorkCard` from DESIGN_SYSTEM.md §6. The cover/title/summary are the
 * link to the work; `LikeButton`/`ShareSheet` sit outside it as their own
 * controls — nesting an interactive element inside an anchor is both
 * invalid HTML and would fire the link navigation on every tap. */
export function WorkCard({ work, view }: WorkCardProps) {
  const cover = work.media[0];
  const isList = view === "list";

  const content = (
    <Link
      href={`/works/${work.slug}`}
      className={cn(
        "block min-w-0 flex-1 rounded-[var(--radius-lg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
        isList && "flex items-stretch gap-4",
      )}
    >
      <div
        className={cn(
          "relative shrink-0",
          isList ? "h-28 w-36 rounded-[var(--radius-md)] sm:w-44" : "h-40 w-full",
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
            className={cn("object-cover", isList && "rounded-[var(--radius-md)]")}
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

      <div className={cn("flex min-w-0 flex-col gap-1.5", isList ? "flex-1 justify-center" : "p-4")}>
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
      </div>
    </Link>
  );

  const actions = (
    <div
      className={cn(
        "flex items-center gap-4 text-xs",
        isList ? "pt-2" : "px-4 pb-4 pt-1",
      )}
      style={{ color: "var(--text-tertiary)" }}
    >
      <LikeButton workId={work.id} initialReaction={work.reaction} initialCount={work.likeCount} />
      <ShareSheet workId={work.id} slug={work.slug} title={work.title} initialCount={work.shareCount} />
      <span className="inline-flex items-center gap-1.5">
        <MessageCircle className="size-3.5" aria-hidden />
        {work.commentCount}
      </span>
      {work.publishedAt && <span>{formatRelativeTime(work.publishedAt)}</span>}
    </div>
  );

  return (
    <GlowBorder
      className={cn("h-full overflow-hidden transition-transform hover:scale-[1.01]", isList && "p-3")}
    >
      {content}
      {actions}
    </GlowBorder>
  );
}
