import { AssetMovePage } from "@/features/fleet/asset-move-page";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <AssetMovePage code={decodeURIComponent(code)} />;
}
