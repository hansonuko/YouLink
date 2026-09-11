import { getOwnerProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";

/** True only for the single site owner's own signed-in session. */
export async function isOwnerSession(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const profile = await getOwnerProfile();
  return profile?.id === user.id;
}
