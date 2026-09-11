"use client";

import { motion, type Transition } from "framer-motion";
import type { ReactNode } from "react";

import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { duration, ease } from "@/lib/motion/tokens";

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in seconds, e.g. `index * 0.04` for a feed list. */
  delay?: number;
  className?: string;
  /** Distance (px) the element travels in on reveal. */
  distance?: number;
}

/**
 * Opacity + translateY entrance, used for feed cards and section intros.
 * Triggers once when scrolled into view. Instant, no motion, under
 * prefers-reduced-motion. See DESIGN_SYSTEM.md §5.3 "Feed card entrance."
 */
export function Reveal({ children, delay = 0, className, distance = 8 }: RevealProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const transition = {
    duration: duration.md,
    delay,
    ease: ease.standard,
  } as Transition;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
