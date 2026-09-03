import { SalesActivityDetailPage } from "@/features/crm/sales-activity-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SalesActivityDetailPage activityId={id} />;
}
