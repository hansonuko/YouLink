"use client";

import { Github } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getOAuthLinkUrl, getOAuthSignInUrl } from "@/lib/actions/auth";
import type { OAuthProvider } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.37l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.63l4.01 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

const PROVIDERS: { id: OAuthProvider; label: string; icon: React.ReactNode }[] = [
  { id: "google", label: "Continue with Google", icon: <GoogleIcon /> },
  { id: "github", label: "Continue with GitHub", icon: <Github className="size-4" /> },
];

interface OAuthButtonsProps {
  /** "sign-in" starts a fresh/returning session; "link" upgrades the current guest. */
  mode: "sign-in" | "link";
  className?: string;
}

/**
 * Google/GitHub buttons for both sign-in and guest-upgrade. Providers are
 * not yet enabled on the Supabase project (need real OAuth client
 * credentials configured first) — clicking surfaces that plainly instead of
 * pretending the button worked.
 */
export function OAuthButtons({ mode, className }: OAuthButtonsProps) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(provider: OAuthProvider) {
    setPending(provider);
    setError(null);
    const url =
      mode === "sign-in" ? await getOAuthSignInUrl(provider) : await getOAuthLinkUrl(provider);

    if (url) {
      window.location.assign(url);
      return;
    }
    setPending(null);
    setError("That sign-in method isn't set up yet — try email instead.");
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 sm:flex-row">
        {PROVIDERS.map((provider) => (
          <Button
            key={provider.id}
            type="button"
            variant="secondary"
            disabled={pending !== null}
            onClick={() => handleClick(provider.id)}
            className={cn("flex-1", pending === provider.id && "opacity-70")}
          >
            {provider.icon}
            {pending === provider.id ? "Redirecting…" : provider.label}
          </Button>
        ))}
      </div>
      {error && (
        <p role="status" className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
