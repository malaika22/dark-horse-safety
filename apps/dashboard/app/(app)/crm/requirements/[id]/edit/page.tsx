import { RequirementFormPage } from "@/features/crm/requirement-form-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RequirementFormPage mode="edit" requirementId={id} />;
}
