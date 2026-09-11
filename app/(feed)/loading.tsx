import { SkeletonCard } from "@/components/ui/skeleton-card";

/** Next's Suspense-boundary fallback for `/` — Aurora shimmer skeletons,
 * never a bare spinner (DESIGN_SYSTEM.md §5.3). */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-24 sm:px-10">
      <div className="animate-shimmer h-32 w-full rounded-[var(--radius-lg)]" aria-hidden />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
