import type { Metadata } from "next";

import { InboxView } from "@/components/dashboard/InboxView";
import { getOwnerInbox } from "@/lib/data/chat";
import { getOwnerProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Inbox" };

/**
 * Owner inbox — BUILD_PHASES.md Phase 4, item 3: "unread-first, reply from
 * same UI." The heavy lifting (message list, Realtime, composer) lives in
 * `InboxView` (client); this just supplies the initial data so the page
 * isn't empty before the client subscription kicks in.
 */
export default async function InboxPage() {
  const [conversations, owner] = await Promise.all([getOwnerInbox(), getOwnerProfile()]);

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        Inbox
      </h1>
      {owner && <InboxView initialConversations={conversations} ownerId={owner.id} />}
    </div>
  );
}
