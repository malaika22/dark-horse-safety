import { CustomerFormPage } from "@/features/crm/customer-form-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerFormPage mode="edit" customerId={id} />;
}
