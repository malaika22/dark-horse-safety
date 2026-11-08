import { Suspense } from "react";
import { InspectionAddPage } from "@/features/fleet/inspection-add-page";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 font-sans text-[13px] uppercase text-[#959597]">Loading…</p>}>
      <InspectionAddPage />
    </Suspense>
  );
}
