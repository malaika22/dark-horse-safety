"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@dark-horse-safety/ui";
import { setAccessToken } from "@/lib/api";
import { toastApiError, toastSuccess } from "@/lib/toast";

function GoogleCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("accessToken");
    if (token) {
      setAccessToken(token);
      toastSuccess("Signed in successfully");
      router.replace("/dashboard");
      return;
    }
    toastApiError("Google sign-in failed. Try again.");
    router.replace("/");
  }, [params, router]);

  return (
    <AuthShell>
      <p className="text-center text-xs uppercase tracking-[0.08em] text-foreground-muted">
        Completing Google sign in…
      </p>
    </AuthShell>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p className="text-center text-xs uppercase tracking-[0.08em] text-foreground-muted">
            Completing Google sign in…
          </p>
        </AuthShell>
      }
    >
      <GoogleCallbackInner />
    </Suspense>
  );
}
