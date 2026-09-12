import { z } from "zod";

export const commentFormSchema = z.object({
  body: z.string().trim().min(1, "Say something first.").max(2000, "Keep it under 2000 characters."),
});

export type CommentFormInput = z.infer<typeof commentFormSchema>;
