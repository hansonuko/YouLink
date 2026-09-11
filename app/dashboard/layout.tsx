import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { isOwnerSession } from "@/lib/auth/owner";

/** Owner-only gate for every /dashboard/* route (BUILD_PHASES.md Phase 2
 * item 5). RLS is still the real enforcement on every write below this —
 * this redirect just gives a non-owner a sign-in prompt instead of a page
 * full of silently-failing forms. */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  if (!(await isOwnerSession())) {
    redirect("/sign-in?next=/dashboard");
  }

  return (
    <div className="min-h-screen">
      <header
        className="flex items-center justify-between border-b px-6 py-4 sm:px-10"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          <span
            className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            You<span className="bg-[image:var(--aurora)] bg-clip-text text-transparent">Link</span>
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: "var(--bg-surface-raised)", color: "var(--text-tertiary)" }}
          >
            Dashboard
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">{children}</main>
    </div>
  );
}
