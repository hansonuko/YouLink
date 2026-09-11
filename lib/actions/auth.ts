"use server";

import { headers } from "next/headers";

import { authRateLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, oauthProviderSchema, type OAuthProvider } from "@/lib/validation/auth";

export interface AuthActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Only a same-site relative path is safe to bounce back to after auth —
 * anything else (a full URL, protocol-relative "//evil.com") is an
 * open-redirect vector and gets dropped. */
function safeNextPath(next: FormDataEntryValue | null): string | null {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }
  return next;
}

/** Identity id when there's a session (guest or member), else a best-effort IP. */
async function rateLimitIdentifier() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return `user:${user.id}`;

  const h = await headers();
  return `ip:${h.get("x-forwarded-for") ?? "unknown"}`;
}

/**
 * Magic-link sign-in for a *returning* member (BUILD_PHASES.md Phase 1).
 * Distinct from `upgradeGuestWithEmail` below: this signs the browser into
 * an existing (or brand-new) member account rather than converting the
 * current anonymous session in place.
 */
export async function signInWithMagicLink(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const { success } = await authRateLimiter.limit(await rateLimitIdentifier());
  if (!success) {
    return { status: "error", message: "Too many attempts — try again in a few minutes." };
  }

  const next = safeNextPath(formData.get("next"));
  const callbackUrl = next
    ? `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`
    : `${siteUrl()}/auth/callback`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callbackUrl },
  });

  if (error) {
    console.error("[auth] signInWithOtp failed:", error.message);
    return {
      status: "error",
      message: error.message.toLowerCase().includes("rate limit")
        ? "Too many emails sent recently — try again in a bit."
        : "Couldn't send the sign-in link. Try again shortly.",
    };
  }

  return { status: "success", message: `Check ${parsed.data.email} for a sign-in link.` };
}

/**
 * Guest → member upgrade (BLUEPRINT.md §4.3). Converts the *current*
 * anonymous session in place — same identity id, so every like/follow/chat
 * message the guest already made stays theirs. `is_anonymous` flips to
 * false the moment they confirm the email; the `on_auth_user_upgraded` DB
 * trigger then flips `identities.kind` to 'member'.
 */
export async function upgradeGuestWithEmail(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const { success } = await authRateLimiter.limit(await rateLimitIdentifier());
  if (!success) {
    return { status: "error", message: "Too many attempts — try again in a few minutes." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.is_anonymous) {
    return { status: "error", message: "You're already signed in with an account." };
  }

  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo: `${siteUrl()}/auth/callback` },
  );

  if (error) {
    console.error("[auth] updateUser (guest upgrade) failed:", error.message);
    const msg = error.message.toLowerCase();
    return {
      status: "error",
      message: msg.includes("already been registered")
        ? "That email already has an account — sign in instead."
        : msg.includes("rate limit")
          ? "Too many emails sent recently — try again in a bit."
          : "Couldn't send the confirmation link. Try again shortly.",
    };
  }

  return { status: "success", message: `Confirm ${parsed.data.email} to save your activity.` };
}

/**
 * Fresh/returning sign-in via OAuth. Returns the provider's redirect URL for
 * the client to navigate to — a Server Action can't itself issue a
 * cross-origin redirect the way a Route Handler can.
 */
export async function getOAuthSignInUrl(provider: OAuthProvider): Promise<string | null> {
  const parsedProvider = oauthProviderSchema.parse(provider);

  const { success } = await authRateLimiter.limit(await rateLimitIdentifier());
  if (!success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: parsedProvider,
    options: { redirectTo: `${siteUrl()}/auth/callback`, skipBrowserRedirect: true },
  });

  if (error || !data.url) {
    console.error("[auth] signInWithOAuth failed:", error?.message);
    return null;
  }
  return data.url;
}

/**
 * Guest → member upgrade via OAuth (BLUEPRINT.md §4.3 alternative path):
 * links the provider identity to the *current* anonymous session instead of
 * creating a new user.
 */
export async function getOAuthLinkUrl(provider: OAuthProvider): Promise<string | null> {
  const parsedProvider = oauthProviderSchema.parse(provider);

  const { success } = await authRateLimiter.limit(await rateLimitIdentifier());
  if (!success) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.is_anonymous) return null;

  const { data, error } = await supabase.auth.linkIdentity({
    provider: parsedProvider,
    options: { redirectTo: `${siteUrl()}/auth/callback`, skipBrowserRedirect: true },
  });

  if (error || !data.url) {
    console.error("[auth] linkIdentity failed:", error?.message);
    return null;
  }
  return data.url;
}
