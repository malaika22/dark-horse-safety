import { BillingReconciliationDetailPage } from "@/features/operations/billing-reconciliation-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BillingReconciliationDetailPage id={id} />;
}
