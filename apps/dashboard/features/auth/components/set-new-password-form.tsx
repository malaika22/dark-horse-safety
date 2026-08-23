"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthCard,
  AuthFooter,
  AuthShell,
  Button,
  PasswordInput,
} from "@dark-horse-safety/ui";
import { ApiError } from "@dark-horse-safety/api-client";
import { api } from "@/lib/api";
import {
  firstFieldError,
  getApiFieldError,
  mapApiValidationError,
  validatePassword,
  validatePasswordConfirm,
  validateToken,
} from "@/lib/auth-validation";

type FieldErrors = {
  password?: string;
  confirmPassword?: string;
  token?: string;
};

export function SetNewPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const tokenError = fieldErrors.token ?? validateToken(token) ?? undefined;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors: FieldErrors = {
      token: validateToken(token) ?? undefined,
      password: validatePassword(password) ?? undefined,
      confirmPassword: validatePasswordConfirm(password, confirm) ?? undefined,
    };
    setFieldErrors(nextErrors);
    if (firstFieldError(nextErrors)) return;

    setLoading(true);
    try {
      await api.resetPassword({
        token,
        password,
        confirmPassword: confirm,
      });
      router.push("/password-updated");
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setFieldErrors({
          password: getApiFieldError(err.details, "password"),
          confirmPassword: getApiFieldError(err.details, "confirmPassword"),
          token: getApiFieldError(err.details, "token"),
        });
      }
      setFormError(mapApiValidationError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title="Set new password"
        description="Choose a strong password for your account."
        footer={
          <AuthFooter showSupportCopy={false}>
            <p>
              This reset link will expire after use. You&apos;ll be redirected
              to sign in.
            </p>
          </AuthFooter>
        }
      >
        {tokenError || formError ? (
          <p className="text-xs uppercase tracking-[0.08em] text-error">
            {tokenError ?? formError}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            error={fieldErrors.password}
          />
          <PasswordInput
            label="Confirm new password"
            autoComplete="new-password"
            placeholder="Re-enter new password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (fieldErrors.confirmPassword) {
                setFieldErrors((prev) => ({
                  ...prev,
                  confirmPassword: undefined,
                }));
              }
            }}
            error={fieldErrors.confirmPassword}
          />
          <Button type="submit" className="mt-1" disabled={loading || !!tokenError}>
            {loading ? "Updating…" : "Update password"}
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
