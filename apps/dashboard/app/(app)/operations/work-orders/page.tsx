import { Suspense } from "react";
import { WorkOrdersPage } from "@/features/operations/work-orders-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WorkOrdersPage />
    </Suspense>
  );
}
