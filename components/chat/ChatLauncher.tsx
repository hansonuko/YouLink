"use client";

import { MessageCircle, X } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchMyConversation } from "@/lib/actions/chat";
import { createClient } from "@/lib/supabase/client";

const ChatDock = dynamic(() => import("@/components/chat/ChatDock").then((m) => m.ChatDock), { ssr: false });

interface ChatLauncherProps {
  ownerDisplayName: string;
}

/**
 * BLUEPRINT.md §5 — "persistent bottom-right launcher ... available on
 * every public page, no page navigation required to start typing." Stays
 * mounted everywhere the owner allows it (the caller in the root layout
 * already excludes the owner's own session — chatting with yourself is
 * meaningless, same call as FollowButton on the owner's profile view);
 * this component excludes `/dashboard` itself since that's the owner's
 * space regardless of whose session it somehow is.
 *
 * `ChatDock` — the actual message list + Realtime subscription — only
 * mounts once opened (`next/dynamic`, `ssr: false`), so the always-present
 * launcher pill stays cheap (BLUEPRINT.md §7: "chat widget lazy-loads ...
 * so it never blocks first paint").
 */
export function ChatLauncher({ ownerDisplayName }: ChatLauncherProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Initial hydrate: existing unread count + whatever conversation id
  // already exists (returning guest). A brand-new guest has no
  // conversation yet — `conversationId` only appears later, via
  // `ChatDock`'s `onConversationKnown` once they send their first message.
  useEffect(() => {
    let cancelled = false;
    fetchMyConversation().then((result) => {
      if (cancelled || !result) return;
      setUnreadCount(result.messages.filter((m) => m.senderKind === "owner" && !m.readByVisitor).length);
      setConversationId(result.conversationId);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A lightweight subscription (no message list, no dock UI) so the badge
  // still ticks up live for a reply that arrives while the dock is closed.
  // Re-subscribes whenever `conversationId` becomes known/changes, which
  // covers both a returning guest (known at mount) and a brand-new one
  // (known only after their first send).
  useEffect(() => {
    if (!conversationId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on("broadcast", { event: "message_new" }, ({ payload }) => {
        const message = payload.message as { senderKind: string };
        if (message.senderKind === "owner") setUnreadCount((c) => c + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  if (pathname?.startsWith("/dashboard")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) setUnreadCount(0);
        }}
        aria-label={open ? "Minimize chat" : "Open chat"}
        className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full shadow-[var(--glow-violet)] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        style={{ background: "var(--aurora)" }}
      >
        {open ? (
          <X className="size-6 text-white" aria-hidden />
        ) : (
          <MessageCircle className="size-6 text-white" aria-hidden />
        )}
        {!open && unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: "var(--color-coral-400)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <ChatDock
          ownerDisplayName={ownerDisplayName}
          onClose={() => setOpen(false)}
          onConversationKnown={setConversationId}
        />
      )}
    </>
  );
}
