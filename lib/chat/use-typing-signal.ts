"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

const THROTTLE_MS = 2000;
const AUTO_CLEAR_MS = 3000;

type SenderKind = "identity" | "owner";

/**
 * Cross-wired typing indicator over an already-subscribed per-conversation
 * Realtime channel (BUILD_PHASES.md Phase 4) — shared between `ChatDock`
 * (guest) and `InboxThread` (owner) rather than duplicated, since both
 * sides need the exact same throttle-on-send / auto-clear-on-receive
 * behavior. There's no explicit "stopped typing" event; `theirTyping`
 * just clears itself after a few seconds of silence, the same convention
 * most chat apps use.
 *
 * Usage: register `handleTypingBroadcast` as a `.on("broadcast", {event:
 * "typing"}, ...)` handler on the same channel the caller already
 * subscribes for messages, call `registerChannel` with that channel once
 * subscribed (and with `null` on cleanup), and call `notifyTyping` from
 * the composer's `onChange`.
 */
export function useTypingSignal(selfKind: SenderKind) {
  const [theirTyping, setTheirTyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentRef = useRef(0);
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theirKind: SenderKind = selfKind === "identity" ? "owner" : "identity";

  const handleTypingBroadcast = useCallback(
    ({ payload }: { payload: { senderKind?: string } }) => {
      if (payload.senderKind !== theirKind) return;
      setTheirTyping(true);
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = setTimeout(() => setTheirTyping(false), AUTO_CLEAR_MS);
    },
    [theirKind],
  );

  const registerChannel = useCallback((channel: RealtimeChannel | null) => {
    channelRef.current = channel;
  }, []);

  const notifyTyping = useCallback(() => {
    if (!channelRef.current) return;
    const now = Date.now();
    if (now - lastSentRef.current < THROTTLE_MS) return;
    lastSentRef.current = now;
    void channelRef.current.send({ type: "broadcast", event: "typing", payload: { senderKind: selfKind } });
  }, [selfKind]);

  useEffect(
    () => () => {
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
    },
    [],
  );

  return { theirTyping, handleTypingBroadcast, registerChannel, notifyTyping };
}
