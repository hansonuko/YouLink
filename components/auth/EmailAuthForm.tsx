"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthActionState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

interface EmailAuthFormProps {
  action: (prevState: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  submitLabel: string;
  placeholder?: string;
  className?: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="shrink-0">
      {pending ? "Sending…" : label}
    </Button>
  );
}

const initialState: AuthActionState = { status: "idle" };

/**
 * Shared email-entry form for both sign-in and guest-upgrade — same UI,
 * different Server Action passed in. Keeps the two flows visually and
 * behaviorally identical rather than duplicating form/pending-state logic.
 */
export function EmailAuthForm({
  action,
  submitLabel,
  placeholder = "you@example.com",
  className,
}: EmailAuthFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input type="email" name="email" required placeholder={placeholder} className="flex-1" />
        <SubmitButton label={submitLabel} />
      </div>
      {state.status !== "idle" && (
        <p
          role="status"
          className="text-sm"
          style={{ color: state.status === "error" ? "var(--color-red-500)" : "var(--color-teal-400)" }}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
