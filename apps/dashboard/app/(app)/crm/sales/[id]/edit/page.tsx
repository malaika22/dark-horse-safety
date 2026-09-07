import { LogActivityFormPage } from "@/features/crm/log-activity-form-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LogActivityFormPage mode="edit" activityId={id} />;
}
