import { LocationDetailPage } from "@/features/fleet/location-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LocationDetailPage id={id} />;
}
