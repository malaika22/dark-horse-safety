"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AuthCard,
  AuthShell,
  Button,
  Input,
} from "@dark-horse-safety/ui";
import { ApiError } from "@dark-horse-safety/api-client";
import { api } from "@/lib/api";
import {
  firstFieldError,
  getApiFieldError,
  mapApiValidationError,
  validateEmail,
} from "@/lib/auth-validation";

export function RequestInviteForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const error = validateEmail(email);
    setEmailError(error);
    if (firstFieldError({ email: error })) return;

    setLoading(true);
    try {
      await api.resendInvite({ email: email.trim() });
      router.push(`/invite/resent?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setEmailError(getApiFieldError(err.details, "email") ?? null);
      }

      try {
        await api.requestInvite({ email: email.trim() });
        router.push(`/invite/resent?email=${encodeURIComponent(email.trim())}`);
      } catch (fallbackErr) {
        setFormError(mapApiValidationError(fallbackErr).message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title="Request new invite"
        description="Enter your work email and your administrator will receive a resend request."
      >
        {formError ? (
          <p className="text-xs uppercase tracking-[0.08em] text-error">
            {formError}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
              if (formError) setFormError(null);
            }}
            error={emailError ?? undefined}
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send request"}
          </Button>
          <Button
            type="button"
            variant="glass"
            onClick={() => router.push("/")}
            disabled={loading}
          >
            Back to sign in
          </Button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
