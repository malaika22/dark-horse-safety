"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  AuthCard,
  AuthShell,
  Button,
  Divider,
  GoogleGlyph,
  Input,
  PasswordInput,
} from "@dark-horse-safety/ui";
import { ApiError } from "@dark-horse-safety/api-client";
import { api, setAccessToken } from "@/lib/api";
import { requestGoogleAuthCode } from "@/lib/google-auth";
import {
  firstFieldError,
  getApiFieldError,
  validateEmail,
  validateLoginPassword,
} from "@/lib/auth-validation";
import { toastApiError, toastSuccess } from "@/lib/toast";

type FieldErrors = {
  email?: string;
  password?: string;
};

function formatCredentialsError(err: ApiError) {
  const left =
    typeof err.attemptsLeft === "number" && Number.isFinite(err.attemptsLeft)
      ? err.attemptsLeft
      : null;

  if (left === null) {
    return err.message || "Incorrect email or password.";
  }

  // Prefer API message when it already includes the attempts count
  if (/\battempts?\s+left\b/i.test(err.message)) {
    return err.message;
  }

  if (left <= 0) {
    return err.message || "Incorrect email or password.";
  }

  return `Incorrect email or password. ${left} attempt${
    left === 1 ? "" : "s"
  } left.`;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [credError, setCredError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setCredError(null);

    const nextErrors: FieldErrors = {
      email: validateEmail(email) ?? undefined,
      password: validateLoginPassword(password) ?? undefined,
    };
    setFieldErrors(nextErrors);
    if (firstFieldError(nextErrors)) return;

    setLoading(true);

    try {
      const res = await api.login({
        email: email.trim(),
        password,
      });
      setAccessToken(res.data.tokens.accessToken);
      toastSuccess("Signed in successfully");
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "ACCOUNT_LOCKED" || err.status === 423) {
          toastApiError(err);
          router.push("/account-locked");
          return;
        }
        if (err.code === "VALIDATION_ERROR" && err.details) {
          setFieldErrors({
            email: getApiFieldError(err.details, "email"),
            password: getApiFieldError(err.details, "password"),
          });
          toastApiError(err);
          return;
        }

        const message = formatCredentialsError(err);
        setCredError(message);
      } else {
        toastApiError(err, "Unable to sign in. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setCredError(null);
    setGoogleLoading(true);
    try {
      const code = await requestGoogleAuthCode();
      const res = await api.loginWithGoogle({ code });
      setAccessToken(res.data.tokens.accessToken);
      toastSuccess("Signed in successfully");
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof Error) {
        toastApiError(err);
      } else {
        toastApiError(err, "Google sign-in failed. Try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title="Login to Dark Horse Force"
        description="Please sign in to your account below."
      >
        {credError ? <Alert>{credError}</Alert> : null}

        <Button
          type="button"
          variant="secondary"
          leftIcon={<GoogleGlyph />}
          onClick={onGoogle}
          disabled={loading || googleLoading}
        >
          {googleLoading ? "Connecting…" : "Login with Google"}
        </Button>

        <Divider label="Or continue with" />

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            error={fieldErrors.email}
          />

          <PasswordInput
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            error={fieldErrors.password}
            labelAction={
              <Link
                href="/reset-password"
                className="auth-forgot-link"
              >
                Forgot password
              </Link>
            }
          />

          <Button
            type="submit"
            className="mt-2"
            disabled={loading || googleLoading}
          >
            {loading ? "Signing in…" : "Login"}
          </Button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
