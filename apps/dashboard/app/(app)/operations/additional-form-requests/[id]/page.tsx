import { AdditionalFormRequestDetailPage } from "@/features/operations/additional-form-request-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdditionalFormRequestDetailPage id={id} />;
}
