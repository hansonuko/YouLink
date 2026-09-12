"use client";

import { motion } from "framer-motion";

import type { ChatMessage } from "@/lib/data/chat";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { cn, formatRelativeTime } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
  /** Is this bubble the current viewer's own message — decides side +
   * color, not `senderKind` directly, since a guest and the owner each
   * see "their own" messages on the right. */
  isOwnMessage: boolean;
  /** Stagger index for the entrance animation (DESIGN_SYSTEM.md §5.3:
   * "message bubbles enter with 60ms stagger + spring") — only applied to
   * the initial batch, not every live-received message. */
  staggerIndex?: number;
}

export function MessageBubble({ message, isOwnMessage, staggerIndex }: MessageBubbleProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 15,
        delay: reducedMotion || staggerIndex === undefined ? 0 : staggerIndex * 0.06,
      }}
      className={cn("flex flex-col gap-1", isOwnMessage ? "items-end" : "items-start")}
    >
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap break-words rounded-[var(--radius-md)] px-3.5 py-2 text-sm",
          isOwnMessage ? "rounded-br-sm text-white" : "rounded-bl-sm",
        )}
        style={{
          background: isOwnMessage ? "var(--aurora)" : "var(--bg-surface)",
          color: isOwnMessage ? "white" : "var(--text-primary)",
        }}
      >
        {message.body}
      </div>
      <span className="px-1 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
        {formatRelativeTime(message.createdAt)}
      </span>
    </motion.div>
  );
}
