"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { getVerificationStatus, verifyTurnstile } from "@/lib/actions/turnstile";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          size?: "invisible" | "normal" | "compact";
          callback?: (token: string) => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

/**
 * BLUEPRINT.md §6 — Turnstile "on the first guest write of a session, to
 * block bot floods without adding friction for humans." Mounted once near
 * the root layout: checks whether the current identity still needs to
 * clear the challenge, and if so, quietly runs Cloudflare's invisible
 * widget in the background — no visible UI for a legitimate visitor in the
 * common case. `requireGuestWriteVerified` (lib/actions/turnstile.ts) is
 * the actual enforcement; this component only exists to get a real
 * identity verified *before* they hit that wall on their first like/
 * follow/share/comment, not after.
 */
export function TurnstileGate() {
  const [needsVerification, setNeedsVerification] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVerificationStatus().then((status) => {
      if (!cancelled) setNeedsVerification(status.needsVerification);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!needsVerification || !siteKey) return null;

  function renderWidget() {
    if (!containerRef.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey!,
      size: "invisible",
      callback: (token) => {
        // Remove the widget ourselves before the state update below
        // unmounts its container — otherwise Turnstile's own internal
        // cleanup fires against an already-removed node and logs a
        // "Cannot find Widget" warning (harmless, but avoidable).
        if (widgetId.current) {
          window.turnstile?.remove(widgetId.current);
          widgetId.current = null;
        }
        void verifyTurnstile(token).then((result) => {
          if (result.verified) setNeedsVerification(false);
        });
      },
      "error-callback": () => {
        // Fails open at the enforcement layer (requireGuestWriteVerified
        // only blocks once TURNSTILE_SECRET_KEY is set and the identity is
        // still unverified) — a transient widget error shouldn't trap a
        // real visitor, it just means their next write gets one retry
        // prompt instead of sailing through silently verified.
        console.warn("[turnstile] widget error");
      },
    });
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
        onReady={renderWidget}
      />
      <div ref={containerRef} aria-hidden />
    </>
  );
}
