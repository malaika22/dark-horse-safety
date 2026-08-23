"use client";

import { useRouter } from "next/navigation";
import {
  AuthCard,
  AuthShell,
  Button,
  StatusIcon,
} from "@dark-horse-safety/ui";

export function InviteExpiredView() {
  const router = useRouter();

  return (
    <AuthShell>
      <AuthCard
        title="Invite expired"
        description="This invite link has expired. Ask your admin to resend the invite."
        icon={<StatusIcon variant="warning" />}
      >
        <Button
          type="button"
          onClick={() => router.push("/invite/request")}
        >
          Request new invite
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
