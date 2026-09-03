import { Suspense } from "react";
import { LocationFormPage } from "@/features/crm/location-form-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LocationFormPage />
    </Suspense>
  );
}
