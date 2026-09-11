"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import type { WorkMedia } from "@/lib/data/works";

interface MediaLightboxProps {
  media: WorkMedia[];
}

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500";

/**
 * `MediaLightbox` from DESIGN_SYSTEM.md §6 — built on Radix Dialog per
 * CLAUDE.md's "never reinvent focus-trapping/portal logic by hand"; only
 * the skin here is custom.
 */
export function MediaLightbox({ media }: MediaLightboxProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (media.length === 0) return null;

  const active = openIndex !== null ? media[openIndex] : null;

  function show(delta: number) {
    setOpenIndex((current) => {
      if (current === null) return current;
      return (current + delta + media.length) % media.length;
    });
  }

  return (
    <Dialog.Root open={openIndex !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
      <div className={media.length > 1 ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : ""}>
        {media.map((item, index) => (
          <button
            key={item.url}
            type="button"
            onClick={() => setOpenIndex(index)}
            className={`relative aspect-video overflow-hidden rounded-[var(--radius-md)] ${focusRing}`}
          >
            <Image
              src={item.url}
              alt={item.alt ?? ""}
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform hover:scale-105"
            />
          </button>
        ))}
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex items-center justify-center p-6 outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Media viewer</Dialog.Title>
          {active && (
            <div className="relative h-full max-h-[80vh] w-full max-w-4xl">
              <Image src={active.url} alt={active.alt ?? ""} fill className="object-contain" />
            </div>
          )}

          <Dialog.Close
            className={`absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white ${focusRing}`}
            aria-label="Close"
          >
            <X className="size-5" />
          </Dialog.Close>

          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => show(-1)}
                className={`absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white ${focusRing}`}
                aria-label="Previous media"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={() => show(1)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white ${focusRing}`}
                aria-label="Next media"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
