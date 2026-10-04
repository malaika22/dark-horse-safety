import { FormCorrectionDetailPage } from "@/features/operations/form-correction-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FormCorrectionDetailPage id={id} />;
}
