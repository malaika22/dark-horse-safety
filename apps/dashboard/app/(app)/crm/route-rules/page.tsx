import Link from "next/link";
import { DashboardToolbarButton } from "@dark-horse-safety/ui";
import { ModulePlaceholder } from "@/features/app-shell/module-placeholder";
import { PlusIcon } from "@/features/crm/crm-list-page-shell";

export default function Page() {
  return (
    <div className="space-y-4 bg-shell p-3 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
          Route / GPS rules
        </h2>
        <Link href="/crm/route-rules/new" className="inline-flex shrink-0">
          <DashboardToolbarButton
            variant="primary"
            leftIcon={<PlusIcon className="shrink-0" />}
          >
            Add route rule
          </DashboardToolbarButton>
        </Link>
      </div>
      <ModulePlaceholder
        title="Route / GPS Rules"
        description="List view coming next. Use Add route rule to open the Figma form."
      />
    </div>
  );
}
