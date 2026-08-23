"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AuthCard,
  AuthFooter,
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

export function ResetPasswordForm() {
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
      await api.forgotPassword({ email: email.trim() });
      router.push(
        `/reset-password/check-inbox?email=${encodeURIComponent(email.trim())}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setEmailError(getApiFieldError(err.details, "email") ?? null);
      }
      setFormError(mapApiValidationError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title="Reset your password"
        description={
          <span className="whitespace-nowrap">
            Enter your work email and we&apos;ll send you a reset link.
          </span>
        }
        footer={
          <AuthFooter
            note="Reset links expire after 24 hours."
            showSupportCopy={false}
          />
        }
      >
        {formError ? <p className="text-xs uppercase tracking-[0.08em] text-error">{formError}</p> : null}

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
          <Button type="submit" className="mt-1" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
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
