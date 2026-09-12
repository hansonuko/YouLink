"use server";

import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

export interface VerificationStatus {
  /** True when the current identity still needs to pass the Turnstile
   * challenge before their next guest write. Always false for the owner —
   * BLUEPRINT.md §6 scopes this to guest writes, and the owner never hits
   * the four actions it gates (Like/Follow/Share/Comment on their own
   * single-owner site). */
  needsVerification: boolean;
}

/**
 * Whether the current identity has already passed Turnstile once. Read by
 * `TurnstileGate` on mount so the widget only ever renders for an identity
 * that hasn't cleared the challenge yet — BLUEPRINT.md §6: "on the first
 * guest write of a session," not on every write.
 */
export async function getVerificationStatus(): Promise<VerificationStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { needsVerification: false };

  const [{ data: identity }, { data: ownerRow }] = await Promise.all([
    supabase.from("identities").select("turnstile_verified_at").eq("id", user.id).maybeSingle(),
    supabase.from("profiles").select("id").eq("id", user.id).maybeSingle(),
  ]);

  if (ownerRow) return { needsVerification: false };
  return { needsVerification: !identity?.turnstile_verified_at };
}

export interface VerifyTurnstileResult {
  verified: boolean;
  error?: string;
}

/**
 * Verifies a Turnstile token against Cloudflare's siteverify API and, on
 * success, marks the current identity verified for good — this is the only
 * place `turnstile_verified_at` is ever written, and it only happens after
 * a real server-to-server check, never trusting the client's say-so.
 */
export async function verifyTurnstile(token: string): Promise<VerifyTurnstileResult> {
  if (!token || typeof token !== "string") {
    return { verified: false, error: "Missing verification token." };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Fails open, loudly — same posture as lib/rate-limit.ts when Upstash
    // isn't configured yet: a missing third-party credential shouldn't 500
    // every guest write, but it must not silently pretend to be secure.
    console.warn("[turnstile] TURNSTILE_SECRET_KEY not set — verification skipped, allowing unchecked.");
    return await markVerified();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { verified: false, error: "Not signed in." };
  }

  const h = await headers();
  const remoteip = h.get("x-forwarded-for")?.split(",")[0]?.trim();

  const body = new URLSearchParams({ secret, response: token });
  if (remoteip) body.set("remoteip", remoteip);

  let result: SiteverifyResponse;
  try {
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body });
    result = await res.json();
  } catch (err) {
    console.error("[turnstile] siteverify request failed:", err);
    return { verified: false, error: "Couldn't verify right now. Try again." };
  }

  if (!result.success) {
    console.warn("[turnstile] siteverify rejected token:", result["error-codes"]);
    return { verified: false, error: "Verification failed. Try again." };
  }

  return await markVerified();
}

/**
 * Called from every guest-writable Server Action (Like/Follow/Share/
 * Comment) right after its rate-limit check, before touching the DB.
 * Fails open when `TURNSTILE_SECRET_KEY` isn't configured yet — same
 * posture as `lib/rate-limit.ts` — but once it is, an identity that hasn't
 * cleared the challenge gets turned away here, not just soft-blocked in
 * the UI (a bot skipping `TurnstileGate` entirely would otherwise sail
 * straight through).
 */
export async function requireGuestWriteVerified(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.TURNSTILE_SECRET_KEY) return { ok: true };

  const { data: ownerRow } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (ownerRow) return { ok: true };

  const { data: identity } = await supabase
    .from("identities")
    .select("turnstile_verified_at")
    .eq("id", userId)
    .maybeSingle();

  if (!identity?.turnstile_verified_at) {
    return { ok: false, error: "Verification pending — give it a moment and try again." };
  }
  return { ok: true };
}

async function markVerified(): Promise<VerifyTurnstileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { verified: false, error: "Not signed in." };

  const { error } = await supabase
    .from("identities")
    .update({ turnstile_verified_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) {
    console.error("[turnstile] failed to record verification:", error.message);
    return { verified: false, error: "Couldn't save verification." };
  }
  return { verified: true };
}
