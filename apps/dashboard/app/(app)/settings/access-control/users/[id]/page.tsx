import { AccessUserFormPage } from "@/features/settings/access-user-form-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AccessUserFormPage userId={id} />;
}
