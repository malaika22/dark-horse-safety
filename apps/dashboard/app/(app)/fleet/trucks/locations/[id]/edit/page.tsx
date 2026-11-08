import { LocationFormPage } from "@/features/fleet/location-form-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LocationFormPage id={id} />;
}