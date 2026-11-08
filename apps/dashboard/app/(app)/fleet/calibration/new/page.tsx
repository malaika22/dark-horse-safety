import { Suspense } from "react";
import { CalibrationFormPage } from "@/features/fleet/calibration-form-page";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 font-sans text-[13px] uppercase text-[#959597]">Loading…</p>}>
      <CalibrationFormPage />
    </Suspense>
  );
}
