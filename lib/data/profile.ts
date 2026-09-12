import { createClient } from "@/lib/supabase/server";

export interface ProfileLink {
  label: string;
  url: string;
  icon?: string;
}

export interface OwnerProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  links: ProfileLink[];
  followerCount: number;
  /** Does the *current viewer* already follow this profile. */
  followedByViewer: boolean;
  /** Is the current viewer the owner themselves — hides FollowButton,
   * following yourself is meaningless. */
  isViewer: boolean;
}

/**
 * The single owner profile (BLUEPRINT.md §3 — `profiles` has exactly one
 * row in v1) plus a live follower count. Returns null if the owner hasn't
 * been seeded yet (`npm run db:seed`) rather than throwing, so the page
 * can render an empty state instead of a 500.
 */
export async function getOwnerProfile(): Promise<OwnerProfile | null> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, cover_url, bio, links")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[profile] failed to load owner profile:", error.message);
    return null;
  }
  if (!profile) return null;

  const { count } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("followee_profile_id", profile.id);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let followedByViewer = false;
  if (user && user.id !== profile.id) {
    const { data: existingFollow } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_identity_id", user.id)
      .eq("followee_profile_id", profile.id)
      .maybeSingle();
    followedByViewer = Boolean(existingFollow);
  }

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    coverUrl: profile.cover_url,
    bio: profile.bio,
    links: Array.isArray(profile.links) ? (profile.links as ProfileLink[]) : [],
    followerCount: count ?? 0,
    followedByViewer,
    isViewer: user?.id === profile.id,
  };
}
