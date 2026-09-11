/** `SkeletonCard` from DESIGN_SYSTEM.md §6 — Aurora shimmer, no bare spinner. */
export function SkeletonCard() {
  return (
    <div
      className="overflow-hidden rounded-[var(--radius-lg)] border"
      style={{ borderColor: "var(--glass-border)", background: "var(--glass-bg)" }}
      aria-hidden
    >
      <div className="animate-shimmer h-40 w-full" />
      <div className="flex flex-col gap-2 p-4">
        <div className="animate-shimmer h-4 w-3/4 rounded-[var(--radius-sm)]" />
        <div className="animate-shimmer h-3 w-full rounded-[var(--radius-sm)]" />
        <div className="animate-shimmer h-3 w-2/3 rounded-[var(--radius-sm)]" />
      </div>
    </div>
  );
}
