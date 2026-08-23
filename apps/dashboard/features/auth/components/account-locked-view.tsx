"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  AccountLockedImage,
  AuthCard,
  AuthShell,
  Button,
} from "@dark-horse-safety/ui";

export function AccountLockedView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const minutes = Number(searchParams.get("minutes")) || 15;

  return (
    <AuthShell>
      <AuthCard
        title="Account locked"
        description={`Too many failed attempts. Your account is locked for ${minutes} minute${minutes === 1 ? "" : "s"}. Reset your password to regain access sooner.`}
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
