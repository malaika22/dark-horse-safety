import { LocationFormPage } from "@/features/crm/location-form-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LocationFormPage mode="edit" locationId={id} />;
}
