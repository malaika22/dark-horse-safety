"use client";

import { useParams } from "next/navigation";
import { CustomerOwnedFormPage } from "@/features/fleet/customer-owned-form-page";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <CustomerOwnedFormPage id={params.id} />;
}
