import { ContactFormPage } from "@/features/crm/contact-form-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContactFormPage mode="edit" contactId={id} />;
}
