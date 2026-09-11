import { z } from "zod";

export const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .max(320, "That email is too long.")
    .email("Enter a valid email address."),
});

export type EmailInput = z.infer<typeof emailSchema>;

export const oauthProviderSchema = z.enum(["google", "github"]);

export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
