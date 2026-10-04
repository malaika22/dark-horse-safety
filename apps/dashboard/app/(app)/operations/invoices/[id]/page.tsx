import { InvoicePreviewPage } from "@/features/operations/invoice-preview-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvoicePreviewPage ticketId={id} />;
}
