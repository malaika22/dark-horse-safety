"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AuthCard,
  AuthFooter,
  AuthShell,
  Button,
} from "@dark-horse-safety/ui";
import { api } from "@/lib/api";
import { validateEmail } from "@/lib/auth-validation";
import { toastApiError, toastSuccess } from "@/lib/toast";

export function CheckInboxView({ email }: { email: string }) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = React.useState(66);
  const [cooldown, setCooldown] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const mm = String(Math.floor(Math.max(secondsLeft, 0) / 60)).padStart(2, "0");
  const ss = String(Math.max(secondsLeft, 0) % 60).padStart(2, "0");

  const onResend = async () => {
    const emailError = validateEmail(email);
    if (emailError || cooldown > 0) {
      toastApiError(emailError ?? "Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.resendReset({ email: email.trim() });
      setCooldown(30);
      setSecondsLeft(res.data.expiresInSeconds || 66);
      toastSuccess(
        res.data.message || "Password reset email resent successfully.",
      );
    } catch (err) {
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title="Check your inbox"
        descriptionClassName="auth-inbox-description"
        className="h-fit"
        bodyClassName="flex-none justify-center py-8 sm:py-10"
        brandClassName="mb-3 sm:mb-4"
        headerClassName="mb-4 sm:mb-5"
        contentClassName="items-center gap-3"
        footerClassName="mt-4"
        dividerClassName="mb-3 sm:mb-3"
        description={
          <>
            A password reset link has been sent to{" "}
            <span className="auth-inbox-description-emphasis">
              {email || "your email"}
            </span>
            . Open the email and click the link to reset your password.
          </>
        }
        footer={
          <AuthFooter showSupportCopy={false}>
            <p>
              Reset link sent. The link{" "}
              <span className="auth-footer-emphasis">
                expires in {mm}:{ss}
              </span>
            </p>
          </AuthFooter>
        }
      >
        <div className="auth-inbox-help-box w-full">
          <p className="auth-inbox-help-heading">
            Didn&apos;t receive the email?
          </p>
          <p className="auth-inbox-help-body">
            Check your spam folder, or wait a minute and try again. If the
            issue persists, contact your administrator.
          </p>
        </div>

        <div className="flex w-full gap-3">
          <Button
            type="button"
            variant="glass"
            onClick={() => router.push("/")}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            type="button"
            disabled={cooldown > 0 || loading || !email}
            onClick={onResend}
            className="flex-1"
          >
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : loading
                ? "Sending…"
                : "Resend email"}
          </Button>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
