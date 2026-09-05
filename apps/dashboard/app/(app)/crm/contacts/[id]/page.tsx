import { ContactDetailPage } from "@/features/crm/contact-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContactDetailPage contactId={id} />;
}
