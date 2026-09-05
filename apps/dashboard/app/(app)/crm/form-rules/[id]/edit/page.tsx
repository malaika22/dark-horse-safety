import { FormRuleFormPage } from "@/features/crm/form-rule-form-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FormRuleFormPage mode="edit" ruleId={id} />;
}
