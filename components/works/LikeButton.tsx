"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { toggleLike } from "@/lib/actions/likes";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { spring } from "@/lib/motion/tokens";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  workId: string;
  initialLiked: boolean;
  initialCount: number;
  className?: string;
}

const PARTICLE_COUNT = 6;

/** Six coral divs radiating outward — DESIGN_SYSTEM.md §5.3 "coral particle
 * burst (canvas-free, 6 small divs)." Only ever mounted for one animation
 * cycle, then removed via AnimatePresence's onExitComplete-free unmount. */
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

/** `LikeButton` — DESIGN_SYSTEM.md §5.3: scale 1→1.3→1 bouncy spring, coral
 * particle burst, rolling-odometer count. Optimistic update reconciled with
 * the Server Action's real result; other open tabs pick up the new count
 * via the Realtime broadcast toggleLike sends. */
export function LikeButton({ workId, initialLiked, initialCount, className }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [burstKey, setBurstKey] = useState(0);
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

  function handleClick() {
    if (isPending) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));
    if (nextLiked) setBurstKey((k) => k + 1);

    startTransition(async () => {
      const result = await toggleLike(workId);
      if (result.error) {
        setLiked(!nextLiked);
        setCount((c) => c + (nextLiked ? -1 : 1));
        return;
      }
      setLiked(result.liked);
      setCount(result.likeCount);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      className={cn(
        "relative inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
        className,
      )}
    >
      <span className="relative inline-flex">
        <motion.span
          key={liked ? "liked" : "unliked"}
          className="inline-flex"
          animate={reducedMotion ? undefined : { scale: [1, 1.3, 1] }}
          transition={spring.bouncy}
        >
          <Heart
            className={cn("size-3.5", liked && "fill-current")}
            style={{ color: liked ? "var(--color-coral-400)" : "var(--text-tertiary)" }}
            aria-hidden
          />
        </motion.span>

        {/* Plain conditional render, not AnimatePresence — same reasoning
            as the counter below: each burst's dots already animate their
            own opacity to 0 via `animate`, so there's no exit to
            coordinate, and a new keyed instance replacing an old one
            unmounts the old one immediately rather than risking it
            getting stuck mid-transition. */}
        {!reducedMotion && burstKey > 0 && <ParticleBurst key={burstKey} />}
      </span>

      {/* Plain keyed remount, not AnimatePresence — there's no exit to
          coordinate here (React destroys the old node the instant `count`
          changes), so there's nothing that can get stuck straddling two
          values. Just a "pop in" on the new number, not a full crossfade,
          but reliable beats fancy. */}
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
  );
}
