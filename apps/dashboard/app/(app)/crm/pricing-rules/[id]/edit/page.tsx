import { PricingRuleFormPage } from "@/features/crm/pricing-rule-form-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PricingRuleFormPage mode="edit" ruleId={id} />;
}
