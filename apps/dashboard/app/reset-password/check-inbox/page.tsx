import { CheckInboxView } from "@/features/auth/components/check-inbox-view";

type PageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function CheckInboxPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <CheckInboxView email={params.email ?? ""} />;
}
