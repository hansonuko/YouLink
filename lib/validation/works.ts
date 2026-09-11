import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const workMediaSchema = z.object({
  url: z.string().url(),
  type: z.string().min(1),
  width: z.number().optional(),
  height: z.number().optional(),
  alt: z.string().optional(),
});

export const workFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(96)
    .regex(slugPattern, "Use lowercase letters, numbers, and hyphens only."),
  summary: z.string().trim().max(280, "Keep the summary under 280 characters.").optional().or(z.literal("")),
  bodyMd: z.string().max(20000).optional().or(z.literal("")),
  externalUrl: z.string().trim().url("Enter a valid URL.").optional().or(z.literal("")),
  status: z.enum(["draft", "published", "archived"]),
  media: z.array(workMediaSchema).max(12, "12 media items max."),
});

export type WorkFormInput = z.infer<typeof workFormSchema>;
