import { Suspense } from "react";
import { AccountLockedView } from "@/features/auth/components/account-locked-view";
import { AuthShell } from "@dark-horse-safety/ui";

export default function AccountLockedPage() {
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
      <AccountLockedView />
    </Suspense>
  );
}
