import { EmailAuthForm } from "@/components/auth/EmailAuthForm";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { GlowBorder } from "@/components/motion/GlowBorder";
import { upgradeGuestWithEmail } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * "Save my activity" prompt (BLUEPRINT.md §4.3) — only rendered for a
 * visitor who is currently a guest (`user.is_anonymous`). Renders nothing
 * for members/the owner, and nothing if there's somehow no session at all
 * yet (proxy.ts hasn't run, e.g. a static export edge case).
 */
export async function GuestUpgradeCard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.is_anonymous) return null;

  return (
    <GlowBorder tone="violet" className="w-full max-w-md p-6 text-left sm:p-8">
      <h2
        className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        Save your activity
      </h2>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        Add an email so your likes, follows, and messages aren&apos;t tied to just this browser.
      </p>

      <EmailAuthForm action={upgradeGuestWithEmail} submitLabel="Save" className="mt-5" />

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: "var(--border-subtle)" }} />
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          or
        </span>
        <div className="h-px flex-1" style={{ background: "var(--border-subtle)" }} />
      </div>

      <OAuthButtons mode="link" />
    </GlowBorder>
  );
}
