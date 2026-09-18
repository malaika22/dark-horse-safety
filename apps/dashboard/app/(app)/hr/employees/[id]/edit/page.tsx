import { EditEmployeePage } from "@/features/hr/edit-employee-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditEmployeePage employeeId={id} />;
}
