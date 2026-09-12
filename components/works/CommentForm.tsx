"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createComment } from "@/lib/actions/comments";
import type { Comment } from "@/lib/data/comments";

interface CommentFormProps {
  workId: string;
  onPosted: (comment: Comment, commentCount: number) => void;
}

const MAX_LENGTH = 2000;

/** Guest-facing comment composer — every visitor is a real (guest or
 * member) identity per BLUEPRINT.md §4, so there's no separate "sign in to
 * comment" gate here, same as Like/Follow/Share. */
export function CommentForm({ workId, onPosted }: CommentFormProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending || !body.trim()) return;

    startTransition(async () => {
      const result = await createComment(workId, body);
      if (result.error || !result.comment) {
        setError(result.error ?? "Couldn't post comment.");
        return;
      }
      setError(null);
      setBody("");
      onPosted(result.comment, result.commentCount);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Say something about this work…"
        rows={3}
        maxLength={MAX_LENGTH}
        disabled={isPending}
        aria-label="Write a comment"
      />
      <div className="flex items-center justify-between gap-3">
        {error ? (
          <p className="text-xs" style={{ color: "var(--color-red-500)" }}>
            {error}
          </p>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {body.length}/{MAX_LENGTH}
          </span>
        )}
        <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
          {isPending ? "Posting…" : "Post comment"}
        </Button>
      </div>
    </form>
  );
}
