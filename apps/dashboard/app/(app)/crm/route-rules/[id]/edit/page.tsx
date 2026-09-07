import { RouteRuleFormPage } from "@/features/crm/route-rule-form-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RouteRuleFormPage mode="edit" ruleId={id} />;
}
