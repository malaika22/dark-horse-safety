import { Suspense } from "react";
import { SetNewPasswordForm } from "@/features/auth/components/set-new-password-form";
import { AuthShell } from "@dark-horse-safety/ui";

export default function SetNewPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p className="text-center text-xs uppercase tracking-[0.08em] text-foreground-muted">
            Loading…
          </p>
        </AuthShell>
      }
    >
      <SetNewPasswordForm />
    </Suspense>
  );
}
