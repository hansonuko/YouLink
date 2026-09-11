"use client";

import { LayoutGrid, List } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { Reveal } from "@/components/motion/Reveal";
import { WorkCard } from "@/components/works/WorkCard";
import { loadMoreWorks } from "@/lib/actions/works";
import type { WorkSummary } from "@/lib/data/works";
import { cn } from "@/lib/utils";

interface FeedListProps {
  initialWorks: WorkSummary[];
  initialCursor: string | null;
}

/** DESIGN_SYSTEM.md §5.3 "Feed card entrance": 40ms stagger, opacity+8px
 * translateY — Reveal already implements exactly that, reused as-is. */
export function FeedList({ initialWorks, initialCursor }: FeedListProps) {
  const [works, setWorks] = useState(initialWorks);
  const [cursor, setCursor] = useState(initialCursor);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const page = await loadMoreWorks(cursor);
      setWorks((prev) => [...prev, ...page.works]);
      setCursor(page.nextCursor);
    });
  }

  if (works.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
        No published works yet.
      </p>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-end gap-1">
        <Button
          type="button"
          size="icon"
          variant={view === "grid" ? "secondary" : "ghost"}
          aria-pressed={view === "grid"}
          aria-label="Grid view"
          onClick={() => setView("grid")}
        >
          <LayoutGrid className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={view === "list" ? "secondary" : "ghost"}
          aria-pressed={view === "list"}
          aria-label="List view"
          onClick={() => setView("list")}
        >
          <List className="size-4" />
        </Button>
      </div>

      <div className={cn("grid gap-4", view === "grid" ? "sm:grid-cols-2" : "grid-cols-1")}>
        {works.map((work, index) => (
          <Reveal key={work.id} delay={(index % FEED_STAGGER_RESET) * 0.04}>
            <WorkCard work={work} view={view} />
          </Reveal>
        ))}
        {isPending && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}
      </div>

      {cursor && (
        <div className="mt-6 flex justify-center">
          <Button type="button" variant="secondary" onClick={handleLoadMore} disabled={isPending}>
            {isPending ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

// Stagger resets every "page" worth of cards rather than growing unbounded
// as more pages load in — keeps later pages' entrance snappy instead of a
// multi-second cascading delay by the 5th "Load more".
const FEED_STAGGER_RESET = 6;
