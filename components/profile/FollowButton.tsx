"use client";

import { motion } from "framer-motion";
import { useTransition } from "react";

import { toggleFollow } from "@/lib/actions/follows";
import { spring } from "@/lib/motion/tokens";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  following: boolean;
  onToggle: (nextFollowing: boolean) => void;
  onResult: (result: { following: boolean; followerCount: number; error?: string }) => void;
  className?: string;
}

/**
 * `FollowButton` — DESIGN_SYSTEM.md §5.3: Aurora fill sweeps in (snappy
 * spring), label crossfades Follow→Following. The sweep is a persistent
 * layer whose `scaleX` we animate, not a mount/unmount — same "no
 * AnimatePresence needed" reasoning as LikeButton's fix, applied from the
 * start here rather than discovered the hard way twice.
 */
export function FollowButton({ following, onToggle, onResult, className }: FollowButtonProps) {
  const [isPending, startTransition] = useTransition();
  const reducedMotion = useReducedMotion();

  function handleClick() {
    if (isPending) return;
    const next = !following;
    onToggle(next);

    startTransition(async () => {
      const result = await toggleFollow();
      if (result.error) {
        onToggle(!next);
      }
      onResult(result);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={following}
      className={cn(
        "relative inline-flex h-10 min-w-24 items-center justify-center overflow-hidden rounded-full border px-5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
        className,
      )}
      style={{
        borderColor: following ? "transparent" : "var(--border-subtle)",
        color: following ? "#fff" : "var(--text-primary)",
      }}
    >
      <motion.span
        aria-hidden
        className="absolute inset-0"
        style={{ background: "var(--aurora)", transformOrigin: "left" }}
        initial={false}
        animate={{ scaleX: following ? 1 : 0 }}
        transition={reducedMotion ? { duration: 0 } : spring.snappy}
      />
      <motion.span
        key={following ? "following" : "follow"}
        className="relative"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {following ? "Following" : "Follow"}
      </motion.span>
    </button>
  );
}
