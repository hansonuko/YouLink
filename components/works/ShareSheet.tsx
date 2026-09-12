"use client";

import * as Popover from "@radix-ui/react-popover";
import { motion } from "framer-motion";
import { Check, Copy, Linkedin, Mail, MessageCircle, Share2, Twitter } from "lucide-react";
import { useEffect, useState } from "react";

import { logShare, type ShareChannel } from "@/lib/actions/shares";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { getShareUrl } from "@/lib/share-urls";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ShareSheetProps {
  workId: string;
  slug: string;
  title: string;
  initialCount: number;
  className?: string;
}

const EXTERNAL_CHANNELS: { id: "x" | "linkedin" | "whatsapp" | "email"; label: string; icon: typeof Twitter }[] = [
  { id: "x", label: "Share on X", icon: Twitter },
  { id: "linkedin", label: "Share on LinkedIn", icon: Linkedin },
  { id: "whatsapp", label: "Share on WhatsApp", icon: MessageCircle },
  { id: "email", label: "Share by email", icon: Mail },
];

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * `ShareSheet` — BLUEPRINT.md §5 Share: native `navigator.share()` where
 * available, else this Radix Popover fallback (scale+fade, DESIGN_SYSTEM.md
 * §5.3; a true slide-up bottom sheet on mobile is a Phase 5 motion-polish
 * refinement, not blocking this item — the same Popover works at every
 * width, just without the mobile-specific entrance).
 *
 * Logging: copy_link only logs once the clipboard write actually succeeds
 * ("copy link confirmed" per §5); every other channel logs the moment
 * it's chosen, since there's no way to observe whether an opened compose
 * window was actually sent.
 */
export function ShareSheet({ workId, slug, title, initialCount, className }: ShareSheetProps) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [copied, setCopied] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`work:${workId}`)
      .on("broadcast", { event: "share_count" }, ({ payload }) => {
        setCount(payload.shareCount as number);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workId]);

  const url = `${siteUrl()}/works/${slug}`;

  async function record(channel: ShareChannel) {
    const result = await logShare(workId, channel);
    if (!result.error) setCount(result.shareCount);
  }

  async function handleTriggerClick() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        void record("native");
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("[share] native share failed:", err.message);
        }
      }
      return;
    }
    setOpen(true);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      void record("copy_link");
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("[share] clipboard write failed:", err);
    }
  }

  function handleExternalChannel(channelId: "x" | "linkedin" | "whatsapp" | "email") {
    void record(channelId);
    window.open(getShareUrl(channelId, url, title), "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <button
          type="button"
          onClick={handleTriggerClick}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
            className,
          )}
          style={{ color: "var(--text-tertiary)" }}
        >
          <Share2 className="size-3.5" aria-hidden />
          {count}
        </button>
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          align="center"
          sideOffset={8}
          className="z-50 w-64 rounded-[var(--radius-lg)] border p-2 shadow-lg outline-none"
          style={{ background: "var(--bg-surface-raised)", borderColor: "var(--border-subtle)" }}
          asChild
        >
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
          >
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--bg-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
              style={{ color: "var(--text-primary)" }}
            >
              {copied ? (
                <Check className="size-4" style={{ color: "var(--color-teal-400)" }} aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {copied ? "Copied!" : "Copy link"}
            </button>

            {EXTERNAL_CHANNELS.map(({ id, label, icon: Icon }, index) => (
              <motion.button
                key={id}
                type="button"
                onClick={() => handleExternalChannel(id)}
                initial={reducedMotion ? undefined : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: reducedMotion ? 0 : (index + 1) * 0.02 }}
                className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--bg-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                style={{ color: "var(--text-primary)" }}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </motion.button>
            ))}
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
