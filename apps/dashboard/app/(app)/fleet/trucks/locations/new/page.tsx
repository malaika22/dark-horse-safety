import { Suspense } from "react";
import { LocationFormPage } from "@/features/fleet/location-form-page";

export default function Page() {
  return (
    <Suspense>
      <LocationFormPage />
    </Suspense>
  );
}
