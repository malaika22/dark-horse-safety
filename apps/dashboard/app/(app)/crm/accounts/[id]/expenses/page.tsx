import { Suspense } from "react";
import { ExpensesListPage } from "@/features/crm/expenses-list-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <ExpensesListPage customerId={id} />
    </Suspense>
  );
}
