import type { Metadata } from "next";
import Link from "next/link";

import { GlowBorder } from "@/components/motion/GlowBorder";
import { Button } from "@/components/ui/button";
import { getOwnerWorks, type OwnerWorkListItem } from "@/lib/data/works";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const STATUS_COLOR: Record<OwnerWorkListItem["status"], string> = {
  published: "var(--color-teal-400)",
  draft: "var(--color-amber-400)",
  archived: "var(--text-tertiary)",
};

export default async function DashboardPage() {
  const works = await getOwnerWorks();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1
          className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Your works
        </h1>
        <Button asChild>
          <Link href="/dashboard/works/new">New work</Link>
        </Button>
      </div>

      {works.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          No works yet — create your first one.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {works.map((work) => (
            <Link
              key={work.id}
              href={`/dashboard/works/${work.id}`}
              className="rounded-[var(--radius-lg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            >
              <GlowBorder className="flex items-center justify-between p-4 transition-transform hover:scale-[1.005]">
                <div className="min-w-0">
                  <p
                    className="truncate font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {work.title}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {formatRelativeTime(work.publishedAt ?? work.createdAt)}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize"
                  style={{ color: STATUS_COLOR[work.status], background: "var(--bg-surface-raised)" }}
                >
                  {work.status}
                </span>
              </GlowBorder>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
