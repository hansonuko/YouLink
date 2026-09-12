"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { FollowButton } from "@/components/profile/FollowButton";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { createClient } from "@/lib/supabase/client";

interface FollowSectionProps {
  profileId: string;
  initialFollowing: boolean;
  initialCount: number;
  /** Hide the button for the owner's own view of their profile — following
   * yourself is meaningless (BLUEPRINT.md §5 Follow). The count still
   * shows and still updates live. */
  showButton: boolean;
}

/**
 * Owns the follower count + following state shared between the count
 * display and the button, and the single Realtime subscription that keeps
 * both current across tabs — mirrors LikeButton's per-work channel
 * pattern, but for the one profile.
 */
export function FollowSection({ profileId, initialFollowing, initialCount, showButton }: FollowSectionProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`profile:${profileId}`)
      .on("broadcast", { event: "follower_count" }, ({ payload }) => {
        setCount(payload.followerCount as number);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="text-left sm:text-right">
        <motion.p
          key={count}
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="font-[family-name:var(--font-display)] text-lg font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {count}
        </motion.p>
        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
          {count === 1 ? "Follower" : "Followers"}
        </p>
      </div>

      {showButton && (
        <FollowButton
          following={following}
          onToggle={setFollowing}
          onResult={(result) => {
            if (!result.error) setCount(result.followerCount);
          }}
        />
      )}
    </div>
  );
}
