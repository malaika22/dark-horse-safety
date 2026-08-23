import { InviteResentView } from "@/features/auth/components/invite-resent-view";

type PageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function InviteResentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <InviteResentView email={params.email} />;
}
