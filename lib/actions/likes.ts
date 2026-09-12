"use server";

import { createRateLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

// BLUEPRINT.md §5 Like — "rate-limited to 30/min per identity."
const likeRateLimiter = createRateLimiter("like", 30, "1 m");

export interface ToggleLikeResult {
  liked: boolean;
  likeCount: number;
  error?: string;
}

/**
 * Insert/delete the current identity's own like row — RLS ("identity can
 * like"/"identity can unlike" from the Phase 1 migration) is what actually
 * enforces `auth.uid() = identity_id`; this just decides which direction
 * to go. The `on_like_change` trigger keeps `works.like_count` in sync, so
 * this function never touches that column directly. After a successful
 * toggle, broadcasts the new count on a per-work Realtime channel so other
 * open tabs see it tick live (BLUEPRINT.md §5) — count isn't sensitive, so
 * a plain public channel is fine, no Realtime Authorization needed.
 */
export async function toggleLike(workId: string): Promise<ToggleLikeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { liked: false, likeCount: 0, error: "Not signed in." };
  }

  const { success } = await likeRateLimiter.limit(`user:${user.id}`);
  if (!success) {
    return { liked: false, likeCount: 0, error: "Too many likes — slow down a moment." };
  }

  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("identity_id", user.id)
    .eq("work_id", workId)
    .maybeSingle();

  let liked: boolean;
  if (existing) {
    const { error } = await supabase.from("likes").delete().eq("id", existing.id);
    if (error) {
      console.error("[likes] unlike failed:", error.message);
      return { liked: true, likeCount: 0, error: "Couldn't unlike. Try again." };
    }
    liked = false;
  } else {
    const { error } = await supabase.from("likes").insert({ identity_id: user.id, work_id: workId });
    if (error) {
      console.error("[likes] like failed:", error.message);
      return { liked: false, likeCount: 0, error: "Couldn't like. Try again." };
    }
    liked = true;
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

  return { liked, likeCount };
}
