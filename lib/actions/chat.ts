"use server";

import { requireGuestWriteVerified } from "@/lib/actions/turnstile";
import type { ChatMessage } from "@/lib/data/chat";
import { getConversationMessages, getMyConversation, getOwnerInbox } from "@/lib/data/chat";
import { getOwnerProfile } from "@/lib/data/profile";
import { looksLikeSpam } from "@/lib/moderation";
import { createRateLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { messageFormSchema } from "@/lib/validation/chat";

// BLUEPRINT.md §6 Chat abuse guard: "Upstash rate limit (10 msgs/min/identity)."
const chatRateLimiter = createRateLimiter("chat", 10, "1 m");

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface SendMessageResult {
  message: ChatMessage | null;
  error?: string;
}

function mapInsertedRow(data: {
  id: string;
  conversation_id: string;
  sender_kind: "owner" | "identity";
  sender_identity_id: string | null;
  body: string;
  read_by_owner: boolean;
  read_by_visitor: boolean;
  created_at: string;
}): ChatMessage {
  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderKind: data.sender_kind,
    senderIdentityId: data.sender_identity_id,
    body: data.body,
    readByOwner: data.read_by_owner,
    readByVisitor: data.read_by_visitor,
    createdAt: data.created_at,
  };
}

async function broadcastMessage(supabase: ServerSupabaseClient, conversationId: string, message: ChatMessage) {
  const status = await supabase
    .channel(`conversation:${conversationId}`)
    .send({ type: "broadcast", event: "message_new", payload: { message } });
  if (status !== "ok") {
    console.error("[chat] realtime broadcast failed:", status);
  }
}

/**
 * `lib/data/chat.ts` isn't a Server Action module, so `ChatDock`/
 * `ChatLauncher` (client components, lazy-loaded per BUILD_PHASES.md
 * Phase 4) can't call `getMyConversation` directly the way a Server
 * Component would — this is the thin RPC-callable wrapper they use instead.
 */
export async function fetchMyConversation() {
  return getMyConversation();
}

/** Same RPC-wrapper reasoning as `fetchMyConversation`, for the dashboard
 * inbox's conversation list. */
export async function fetchOwnerInbox() {
  return getOwnerInbox();
}

/** Same RPC-wrapper reasoning, for the inbox's open-thread view. */
export async function fetchConversationMessages(conversationId: string) {
  return getConversationMessages(conversationId);
}

/**
 * Send a message as the current guest/member identity to the single site
 * owner — BLUEPRINT.md §5: "First message from a fresh identity
 * auto-creates a CONVERSATIONS row." Guest-writable, so it goes through
 * the same rate-limit + Turnstile + spam-heuristic gate as Like/Follow/
 * Share/Comment before ever touching the DB; RLS ("identity can open a
 * conversation with the owner" / "participants can send messages as
 * themselves") is what actually enforces the identity boundary.
 */
export async function sendGuestMessage(body: string): Promise<SendMessageResult> {
  const parsed = messageFormSchema.safeParse({ body });
  if (!parsed.success) {
    return { message: null, error: parsed.error.issues[0]?.message ?? "Invalid message." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { message: null, error: "Not signed in." };
  }

  const { success } = await chatRateLimiter.limit(`user:${user.id}`);
  if (!success) {
    return { message: null, error: "Too many messages — slow down a moment." };
  }

  const verified = await requireGuestWriteVerified(supabase, user.id);
  if (!verified.ok) {
    return { message: null, error: verified.error };
  }

  const { data: identity } = await supabase
    .from("identities")
    .select("blocked_at")
    .eq("id", user.id)
    .maybeSingle();
  if (identity?.blocked_at) {
    // Soft ban (BLUEPRINT.md §6) — a clean error here, RLS is the real
    // backstop if this check is ever bypassed.
    return { message: null, error: "Couldn't send message." };
  }

  if (looksLikeSpam(parsed.data.body)) {
    return { message: null, error: "That looks like spam — try rewording it." };
  }

  const owner = await getOwnerProfile();
  if (!owner) {
    return { message: null, error: "No one to message yet." };
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("identity_id", user.id)
    .eq("owner_id", owner.id)
    .maybeSingle();

  let conversationId: string;
  if (existing) {
    conversationId = existing.id;
  } else {
    const { data: created, error: createError } = await supabase
      .from("conversations")
      .insert({ identity_id: user.id, owner_id: owner.id })
      .select("id")
      .single();
    if (createError || !created) {
      console.error("[chat] failed to open conversation:", createError?.message);
      return { message: null, error: "Couldn't start conversation. Try again." };
    }
    conversationId = created.id;
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_kind: "identity",
      sender_identity_id: user.id,
      body: parsed.data.body,
      read_by_visitor: true,
      read_by_owner: false,
    })
    .select("id, conversation_id, sender_kind, sender_identity_id, body, read_by_owner, read_by_visitor, created_at")
    .single();

  if (error || !data) {
    console.error("[chat] guest message insert failed:", error?.message);
    return { message: null, error: "Couldn't send message. Try again." };
  }

  const message = mapInsertedRow(data);
  await broadcastMessage(supabase, conversationId, message);

  // Separate from the per-conversation channel above — this is what lets
  // the owner's inbox *list* (which may not have this thread open) show a
  // new/updated conversation live, not just an already-open thread.
  const inboxStatus = await supabase
    .channel(`inbox:${owner.id}`)
    .send({ type: "broadcast", event: "inbox_update", payload: { conversationId } });
  if (inboxStatus !== "ok") {
    console.error("[chat] inbox broadcast failed:", inboxStatus);
  }

  return { message };
}

/**
 * Owner reply into an existing conversation — not guest-writable, so no
 * rate limit or Turnstile gate (same reasoning as every other action's
 * owner-authored path). RLS's own owner branch of "participants can send
 * messages as themselves" enforces that this only works on a conversation
 * this owner actually owns.
 */
export async function sendOwnerReply(conversationId: string, body: string): Promise<SendMessageResult> {
  const parsed = messageFormSchema.safeParse({ body });
  if (!parsed.success) {
    return { message: null, error: parsed.error.issues[0]?.message ?? "Invalid message." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { message: null, error: "Not signed in." };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_kind: "owner",
      sender_identity_id: null,
      body: parsed.data.body,
      read_by_owner: true,
      read_by_visitor: false,
    })
    .select("id, conversation_id, sender_kind, sender_identity_id, body, read_by_owner, read_by_visitor, created_at")
    .single();

  if (error || !data) {
    console.error("[chat] owner reply insert failed:", error?.message);
    return { message: null, error: "Couldn't send reply. Try again." };
  }

  const message = mapInsertedRow(data);
  await broadcastMessage(supabase, conversationId, message);

  return { message };
}

/**
 * Marks the caller's own side of a conversation as read — RLS
 * ("participants can update read receipts") enforces that only a
 * participant can call this at all; this just decides which of
 * read_by_owner/read_by_visitor is theirs to flip.
 */
export async function markConversationRead(conversationId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: conversation } = await supabase
    .from("conversations")
    .select("owner_id, identity_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return { error: "Conversation not found." };

  const field = user.id === conversation.owner_id ? "read_by_owner" : user.id === conversation.identity_id ? "read_by_visitor" : null;
  if (!field) return { error: "Not a participant." };

  const { error } = await supabase
    .from("messages")
    .update({ [field]: true })
    .eq("conversation_id", conversationId)
    .eq(field, false);
  if (error) {
    console.error("[chat] failed to mark read:", error.message);
    return { error: "Couldn't mark as read." };
  }
  return {};
}

/**
 * Owner-only soft ban toggle (BLUEPRINT.md §6: "owner can block an
 * identity_id — writes silently no-op"). RLS's new "owner can moderate an
 * identity" policy is what actually allows this update to a row the
 * caller doesn't own; this just checks they're the owner before trying.
 */
export async function setIdentityBlocked(identityId: string, blocked: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: ownerRow } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!ownerRow) return { error: "Owner only." };

  const { error } = await supabase
    .from("identities")
    .update({ blocked_at: blocked ? new Date().toISOString() : null })
    .eq("id", identityId);
  if (error) {
    console.error("[chat] failed to update block state:", error.message);
    return { error: "Couldn't update." };
  }
  return {};
}
