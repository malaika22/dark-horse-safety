import { Suspense } from "react";
import { AccessPreviewPage } from "@/features/settings/access-preview-page";

export default function Page() {
  return (
    <Suspense>
      <AccessPreviewPage />
    </Suspense>
  );
}
