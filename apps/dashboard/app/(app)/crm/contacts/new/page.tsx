import { Suspense } from "react";
import { ContactFormPage } from "@/features/crm/contact-form-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ContactFormPage />
    </Suspense>
  );
}
