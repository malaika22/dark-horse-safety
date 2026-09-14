import { CardReconciliationPage } from "@/features/crm/card-reconciliation-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CardReconciliationPage customerId={id} />;
}
