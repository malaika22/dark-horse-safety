import { Suspense } from "react";
import { WorkOrderFormPage } from "@/features/operations/work-order-form-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WorkOrderFormPage />
    </Suspense>
  );
}
