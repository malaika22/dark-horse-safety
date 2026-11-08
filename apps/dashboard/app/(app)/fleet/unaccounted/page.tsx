import { Suspense } from "react";
import { UnaccountedPage } from "@/features/fleet/unaccounted-page";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 font-sans text-[13px] uppercase text-[#959597]">Loading…</p>}>
      <UnaccountedPage />
    </Suspense>
  );
}