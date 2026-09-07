import { QuoteDetailPage } from "@/features/crm/quote-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuoteDetailPage quoteId={id} />;
}
