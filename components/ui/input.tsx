import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** shadcn/ui-style Input primitive, styled against YouLink's own tokens. */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-tertiary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
