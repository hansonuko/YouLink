import { z } from "zod";

// Matches the messages table's own check constraint (Phase 1 migration:
// char_length(body) between 1 and 4000) — validated here too so a client
// gets a friendly error instead of a raw DB constraint violation.
export const messageFormSchema = z.object({
  body: z.string().trim().min(1, "Type a message first.").max(4000, "Keep it under 4000 characters."),
});

export type MessageFormInput = z.infer<typeof messageFormSchema>;
