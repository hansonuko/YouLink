import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Shared landing point for every Supabase Auth redirect — magic-link
 * sign-in, guest-upgrade confirmation, and OAuth all resolve here with a
 * `code` to exchange for a session (PKCE flow). A Route Handler rather than
 * a Server Action, per CLAUDE.md's stated exception: the caller here is
 * Supabase/the OAuth provider, not a form in our own UI.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
