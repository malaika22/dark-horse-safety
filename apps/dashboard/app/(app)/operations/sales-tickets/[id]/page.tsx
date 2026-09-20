import { SalesTicketDetailPage } from "@/features/operations/sales-ticket-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SalesTicketDetailPage ticketId={id} />;
}
