import { RepairDetailPage } from "@/features/fleet/repair-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RepairDetailPage code={decodeURIComponent(id)} />;
}
