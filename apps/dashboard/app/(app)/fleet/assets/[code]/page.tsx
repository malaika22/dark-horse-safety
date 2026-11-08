import { Suspense } from "react";
import { AssetDetailPage } from "@/features/fleet/asset-detail-page";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <Suspense fallback={<p className="p-6 font-sans text-[13px] uppercase text-[#959597]">Loading…</p>}>
      <AssetDetailPage code={decodeURIComponent(code)} />
    </Suspense>
  );
}
