"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { CommentForm } from "@/components/works/CommentForm";
import { deleteComment } from "@/lib/actions/comments";
import type { Comment } from "@/lib/data/comments";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils";

interface CommentListProps {
  workId: string;
  initialComments: Comment[];
  /** The viewer's own identity id + whether they're the site owner — purely
   * for which delete button renders; RLS is what actually enforces it. */
  viewerIdentityId: string | null;
  isOwner: boolean;
}

/** Add-or-replace by id, never a duplicate — covers the race between a
 * comment's own poster optimistically appending it via `onPosted` and that
 * same insert's Realtime broadcast echoing back to their own tab. */
function upsertById(comments: Comment[], next: Comment): Comment[] {
  if (comments.some((c) => c.id === next.id)) return comments;
  return [...comments, next];
}

/**
 * Comments on works (BUILD_PHASES.md Stretch, pulled into Phase 3) —
 * mirrors FollowSection's shape: owns the shared list state and the single
 * Realtime subscription that keeps every open tab's thread current.
 */
export function CommentList({ workId, initialComments, viewerIdentityId, isOwner }: CommentListProps) {
  const [comments, setComments] = useState(initialComments);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`work:${workId}`)
      .on("broadcast", { event: "comment_new" }, ({ payload }) => {
        setComments((prev) => upsertById(prev, payload.comment as Comment));
      })
      .on("broadcast", { event: "comment_deleted" }, ({ payload }) => {
        const { id } = payload as { id: string };
        setComments((prev) => prev.filter((c) => c.id !== id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workId]);

  async function handleDelete(commentId: string) {
    if (pendingDeleteId) return;
    setPendingDeleteId(commentId);
    const previous = comments;
    setComments((prev) => prev.filter((c) => c.id !== commentId));

    const result = await deleteComment(commentId, workId);
    if (result.error) {
      setComments(previous);
    }
    setPendingDeleteId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <h2
        className="font-[family-name:var(--font-display)] text-lg font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        Comments{comments.length > 0 ? ` (${comments.length})` : ""}
      </h2>

      <CommentForm workId={workId} onPosted={(comment) => setComments((prev) => upsertById(prev, comment))} />

      {comments.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          No comments yet — be the first to say something.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((comment) => {
            const canDelete = isOwner || comment.authorIdentityId === viewerIdentityId;
            return (
              <motion.li
                key={comment.id}
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-start gap-3"
              >
                <Avatar
                  alt={comment.authorDisplayName}
                  fallback={comment.authorDisplayName.slice(0, 1).toUpperCase()}
                  size={32}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {comment.authorDisplayName}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm" style={{ color: "var(--text-secondary)" }}>
                    {comment.body}
                  </p>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(comment.id)}
                    disabled={pendingDeleteId === comment.id}
                    aria-label="Delete comment"
                    className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
