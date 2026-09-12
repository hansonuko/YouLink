"use client";

import { ArrowLeft, Ban, Send, ShieldOff } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fetchConversationMessages, markConversationRead, sendOwnerReply, setIdentityBlocked } from "@/lib/actions/chat";
import type { ChatMessage, InboxConversation } from "@/lib/data/chat";
import { createClient } from "@/lib/supabase/client";

interface InboxThreadProps {
  conversation: InboxConversation;
  onBack: () => void;
  onBlockedChange: (blocked: boolean) => void;
  onRead: () => void;
}

function upsertById(messages: ChatMessage[], next: ChatMessage): ChatMessage[] {
  if (messages.some((m) => m.id === next.id)) return messages;
  return [...messages, next];
}

/** An open conversation thread in the owner's inbox — reply, block/unblock,
 * and the same live-message behavior as the guest-facing `ChatDock`
 * (BUILD_PHASES.md Phase 4, item 3: "reply from same UI"). */
export function InboxThread({ conversation, onBack, onBlockedChange, onRead }: InboxThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchConversationMessages(conversation.id).then((result) => {
      if (cancelled) return;
      setMessages(result);
      setLoading(false);
    });
    void markConversationRead(conversation.id).then(() => onRead());
    return () => {
      cancelled = true;
    };
    // `onRead` is a setState-derived callback from the parent; re-running
    // this on every parent render would refetch/re-mark-read needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation:${conversation.id}`)
      .on("broadcast", { event: "message_new" }, ({ payload }) => {
        setMessages((prev) => upsertById(prev, payload.message as ChatMessage));
        void markConversationRead(conversation.id).then(() => onRead());
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- same reasoning as above.
  }, [conversation.id]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (isPending || !body.trim()) return;
    const text = body;
    setBody("");
    setError(null);

    startTransition(async () => {
      const result = await sendOwnerReply(conversation.id, text);
      if (result.error || !result.message) {
        setError(result.error ?? "Couldn't send reply.");
        setBody(text);
        return;
      }
      setMessages((prev) => upsertById(prev, result.message!));
    });
  }

  function handleToggleBlock() {
    const next = !conversation.blocked;
    onBlockedChange(next);
    startTransition(async () => {
      const result = await setIdentityBlocked(conversation.identityId, next);
      if (result.error) onBlockedChange(!next);
    });
  }

  return (
    <div className="flex h-[32rem] flex-col rounded-[var(--radius-lg)] border" style={{ borderColor: "var(--border-subtle)" }}>
      <header
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to inbox"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowLeft className="size-4" aria-hidden />
          </button>
          <p className="font-[family-name:var(--font-display)] text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {conversation.visitorDisplayName}
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleBlock}
          aria-pressed={conversation.blocked}
          aria-label={conversation.blocked ? "Unblock visitor" : "Block visitor"}
          className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
          style={{ color: conversation.blocked ? "var(--color-teal-400)" : "var(--color-red-500)" }}
        >
          {conversation.blocked ? (
            <>
              <ShieldOff className="size-3.5" aria-hidden />
              Unblock
            </>
          ) : (
            <>
              <Ban className="size-3.5" aria-hidden />
              Block
            </>
          )}
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Loading…
          </p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} isOwnMessage={m.senderKind === "owner"} />)
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t p-3" style={{ borderColor: "var(--border-subtle)" }}>
        {error && (
          <p className="px-1 text-xs" style={{ color: "var(--color-red-500)" }}>
            {error}
          </p>
        )}
        {conversation.blocked && (
          <p className="px-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
            This visitor is blocked — you can still reply, but their own messages won&apos;t go through.
          </p>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a reply…"
            rows={1}
            maxLength={4000}
            disabled={isPending}
            aria-label="Write a reply"
            className="min-h-11 resize-none py-2.5"
          />
          <Button type="button" size="icon" onClick={handleSend} disabled={isPending || !body.trim()} aria-label="Send reply">
            <Send className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
