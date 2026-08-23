"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthCard,
  AuthShell,
  Button,
  PasswordInput,
} from "@dark-horse-safety/ui";
import { ApiError } from "@dark-horse-safety/api-client";
import { api, setAccessToken } from "@/lib/api";
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

export function AcceptInviteForm({
  inviter: inviterProp,
  role: roleProp,
  email: emailProp,
}: {
  inviter?: string;
  role?: string;
  email?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [email, setEmail] = React.useState(
    emailProp ?? searchParams.get("email") ?? "",
  );
  const [inviter, setInviter] = React.useState(
    inviterProp ?? "your administrator",
  );
  const [role, setRole] = React.useState(roleProp ?? "member");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const tokenValidationError = validateToken(token);

  React.useEffect(() => {
    if (tokenValidationError) return;

    api
      .getInvite(token)
      .then((res) => {
        setEmail(res.data.email);
        setRole(res.data.role);
        if (res.data.inviterName) setInviter(res.data.inviterName);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.code === "INVITE_EXPIRED") {
          router.replace("/invite/expired");
          return;
        }
        setFormError(mapApiValidationError(err).message);
      });
  }, [token, tokenValidationError, router]);

  const tokenError = fieldErrors.token ?? tokenValidationError ?? undefined;

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
      const res = await api.acceptInvite({
        inviteToken: token,
        password,
        confirmPassword: confirm,
      });
      setAccessToken(res.data.tokens.accessToken);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.code === "INVITE_EXPIRED") {
        router.push("/invite/expired");
        return;
      }
      if (err instanceof ApiError && err.details) {
        setFieldErrors({
          password: getApiFieldError(err.details, "password"),
          confirmPassword: getApiFieldError(err.details, "confirmPassword"),
          token: getApiFieldError(err.details, "inviteToken"),
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
        title="Welcome to Dark Horse Safety"
        titleClassName="whitespace-nowrap text-[clamp(16px,4.2vw,24px)]"
        description={`You've been invited by ${inviter} as ${role}. Set a password to activate your account.`}
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

          <p className="pt-1 text-center text-xs font-semibold uppercase tracking-[0.08em] text-foreground-muted">
            {email}
          </p>

          <Button type="submit" disabled={loading || !!tokenError}>
            {loading ? "Activating…" : "Activate account"}
          </Button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
