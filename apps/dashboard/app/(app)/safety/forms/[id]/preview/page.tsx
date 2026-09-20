import { SafetyFormPrintPreviewPage } from "@/features/safety/safety-form-print-preview-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SafetyFormPrintPreviewPage formId={id} />;
}
