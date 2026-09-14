import { WorkOrderDetailPage } from "@/features/operations/work-order-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkOrderDetailPage workOrderId={id} />;
}
