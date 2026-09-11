import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// BLUEPRINT.md §4.1 — guest identity survives a full year, not just the browser
// session, so a returning visitor's likes/follows/chat history are still theirs.
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Guest identity bootstrap, run on every request that isn't a static asset
 * (see the matcher in middleware.ts). Refreshes an existing Supabase session,
 * or — if there is no session at all — silently mints a real anonymous-auth
 * user (BLUEPRINT.md §4.1). The `identities` mirror row is populated by the
 * `on_auth_user_created` DB trigger (see supabase/migrations/), not here.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              maxAge: GUEST_COOKIE_MAX_AGE,
            }),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() re-validates against Supabase Auth on every call — it's
  // what actually refreshes the session cookies via setAll above. Don't swap this
  // for getSession(), which only reads the local (possibly stale) JWT.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      // Fails open: the visitor still gets the page, just without a guest
      // identity yet — likes/follows/chat will prompt sign-in again next action
      // rather than the whole site 500ing on an Auth outage.
      console.error("[guest-identity] anonymous sign-in failed:", error.message);
    }
  }

  return supabaseResponse;
}
