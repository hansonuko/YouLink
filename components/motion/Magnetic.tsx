"use client";

import { motion } from "framer-motion";
import { type ReactNode, useRef } from "react";

import { spring } from "@/lib/motion/tokens";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

interface MagneticProps {
  children: ReactNode;
  className?: string;
  /** Max pixel offset toward the cursor. */
  strength?: number;
}

/**
 * Desktop-only "magnetic" hover — the element nudges toward the cursor
 * within its own bounds. No-ops on touch (no hover) and under
 * prefers-reduced-motion. See DESIGN_SYSTEM.md §5.3.
 */
export function Magnetic({ children, className, strength = 6 }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      whileHover="hover"
      onPointerMove={(event) => {
        const el = ref.current;
        if (!el || event.pointerType !== "mouse") return;
        const bounds = el.getBoundingClientRect();
        const relX = (event.clientX - bounds.left - bounds.width / 2) / bounds.width;
        const relY = (event.clientY - bounds.top - bounds.height / 2) / bounds.height;
        el.style.setProperty("--mx", `${relX * strength}px`);
        el.style.setProperty("--my", `${relY * strength}px`);
      }}
      onPointerLeave={() => {
        ref.current?.style.setProperty("--mx", "0px");
        ref.current?.style.setProperty("--my", "0px");
      }}
      style={{
        translateX: "var(--mx, 0px)" as unknown as number,
        translateY: "var(--my, 0px)" as unknown as number,
      }}
      transition={spring.snappy}
    >
      {children}
    </motion.div>
  );
}
