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
  validateEmail,
} from "@/lib/auth-validation";
import { toastApiError, toastSuccess } from "@/lib/toast";

export function RequestInviteForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const error = validateEmail(email);
    setEmailError(error);
    if (firstFieldError({ email: error })) return;

    setLoading(true);
    try {
      const res = await api.resendInvite({ email: email.trim() });
      toastSuccess(
        res.data.message || "Invite resent. Check your email.",
      );
      router.push(`/invite/resent?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setEmailError(getApiFieldError(err.details, "email") ?? null);
      }

      try {
        const res = await api.requestInvite({ email: email.trim() });
        toastSuccess(
          res.data.message || "Invite request submitted successfully.",
        );
        router.push(`/invite/resent?email=${encodeURIComponent(email.trim())}`);
      } catch (fallbackErr) {
        toastApiError(fallbackErr);
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
