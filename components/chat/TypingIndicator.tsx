"use client";

import { motion } from "framer-motion";

import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

interface TypingIndicatorProps {
  label: string;
}

/** Three bouncing dots + a label ("Guest is typing…" / "Your Name is
 * typing…") — cross-wired between `ChatDock` and `InboxThread` over the
 * same per-conversation Realtime channel messages already use, under a
 * `typing` event (BUILD_PHASES.md Phase 4: "typing indicator"). Reduced-
 * motion gets a static row of dots instead of the bounce. */
export function TypingIndicator({ label }: TypingIndicatorProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex items-center gap-2 px-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
      <span className="flex items-center gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="inline-block size-1.5 rounded-full"
            style={{ background: "var(--text-tertiary)" }}
            animate={reducedMotion ? undefined : { y: [0, -3, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </span>
      {label}
    </div>
  );
}
