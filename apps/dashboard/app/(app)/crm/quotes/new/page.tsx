import { Suspense } from "react";
import { CreateQuotePage } from "@/features/crm/create-quote-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CreateQuotePage />
    </Suspense>
  );
}
