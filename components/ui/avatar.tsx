import Image from "next/image";

import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  alt: string;
  /** Shown when `src` is empty — typically the owner's initials. */
  fallback: string;
  size?: number;
  /** Aurora ring treatment — DESIGN_SYSTEM.md §7's "live presence" motif. */
  ring?: boolean;
  className?: string;
}

/** `Avatar` from DESIGN_SYSTEM.md §6's component inventory. */
export function Avatar({ src, alt, fallback, size = 64, ring = false, className }: AvatarProps) {
  return (
    <div
      className={cn("inline-flex shrink-0 rounded-full", className)}
      style={ring ? { background: "var(--aurora)", padding: 3 } : undefined}
    >
      <div
        className="flex items-center justify-center overflow-hidden rounded-full"
        style={{
          width: size,
          height: size,
          background: "var(--bg-surface-raised)",
          border: ring ? "2px solid var(--bg-canvas)" : "1px solid var(--border-subtle)",
        }}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            width={size}
            height={size}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="font-[family-name:var(--font-display)] font-bold"
            style={{ color: "var(--text-secondary)", fontSize: size * 0.36 }}
          >
            {fallback}
          </span>
        )}
      </div>
    </div>
  );
}
