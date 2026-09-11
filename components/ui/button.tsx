import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Base Button primitive — shadcn/ui-style API (asChild, cva variants) but
 * hand-written against YouLink's own tokens rather than shadcn's default
 * theme, so `npx shadcn add <component>` for future primitives (Dialog,
 * Sheet, Popover…) composes with this one. See DESIGN_SYSTEM.md §6.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "text-white shadow-[var(--glow-violet)] hover:scale-[1.03] bg-[image:var(--aurora)]",
        secondary:
          "border hover:border-[var(--text-tertiary)] border-[var(--border-subtle)] text-[var(--text-primary)]",
        ghost: "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        destructive: "bg-[var(--color-red-500)] text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-4 text-xs",
        md: "h-10 px-6",
        lg: "h-12 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };
