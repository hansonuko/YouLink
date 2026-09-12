"use server";

import { createRateLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export type ShareChannel = "copy_link" | "x" | "linkedin" | "whatsapp" | "email" | "native";

const SHARE_CHANNELS: readonly ShareChannel[] = [
  "copy_link",
  "x",
  "linkedin",
  "whatsapp",
  "email",
  "native",
];

// Same order of magnitude as Like/Follow — a guest-writable single-row log.
const shareRateLimiter = createRateLimiter("share", 30, "1 m");

export interface LogShareResult {
  shareCount: number;
  error?: string;
}

/**
 * Logs a share attempt (BLUEPRINT.md §5 Share: "every open — not just
 * successful share — beyond 'copy link confirmed' logs a SHARES row").
 * The caller decides *when* that is per channel: ShareSheet logs
 * copy_link only once the clipboard write actually succeeds, but logs
 * every other channel the moment it's chosen (there's no way to observe
 * whether an opened X/LinkedIn/WhatsApp/email compose actually got sent).
 * RLS ("identity can log a share") enforces `auth.uid() = identity_id`;
 * the `on_share_change` trigger keeps `works.share_count` in sync.
 */
export async function logShare(workId: string, channel: ShareChannel): Promise<LogShareResult> {
  if (!SHARE_CHANNELS.includes(channel)) {
    return { shareCount: 0, error: "Invalid channel." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { shareCount: 0, error: "Not signed in." };
  }

  const { success } = await shareRateLimiter.limit(`user:${user.id}`);
  if (!success) {
    return { shareCount: 0, error: "Slow down a moment." };
  }

  const { error } = await supabase
    .from("shares")
    .insert({ identity_id: user.id, work_id: workId, channel });
  if (error) {
    console.error("[shares] log failed:", error.message);
    return { shareCount: 0, error: "Couldn't log share." };
  }

  const { data: work } = await supabase
    .from("works")
    .select("share_count")
    .eq("id", workId)
    .maybeSingle();
  const shareCount = work?.share_count ?? 0;

  const broadcastStatus = await supabase.channel(`work:${workId}`).send({
    type: "broadcast",
    event: "share_count",
    payload: { shareCount },
  });
  if (broadcastStatus !== "ok") {
    console.error("[shares] realtime broadcast failed:", broadcastStatus);
  }

  return { shareCount };
}
