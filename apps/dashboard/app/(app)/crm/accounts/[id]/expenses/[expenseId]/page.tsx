import { Suspense } from "react";
import { ExpenseFormPage } from "@/features/crm/expense-form-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; expenseId: string }>;
}) {
  const { id, expenseId } = await params;
  return (
    <Suspense fallback={null}>
      <ExpenseFormPage customerId={id} expenseId={expenseId} mode="edit" />
    </Suspense>
  );
}
