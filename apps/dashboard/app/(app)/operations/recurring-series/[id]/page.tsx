import { RecurringSeriesDetailPage } from "@/features/operations/recurring-series-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecurringSeriesDetailPage seriesId={id} />;
}
