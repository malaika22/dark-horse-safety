"use client";

import { useRouter } from "next/navigation";
import {
  AuthCard,
  AuthShell,
  Button,
  StatusIcon,
} from "@dark-horse-safety/ui";

export function PasswordUpdatedView() {
  const router = useRouter();

  return (
    <AuthShell>
      <AuthCard
        title="Password updated"
        description="Your password has been changed. You can now sign in with your new password."
        icon={<StatusIcon variant="success" />}
      >
        <Button type="button" onClick={() => router.push("/")}>
          Continue to sign in
        </Button>
      </AuthCard>
    </AuthShell>
  );
}
