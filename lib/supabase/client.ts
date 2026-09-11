import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components. Never import this from server-only
 * code — it only ever holds the public anon key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
