import { Suspense } from "react";
import { LocationsPage } from "@/features/crm/locations-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LocationsPage />
    </Suspense>
  );
}
