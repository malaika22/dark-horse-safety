import { Suspense } from "react";
import { EmployeeDetailPage } from "@/features/hr/employee-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <EmployeeDetailPage employeeId={id} />
    </Suspense>
  );
}
