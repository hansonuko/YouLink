"use server";

import type { Comment } from "@/lib/data/comments";
import { createRateLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { commentFormSchema } from "@/lib/validation/comments";

// Comments are freeform guest-facing content, not a single-bit toggle like
// Like/Share — tighter than those 30/min limiters, still generous for a
// real visitor (CLAUDE.md "every guest-writable Server Action must be
// rate-limited").
const commentRateLimiter = createRateLimiter("comment", 10, "1 m");

export interface CreateCommentResult {
  comment: Comment | null;
  commentCount: number;
  error?: string;
}

/**
 * Insert the current identity's own comment — RLS ("identity can comment
 * on published works") enforces `auth.uid() = identity_id` and that the
 * work is actually published; the `snapshot_comment_author` trigger fills
 * in `author_display_name` server-side so a client can't spoof another
 * identity's name. The `on_comment_change` trigger keeps
 * `works.comment_count` in sync. Broadcasts the new comment and count on
 * the same `work:{id}` channel Like/Share already use, under their own
 * `comment_new`/`comment_count` events, so other open tabs see both live.
 */
export async function createComment(workId: string, body: string): Promise<CreateCommentResult> {
  const parsed = commentFormSchema.safeParse({ body });
  if (!parsed.success) {
    return { comment: null, commentCount: 0, error: parsed.error.issues[0]?.message ?? "Invalid comment." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { comment: null, commentCount: 0, error: "Not signed in." };
  }

  const { success } = await commentRateLimiter.limit(`user:${user.id}`);
  if (!success) {
    return { comment: null, commentCount: 0, error: "Too many comments — slow down a moment." };
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ work_id: workId, identity_id: user.id, body: parsed.data.body })
    .select("id, body, author_display_name, identity_id, created_at")
    .single();

  if (error || !data) {
    console.error("[comments] insert failed:", error?.message);
    return { comment: null, commentCount: 0, error: "Couldn't post comment. Try again." };
  }

  const { data: work } = await supabase
    .from("works")
    .select("comment_count")
    .eq("id", workId)
    .maybeSingle();
  const commentCount = work?.comment_count ?? 0;

  const comment: Comment = {
    id: data.id,
    body: data.body,
    authorDisplayName: data.author_display_name,
    authorIdentityId: data.identity_id,
    createdAt: data.created_at,
  };

  const channel = supabase.channel(`work:${workId}`);
  const newStatus = await channel.send({ type: "broadcast", event: "comment_new", payload: { comment } });
  const countStatus = await channel.send({
    type: "broadcast",
    event: "comment_count",
    payload: { commentCount },
  });
  if (newStatus !== "ok" || countStatus !== "ok") {
    console.error("[comments] realtime broadcast failed:", newStatus, countStatus);
  }

  return { comment, commentCount };
}

export interface DeleteCommentResult {
  commentCount: number;
  error?: string;
}

/**
 * Delete a comment — RLS ("commenter or owner can delete a comment") is
 * what actually decides whether this succeeds; a non-owner trying to
 * delete someone else's comment just deletes zero rows (no error, but
 * `commentCount` won't move), which the caller should treat as a no-op.
 */
export async function deleteComment(commentId: string, workId: string): Promise<DeleteCommentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { commentCount: 0, error: "Not signed in." };
  }

  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) {
    console.error("[comments] delete failed:", error.message);
    return { commentCount: 0, error: "Couldn't delete comment." };
  }

  const { data: work } = await supabase
    .from("works")
    .select("comment_count")
    .eq("id", workId)
    .maybeSingle();
  const commentCount = work?.comment_count ?? 0;

  const channel = supabase.channel(`work:${workId}`);
  const deletedStatus = await channel.send({
    type: "broadcast",
    event: "comment_deleted",
    payload: { id: commentId },
  });
  const countStatus = await channel.send({
    type: "broadcast",
    event: "comment_count",
    payload: { commentCount },
  });
  if (deletedStatus !== "ok" || countStatus !== "ok") {
    console.error("[comments] realtime broadcast failed:", deletedStatus, countStatus);
  }

  return { commentCount };
}
