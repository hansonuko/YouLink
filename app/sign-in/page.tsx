import type { Metadata } from "next";

import { EmailAuthForm } from "@/components/auth/EmailAuthForm";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { GlowBorder } from "@/components/motion/GlowBorder";
import { Reveal } from "@/components/motion/Reveal";
import { signInWithMagicLink } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Returning-member sign-in (BUILD_PHASES.md Phase 1). Every visitor already
 * has an anonymous guest session (see proxy.ts) — this page is for
 * authenticating into an *existing* member account, not converting the
 * current guest in place (that's the "save my activity" upgrade prompt,
 * see components/auth/GuestUpgradeCard.tsx).
 */
export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--aurora)" }}
      />

      <Reveal className="relative z-10 w-full max-w-sm">
        <GlowBorder className="w-full p-6 sm:p-8">
          <h1
            className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Sign in
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            No password — we&apos;ll email you a link.
          </p>

          <EmailAuthForm
            action={signInWithMagicLink}
            submitLabel="Send link"
            className="mt-6"
          />

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: "var(--border-subtle)" }} />
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              or
            </span>
            <div className="h-px flex-1" style={{ background: "var(--border-subtle)" }} />
          </div>

          <OAuthButtons mode="sign-in" />
        </GlowBorder>
      </Reveal>
    </main>
  );
}
