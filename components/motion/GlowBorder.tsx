import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface GlowBorderProps {
  children: ReactNode;
  className?: string;
  /** Which signature glow to use. */
  tone?: "violet" | "coral" | "aurora";
}

/**
 * Glass surface with the Aurora-token edge treatment used on the chat
 * dock, hero panel, active nav item, and modals. See DESIGN_SYSTEM.md
 * §1.5. Purely presentational — no motion here, pair with Reveal/Magnetic
 * for interactive contexts.
 */
export function GlowBorder({ children, className, tone = "aurora" }: GlowBorderProps) {
  const toneStyle =
    tone === "violet"
      ? { boxShadow: "var(--glow-violet)" }
      : tone === "coral"
        ? { boxShadow: "var(--glow-coral)" }
        : undefined;

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border backdrop-blur-[var(--glass-blur)]",
        className,
      )}
      style={{
        background: "var(--glass-bg)",
        borderColor: "var(--glass-border)",
        ...toneStyle,
      }}
    >
      {children}
    </div>
  );
}
