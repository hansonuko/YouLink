import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Standard shadcn/ui class-merging helper — used across all components. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
