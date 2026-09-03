import { EodReportDetailPage } from "@/features/crm/eod-report-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EodReportDetailPage reportId={id} />;
}
