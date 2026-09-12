import type { SupabaseClient } from "@supabase/supabase-js";

import { getOwnerProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";

export type SenderKind = "owner" | "identity";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderKind: SenderKind;
  senderIdentityId: string | null;
  body: string;
  readByOwner: boolean;
  readByVisitor: boolean;
  createdAt: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_kind: SenderKind;
  sender_identity_id: string | null;
  body: string;
  read_by_owner: boolean;
  read_by_visitor: boolean;
  created_at: string;
}

function mapMessageRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderKind: row.sender_kind,
    senderIdentityId: row.sender_identity_id,
    body: row.body,
    readByOwner: row.read_by_owner,
    readByVisitor: row.read_by_visitor,
    createdAt: row.created_at,
  };
}

const MESSAGE_COLUMNS =
  "id, conversation_id, sender_kind, sender_identity_id, body, read_by_owner, read_by_visitor, created_at";

/**
 * The current guest/member's own conversation with the single site owner
 * (BLUEPRINT.md §5 Chat: one conversation per identity, unique(owner_id,
 * identity_id) from the Phase 1 migration). Returns null if they haven't
 * sent a first message yet — `ChatDock` treats that as "no history," not
 * an error.
 */
export async function getMyConversation(): Promise<{ conversationId: string; messages: ChatMessage[] } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const owner = await getOwnerProfile();
  if (!owner) return null;

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("identity_id", user.id)
    .eq("owner_id", owner.id)
    .maybeSingle();

  if (error) {
    console.error("[chat] failed to load own conversation:", error.message);
    return null;
  }
  if (!conversation) return null;

  const messages = await getMessages(supabase, conversation.id);
  return { conversationId: conversation.id, messages };
}

async function getMessages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the generated Database type isn't wired up yet (no `supabase gen types` on this platform, see BUILD_PHASES.md)
  supabase: SupabaseClient<any>,
  conversationId: string,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[chat] failed to load messages:", error.message);
    return [];
  }
  return data.map(mapMessageRow);
}

/** For the dashboard inbox's open thread view — RLS ("participants can
 * read messages") is what actually enforces that only a participant can
 * call this usefully. */
export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  return getMessages(supabase, conversationId);
}

export interface InboxConversation {
  id: string;
  identityId: string;
  visitorDisplayName: string;
  visitorAvatarUrl: string | null;
  status: "open" | "archived";
  lastMessageAt: string | null;
  unreadCount: number;
  blocked: boolean;
}

/**
 * Every conversation the owner has, unread-first (BUILD_PHASES.md Phase 4:
 * "unread-first"). Joins directly to `identities` for the visitor's
 * display name/avatar — safe here (unlike comments' public listing) because
 * the owner having an open conversation with that identity is exactly the
 * exception identities' own "identity can read its own row" RLS policy
 * (Phase 1 migration) already carves out.
 */
export async function getOwnerInbox(): Promise<InboxConversation[]> {
  const supabase = await createClient();

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(
      "id, identity_id, status, last_message_at, identities(display_name, avatar_url, blocked_at)",
    )
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[chat] failed to load owner inbox:", error.message);
    return [];
  }
  if (conversations.length === 0) return [];

  const ids = conversations.map((c) => c.id);
  const { data: unread, error: unreadError } = await supabase
    .from("messages")
    .select("conversation_id")
    .eq("read_by_owner", false)
    .in("conversation_id", ids);

  if (unreadError) {
    console.error("[chat] failed to load unread counts:", unreadError.message);
  }

  const unreadCounts = new Map<string, number>();
  for (const row of unread ?? []) {
    unreadCounts.set(row.conversation_id, (unreadCounts.get(row.conversation_id) ?? 0) + 1);
  }

  return conversations
    .map((c) => {
      // Supabase's JS client types an embedded to-one relation as an array;
      // it's always exactly one row here (identity_id is not null, and
      // every identity has exactly one row per the on_auth_user_created
      // trigger).
      const identity = (Array.isArray(c.identities) ? c.identities[0] : c.identities) as {
        display_name: string;
        avatar_url: string | null;
        blocked_at: string | null;
      } | null;

      return {
        id: c.id,
        identityId: c.identity_id,
        visitorDisplayName: identity?.display_name ?? "Guest",
        visitorAvatarUrl: identity?.avatar_url ?? null,
        status: c.status as "open" | "archived",
        lastMessageAt: c.last_message_at,
        unreadCount: unreadCounts.get(c.id) ?? 0,
        blocked: Boolean(identity?.blocked_at),
      };
    })
    .sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return 0; // already ordered by last_message_at desc from the query
    });
}
