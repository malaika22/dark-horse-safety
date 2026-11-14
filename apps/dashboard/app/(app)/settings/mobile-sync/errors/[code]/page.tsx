import { MobileSyncErrorPage } from "@/features/settings/mobile-sync-error-page";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <MobileSyncErrorPage code={code} />;
}
