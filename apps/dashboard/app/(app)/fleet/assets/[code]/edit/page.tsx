import { AssetEditPage } from "@/features/fleet/asset-edit-page";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <AssetEditPage code={decodeURIComponent(code)} />;
}
