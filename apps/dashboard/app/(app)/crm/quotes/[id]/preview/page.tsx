import { QuotePreviewPage } from "@/features/crm/quote-preview-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuotePreviewPage quoteId={id} />;
}
