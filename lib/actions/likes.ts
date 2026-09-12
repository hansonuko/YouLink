"use server";

import { requireGuestWriteVerified } from "@/lib/actions/turnstile";
import { createRateLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export type ReactionType = "love" | "like" | "clap";

const REACTION_TYPES: readonly ReactionType[] = ["love", "like", "clap"];

// BLUEPRINT.md §5 Like — "rate-limited to 30/min per identity." Unchanged
// by the reactions upgrade: switching or clearing a reaction is the same
// cost as the old like/unlike toggle.
const reactionRateLimiter = createRateLimiter("like", 30, "1 m");

export interface SetReactionResult {
  /** null means "no reaction" — the identity had one and just cleared it. */
  reaction: ReactionType | null;
  likeCount: number;
  error?: string;
}

/**
 * Set, switch, or clear the current identity's own reaction on a work.
 * Still one row per (identity_id, work_id) in `likes` — RLS ("identity can
 * like"/"identity can change their own reaction"/"identity can unlike")
 * enforces `auth.uid() = identity_id` for every branch below:
 *
 * - no existing row + a reaction is requested → insert
 * - existing row, same reaction requested again → delete (un-react)
 * - existing row, a different reaction requested → update in place
 *
 * `on_like_change` only fires on insert/delete, so switching between
 * reactions (the update branch) never touches `works.like_count` — total
 * engagement doesn't change just because someone changed their mind about
 * *which* reaction. Broadcasts the new total on the same `work:{id}`
 * channel used elsewhere; per-viewer reaction choice isn't broadcast since
 * it's meaningless to anyone but that viewer.
 */
export async function setReaction(workId: string, reaction: ReactionType): Promise<SetReactionResult> {
  if (!REACTION_TYPES.includes(reaction)) {
    return { reaction: null, likeCount: 0, error: "Invalid reaction." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { reaction: null, likeCount: 0, error: "Not signed in." };
  }

  const { success } = await reactionRateLimiter.limit(`user:${user.id}`);
  if (!success) {
    return { reaction: null, likeCount: 0, error: "Too many reactions — slow down a moment." };
  }

  const verified = await requireGuestWriteVerified(supabase, user.id);
  if (!verified.ok) {
    return { reaction: null, likeCount: 0, error: verified.error };
  }

  const { data: existing } = await supabase
    .from("likes")
    .select("id, reaction")
    .eq("identity_id", user.id)
    .eq("work_id", workId)
    .maybeSingle();

  let nextReaction: ReactionType | null;
  if (!existing) {
    const { error } = await supabase
      .from("likes")
      .insert({ identity_id: user.id, work_id: workId, reaction });
    if (error) {
      console.error("[likes] react failed:", error.message);
      return { reaction: null, likeCount: 0, error: "Couldn't react. Try again." };
    }
    nextReaction = reaction;
  } else if (existing.reaction === reaction) {
    const { error } = await supabase.from("likes").delete().eq("id", existing.id);
    if (error) {
      console.error("[likes] un-react failed:", error.message);
      return { reaction: existing.reaction as ReactionType, likeCount: 0, error: "Couldn't remove reaction. Try again." };
    }
    nextReaction = null;
  } else {
    const { error } = await supabase.from("likes").update({ reaction }).eq("id", existing.id);
    if (error) {
      console.error("[likes] switch reaction failed:", error.message);
      return { reaction: existing.reaction as ReactionType, likeCount: 0, error: "Couldn't switch reaction. Try again." };
    }
    nextReaction = reaction;
  }

  const { data: work } = await supabase
    .from("works")
    .select("like_count")
    .eq("id", workId)
    .maybeSingle();
  const likeCount = work?.like_count ?? 0;

  const broadcastStatus = await supabase.channel(`work:${workId}`).send({
    type: "broadcast",
    event: "like_count",
    payload: { likeCount },
  });
  if (broadcastStatus !== "ok") {
    console.error("[likes] realtime broadcast failed:", broadcastStatus);
  }

  return { reaction: nextReaction, likeCount };
}
