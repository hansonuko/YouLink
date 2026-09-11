/**
 * Shared Framer Motion tokens. See DESIGN_SYSTEM.md §5 for the spec these
 * implement. Keep animation choices centralized here rather than inlining
 * spring configs in components — see CLAUDE.md's motion guardrails.
 */
import type { Transition } from "framer-motion";

export const spring = {
  /** Buttons, toggles, anything that responds instantly to a tap/click. */
  snappy: { type: "spring", stiffness: 500, damping: 30 } satisfies Transition,
  /** Like burst, badges, anything celebratory. */
  bouncy: { type: "spring", stiffness: 300, damping: 15 } satisfies Transition,
  /** Modals, page transitions, anything large-surface. */
  gentle: { type: "spring", stiffness: 120, damping: 20 } satisfies Transition,
} as const;

export const ease = {
  /** Default for fades/slides. */
  standard: [0.22, 1, 0.36, 1],
  /** Slow ambient background drift. */
  ambient: [0.37, 0, 0.63, 1],
} as const;

export const duration = {
  xs: 0.12,
  sm: 0.18,
  md: 0.25,
  lg: 0.4,
  xl: 0.6,
} as const;
