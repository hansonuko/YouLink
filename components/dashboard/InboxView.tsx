"use client";

import { useEffect, useState } from "react";

import { InboxThread } from "@/components/dashboard/InboxThread";
import { Avatar } from "@/components/ui/avatar";
import { fetchOwnerInbox } from "@/lib/actions/chat";
import type { InboxConversation } from "@/lib/data/chat";
import { createClient } from "@/lib/supabase/client";
import { cn, formatRelativeTime } from "@/lib/utils";

interface InboxViewProps {
  initialConversations: InboxConversation[];
  ownerId: string;
}

/**
 * Owns the conversation list + which thread (if any) is open. A single
 * view swaps between "list" and "open thread" rather than a side-by-side
 * split — simpler, and fits the dashboard's existing `max-w-3xl` shell
 * (set globally in `app/dashboard/layout.tsx`) without fighting it.
 */
export function InboxView({ initialConversations, ownerId }: InboxViewProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`inbox:${ownerId}`)
      .on("broadcast", { event: "inbox_update" }, () => {
        // A new guest message landed somewhere in the inbox — small
        // enough scale (single-owner site) that refetching the whole
        // list is simpler and plenty fast, rather than patching one
        // conversation's unread count/order in place.
        void fetchOwnerInbox().then(setConversations);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownerId]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  if (selected) {
    return (
      <InboxThread
        conversation={selected}
        onBack={() => setSelectedId(null)}
        onBlockedChange={(blocked) => {
          setConversations((prev) => prev.map((c) => (c.id === selected.id ? { ...c, blocked } : c)));
        }}
        onRead={() => {
          setConversations((prev) => prev.map((c) => (c.id === selected.id ? { ...c, unreadCount: 0 } : c)));
        }}
      />
    );
  }

  if (conversations.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
        No conversations yet — when a visitor says hello, it&apos;ll show up here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {conversations.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => setSelectedId(c.id)}
            className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] border p-3 text-left transition-colors hover:bg-[var(--bg-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <Avatar
              src={c.visitorAvatarUrl}
              alt={c.visitorDisplayName}
              fallback={c.visitorDisplayName.slice(0, 1).toUpperCase()}
              size={40}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p
                  className={cn("truncate text-sm", c.unreadCount > 0 && "font-bold")}
                  style={{ color: "var(--text-primary)" }}
                >
                  {c.visitorDisplayName}
                </p>
                {c.blocked && (
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: "var(--bg-surface-raised)", color: "var(--text-tertiary)" }}
                  >
                    Blocked
                  </span>
                )}
              </div>
              {c.lastMessageAt && (
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {formatRelativeTime(c.lastMessageAt)}
                </p>
              )}
            </div>
            {c.unreadCount > 0 && (
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: "var(--color-coral-400)" }}
              >
                {c.unreadCount > 9 ? "9+" : c.unreadCount}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
