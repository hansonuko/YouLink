import { createClient } from "@/lib/supabase/server";

export interface Comment {
  id: string;
  body: string;
  authorDisplayName: string;
  authorIdentityId: string;
  createdAt: string;
}

export interface CommentsForWork {
  comments: Comment[];
  /** The current viewer's own identity id, for "is this my comment" checks
   * client-side — RLS is what actually enforces delete, this is purely
   * about which delete button renders. */
  viewerIdentityId: string | null;
  isOwner: boolean;
}

/**
 * Oldest-first comment thread for a work's detail page (20260912000000
 * migration). RLS's "comments on visible works are readable" policy
 * already hides comments on a draft/archived work from anyone but the
 * owner, so this doesn't re-check work status itself.
 */
export async function getCommentsForWork(workId: string): Promise<CommentsForWork> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comments")
    .select("id, body, author_display_name, identity_id, created_at")
    .eq("work_id", workId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[comments] failed to load comments:", error.message);
    return { comments: [], viewerIdentityId: null, isOwner: false };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOwner = false;
  if (user) {
    const { data: ownerRow } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    isOwner = Boolean(ownerRow);
  }

  return {
    comments: data.map((c) => ({
      id: c.id,
      body: c.body,
      authorDisplayName: c.author_display_name,
      authorIdentityId: c.identity_id,
      createdAt: c.created_at,
    })),
    viewerIdentityId: user?.id ?? null,
    isOwner,
  };
}
