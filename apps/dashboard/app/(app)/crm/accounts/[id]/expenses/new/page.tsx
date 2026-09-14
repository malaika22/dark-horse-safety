import { redirect } from "next/navigation";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ activityId?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const q = new URLSearchParams({ new: "1" });
  if (sp.activityId) q.set("activityId", sp.activityId);
  redirect(`/crm/accounts/${id}/expenses?${q.toString()}`);
}
