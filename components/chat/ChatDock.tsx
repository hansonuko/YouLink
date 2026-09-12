"use client";

import { motion } from "framer-motion";
import { Send, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fetchMyConversation, markConversationRead, sendGuestMessage } from "@/lib/actions/chat";
import { useTypingSignal } from "@/lib/chat/use-typing-signal";
import type { ChatMessage } from "@/lib/data/chat";
import { spring } from "@/lib/motion/tokens";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { createClient } from "@/lib/supabase/client";

interface ChatDockProps {
  ownerDisplayName: string;
  onClose: () => void;
  /** Reports the conversation id up to `ChatLauncher` the moment it's
   * known — including the very first time, when a brand-new guest's first
   * send creates it — so the launcher's own badge-tracking subscription
   * (set up before any conversation existed) can pick it up. */
  onConversationKnown?: (conversationId: string) => void;
}

/** Add-or-replace by id — covers the race between this tab's own
 * optimistic append and that same insert's Realtime broadcast echo,
 * same pattern as CommentList. */
function upsertById(messages: ChatMessage[], next: ChatMessage): ChatMessage[] {
  if (messages.some((m) => m.id === next.id)) return messages;
  return [...messages, next];
}

/**
 * `ChatDock` — DESIGN_SYSTEM.md §5.3: "expands from launcher pill with
 * `gentle` spring, message bubbles enter with 60ms stagger + spring."
 * Lazy-loaded by `ChatLauncher` (BUILD_PHASES.md Phase 4) so this heavier
 * component (Realtime subscription, message list) never ships in the
 * initial bundle. One Radix-free `motion.div` for both mobile (full-sheet)
 * and desktop (bottom-right panel) — same scoping call already made for
 * `ShareSheet`: one component styled per breakpoint beats two components.
 */
export function ChatDock({ ownerDisplayName, onClose, onConversationKnown }: ChatDockProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const reducedMotion = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const { theirTyping: ownerTyping, handleTypingBroadcast, registerChannel, notifyTyping } = useTypingSignal("identity");

  useEffect(() => {
    let cancelled = false;
    fetchMyConversation().then((result) => {
      if (cancelled) return;
      if (result) {
        setConversationId(result.conversationId);
        setMessages(result.messages);
        onConversationKnown?.(result.conversationId);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // `onConversationKnown` is `setConversationId` from `ChatLauncher` in
    // practice — a useState setter, stable across renders — so including
    // it here doesn't cause this mount-only fetch to re-run.
  }, [onConversationKnown]);

  useEffect(() => {
    if (!conversationId) {
      registerChannel(null);
      return;
    }
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on("broadcast", { event: "message_new" }, ({ payload }) => {
        setMessages((prev) => upsertById(prev, payload.message as ChatMessage));
      })
      .on("broadcast", { event: "typing" }, handleTypingBroadcast)
      .subscribe();
    registerChannel(channel);

    return () => {
      supabase.removeChannel(channel);
      registerChannel(null);
    };
  }, [conversationId, handleTypingBroadcast, registerChannel]);

  useEffect(() => {
    if (!conversationId) return;
    const hasUnread = messages.some((m) => m.senderKind === "owner" && !m.readByVisitor);
    if (hasUnread) void markConversationRead(conversationId);
  }, [conversationId, messages]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [messages, reducedMotion]);

  function handleSend() {
    if (isPending || !body.trim()) return;
    const text = body;
    setBody("");
    setError(null);

    startTransition(async () => {
      const result = await sendGuestMessage(text);
      if (result.error || !result.message) {
        setError(result.error ?? "Couldn't send message.");
        setBody(text);
        return;
      }
      setConversationId(result.message.conversationId);
      setMessages((prev) => upsertById(prev, result.message!));
      onConversationKnown?.(result.message.conversationId);
    });
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Chat with ${ownerDisplayName}`}
      initial={reducedMotion ? undefined : { opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={spring.gentle}
      className="fixed left-0 right-0 top-0 bottom-0 z-50 flex flex-col sm:left-auto sm:top-auto sm:bottom-24 sm:right-6 sm:h-[min(32rem,calc(100dvh-7.5rem))] sm:w-96 sm:rounded-[var(--radius-lg)] sm:border"
      style={{ background: "var(--bg-surface-raised)", borderColor: "var(--border-subtle)" }}
    >
      <header
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <p
          className="font-[family-name:var(--font-display)] text-sm font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Chat with {ownerDisplayName}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
          style={{ color: "var(--text-tertiary)" }}
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Loading…
          </p>
        ) : messages.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Say hello — {ownerDisplayName} usually replies soon.
          </p>
        ) : (
          messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              isOwnMessage={m.senderKind === "identity"}
              staggerIndex={i < 20 ? i : undefined}
            />
          ))
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t p-3" style={{ borderColor: "var(--border-subtle)" }}>
        {error && (
          <p className="px-1 text-xs" style={{ color: "var(--color-red-500)" }}>
            {error}
          </p>
        )}
        {ownerTyping && <TypingIndicator label={`${ownerDisplayName} is typing…`} />}
        <div className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              notifyTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message…"
            rows={1}
            maxLength={4000}
            disabled={isPending}
            aria-label="Write a message"
            className="min-h-11 resize-none py-2.5"
          />
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={isPending || !body.trim()}
            aria-label="Send message"
          >
            <Send className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
