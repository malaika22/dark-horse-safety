import { Suspense } from "react";
import { AcceptInviteForm } from "@/features/auth/components/accept-invite-form";
import { AuthShell } from "@dark-horse-safety/ui";

type PageProps = {
  searchParams: Promise<{
    email?: string;
    inviter?: string;
    role?: string;
    token?: string;
  }>;
};

export default async function AcceptInvitePage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p className="text-center text-xs uppercase tracking-[0.08em] text-foreground-muted">
            Loading invite…
          </p>
        </AuthShell>
      }
    >
      <AcceptInviteForm
        email={params.email}
        inviter={params.inviter}
        role={params.role}
      />
    </Suspense>
  );
}
