"use client";

import { useRouter } from "next/navigation";
import {
  AccountLockedImage,
  AuthCard,
  AuthShell,
  Button,
} from "@dark-horse-safety/ui";

export function AccountLockedView() {
  const router = useRouter();

  return (
    <AuthShell>
      <AuthCard
        title="Account locked"
        description="Too many failed attempts. Your account is locked for 15 minutes. Reset your password to regain access sooner, or try again after the lock expires."
        icon={<AccountLockedImage size={56} />}
      >
        <Button type="button" onClick={() => router.push("/reset-password")}>
          Reset password
        </Button>
        <Button
          type="button"
          variant="glass"
          onClick={() => router.push("/")}
        >
          Back to sign in
        </Button>
      </AuthCard>
    </AuthShell>
  );
}
