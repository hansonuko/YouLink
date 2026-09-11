"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

// Client-only mount flag via useSyncExternalStore (no subscription needed —
// this only distinguishes the SSR pass from the first client render, so
// next-themes' resolvedTheme is safe to read without a hydration mismatch).
function subscribe() {
  return () => {};
}
function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * Dark/light toggle. Renders nothing meaningful until mounted (avoids
 * SSR/client theme mismatch) — see next-themes docs on this pattern.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return <div className={cn("h-9 w-9", className)} aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
        "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
        className,
      )}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
