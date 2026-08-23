"use client";

import { useRouter } from "next/navigation";
import {
  AuthCard,
  AuthShell,
  Button,
  StatusIcon,
} from "@dark-horse-safety/ui";

export function InviteResentView({
  email = "jwhitfield@dhs.com",
}: {
  email?: string;
}) {
  const router = useRouter();

  return (
    <AuthShell>
      <AuthCard
        title="Invite resent"
        description={
          <>
            A new invite was sent to{" "}
            <span className="auth-description-emphasis">{email}</span>. It
            expires in 7 days.
          </>
        }
        icon={<StatusIcon variant="success" />}
      >
        <Button type="button" onClick={() => router.push("/")}>
          Done
        </Button>
      </AuthCard>
    </AuthShell>
  );
}
