"use server";

import { getOwnerProfile } from "@/lib/data/profile";
import { createRateLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

// No number specified in BLUEPRINT.md §5 for Follow — using the same
// order of magnitude as Like's 30/min, since it's the same class of
// guest-writable single-row toggle.
const followRateLimiter = createRateLimiter("follow", 30, "1 m");

export interface ToggleFollowResult {
  following: boolean;
  followerCount: number;
  error?: string;
}

/**
 * Insert/delete the current identity's own follow row for the single site
 * owner. RLS ("identity can follow"/"unfollow" from Phase 1) enforces
 * `auth.uid() = follower_identity_id`; there's no denormalized follower
 * count column to maintain (BLUEPRINT.md §3 doesn't have one on
 * `profiles`), so the count is recomputed and broadcast after every
 * toggle rather than incremented/decremented in place.
 */
export async function toggleFollow(): Promise<ToggleFollowResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { following: false, followerCount: 0, error: "Not signed in." };
  }

  const profile = await getOwnerProfile();
  if (!profile) {
    return { following: false, followerCount: 0, error: "No profile to follow." };
  }
  if (user.id === profile.id) {
    return { following: false, followerCount: 0, error: "You can't follow yourself." };
  }

  const { success } = await followRateLimiter.limit(`user:${user.id}`);
  if (!success) {
    return { following: false, followerCount: 0, error: "Slow down a moment." };
  }

  const { data: existing } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_identity_id", user.id)
    .eq("followee_profile_id", profile.id)
    .maybeSingle();

  let following: boolean;
  if (existing) {
    const { error } = await supabase.from("follows").delete().eq("id", existing.id);
    if (error) {
      console.error("[follows] unfollow failed:", error.message);
      return { following: true, followerCount: 0, error: "Couldn't unfollow. Try again." };
    }
    following = false;
  } else {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_identity_id: user.id, followee_profile_id: profile.id });
    if (error) {
      console.error("[follows] follow failed:", error.message);
      return { following: false, followerCount: 0, error: "Couldn't follow. Try again." };
    }
    following = true;
  }

  const { count } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("followee_profile_id", profile.id);
  const followerCount = count ?? 0;

  const broadcastStatus = await supabase.channel(`profile:${profile.id}`).send({
    type: "broadcast",
    event: "follower_count",
    payload: { followerCount },
  });
  if (broadcastStatus !== "ok") {
    console.error("[follows] realtime broadcast failed:", broadcastStatus);
  }

  return { following, followerCount };
}
