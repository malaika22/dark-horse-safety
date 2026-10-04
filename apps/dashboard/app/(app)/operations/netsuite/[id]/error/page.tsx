import { NetsuiteErrorDetailPage } from "@/features/operations/netsuite-error-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NetsuiteErrorDetailPage id={id} />;
}
