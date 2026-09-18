import { Suspense } from "react";
import { TimeEntryDetailPage } from "@/features/hr/time-entry-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <TimeEntryDetailPage entryId={id} />
    </Suspense>
  );
}
