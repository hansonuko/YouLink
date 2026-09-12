"use client";

import * as Popover from "@radix-ui/react-popover";
import { motion } from "framer-motion";
import { ChevronDown, Heart, ThumbsUp } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { setReaction, type ReactionType } from "@/lib/actions/likes";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { spring } from "@/lib/motion/tokens";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  workId: string;
  initialReaction: ReactionType | null;
  initialCount: number;
  className?: string;
}

const REACTIONS: Record<ReactionType, { label: string; color: string }> = {
  love: { label: "Love", color: "var(--color-coral-400)" },
  like: { label: "Like", color: "var(--color-violet-500)" },
  clap: { label: "Clap", color: "var(--color-amber-400)" },
};

const PARTICLE_COUNT = 6;

/** Six coral divs radiating outward — DESIGN_SYSTEM.md §5.3 "coral particle
 * burst (canvas-free, 6 small divs)." Reserved for the "love" reaction,
 * the one the spec actually describes; like/clap get a plain scale-bounce. */
function ParticleBurst() {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const angle = (i / PARTICLE_COUNT) * 2 * Math.PI;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 size-1 rounded-full"
            style={{ background: "var(--color-coral-400)" }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: Math.cos(angle) * 16, y: Math.sin(angle) * 16, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        );
      })}
    </span>
  );
}

function ReactionGlyph({ type, active, className }: { type: ReactionType; active: boolean; className?: string }) {
  const color = active ? REACTIONS[type].color : "var(--text-tertiary)";
  if (type === "clap") {
    return (
      <span className={cn("inline-block leading-none", className)} style={{ fontSize: "0.875rem" }} aria-hidden>
        👏
      </span>
    );
  }
  const Icon = type === "love" ? Heart : ThumbsUp;
  return <Icon className={cn(className, active && "fill-current")} style={{ color }} aria-hidden />;
}

/** `LikeButton` — Love/Like/Clap reactions (upgraded from the original
 * single like/unlike toggle per the user's request). Clicking the main
 * button repeats the viewer's current reaction (or defaults to "love" if
 * they have none) — the server's `setReaction` treats "the same reaction
 * again" as un-reacting, so this one call covers add/remove. The caret
 * opens a picker to choose a specific reaction or switch between them.
 * Optimistic update reconciled with the Server Action's real result; other
 * open tabs pick up the new count via the Realtime broadcast it sends. */
export function LikeButton({ workId, initialReaction, initialCount, className }: LikeButtonProps) {
  const [reaction, setReactionState] = useState(initialReaction);
  const [count, setCount] = useState(initialCount);
  const [burstKey, setBurstKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`work:${workId}`)
      .on("broadcast", { event: "like_count" }, ({ payload }) => {
        setCount(payload.likeCount as number);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workId]);

  function applyReaction(next: ReactionType) {
    if (isPending) return;
    const isRemoving = reaction === next;
    const previousReaction = reaction;
    const previousCount = count;

    setReactionState(isRemoving ? null : next);
    setCount((c) => c + (isRemoving ? -1 : previousReaction === null ? 1 : 0));
    if (!isRemoving && next === "love") setBurstKey((k) => k + 1);
    setOpen(false);

    startTransition(async () => {
      const result = await setReaction(workId, next);
      if (result.error) {
        setReactionState(previousReaction);
        setCount(previousCount);
        return;
      }
      setReactionState(result.reaction);
      setCount(result.likeCount);
    });
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <span className={cn("relative inline-flex items-center", className)}>
          <button
            type="button"
            onClick={() => applyReaction(reaction ?? "love")}
            disabled={isPending}
            aria-pressed={reaction !== null}
            aria-label={reaction ? `Remove ${REACTIONS[reaction].label} reaction` : "React"}
            className="relative inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
          >
            <span className="relative inline-flex">
              <motion.span
                key={reaction ?? "none"}
                className="inline-flex"
                animate={reducedMotion ? undefined : { scale: [1, 1.3, 1] }}
                transition={spring.bouncy}
              >
                <ReactionGlyph type={reaction ?? "love"} active={reaction !== null} className="size-3.5" />
              </motion.span>

              {/* Plain conditional render, not AnimatePresence — same
                  "reliable beats fancy" reasoning as the counter below. */}
              {!reducedMotion && burstKey > 0 && <ParticleBurst key={burstKey} />}
            </span>

            {/* Plain keyed remount, not AnimatePresence — there's no exit
                to coordinate here (React destroys the old node the instant
                `count` changes), so there's nothing that can get stuck
                straddling two values. */}
            <span className="relative inline-block overflow-hidden" style={{ color: "var(--text-tertiary)" }}>
              <motion.span
                key={count}
                initial={reducedMotion ? false : { y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="inline-block"
              >
                {count}
              </motion.span>
            </span>
          </button>

          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label="Choose reaction"
              aria-expanded={open}
              className="flex min-h-11 min-w-6 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
              style={{ color: "var(--text-tertiary)" }}
            >
              <ChevronDown className="size-3" aria-hidden />
            </button>
          </Popover.Trigger>
        </span>
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 flex gap-1 rounded-full border p-1 shadow-lg outline-none"
          style={{ background: "var(--bg-surface-raised)", borderColor: "var(--border-subtle)" }}
          asChild
        >
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
          >
            {(Object.keys(REACTIONS) as ReactionType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => applyReaction(type)}
                aria-pressed={reaction === type}
                aria-label={REACTIONS[type].label}
                className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-full px-2 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                style={{ background: reaction === type ? "var(--bg-surface)" : undefined }}
              >
                <ReactionGlyph type={type} active className="size-4" />
                <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  {REACTIONS[type].label}
                </span>
              </button>
            ))}
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
