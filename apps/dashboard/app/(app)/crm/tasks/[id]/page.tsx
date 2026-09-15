import { TaskDetailPage } from "@/features/crm/task-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TaskDetailPage taskId={id} />;
}
