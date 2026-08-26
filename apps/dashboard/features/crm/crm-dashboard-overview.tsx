import {
  DashboardActivityRow,
  DashboardControlHeader,
  DashboardExceptionRow,
  DashboardFilterTabs,
  DashboardFooterButton,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
} from "@dark-horse-safety/ui";
import {
  CRM_ACTIVITY,
  CRM_ACTIVITY_TABS,
  CRM_KPI_MID,
  CRM_KPI_MSA,
  CRM_KPI_TOP,
  CRM_REQUIREMENT_TABS,
  CRM_REQUIREMENTS,
} from "./data/overview.mock";

export function CrmDashboardOverview() {
  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-6">
      <DashboardControlHeader
        title="CRM Dashboard"
        syncLabel="Last syn update 2:13pm CT"
        primaryActionLabel="Add customer"
      />

      {/* Top KPI cards */}
      <DashboardStatGrid>
        <DashboardStatRow columns={5}>
          {CRM_KPI_TOP.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      {/* Bottom KPI cards — 4 in one line */}
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {CRM_KPI_MID.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
          <DashboardStatCell {...CRM_KPI_MSA} />
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
        <DashboardPanel className="flex h-full min-w-0 flex-col p-3 sm:p-4">
          <DashboardPanelTitle
            icon="lightning"
            title="Requirements needing review"
            trailing={<DashboardFilterTabs tabs={CRM_REQUIREMENT_TABS} />}
          />
          <ul className="mt-2 flex-1">
            {CRM_REQUIREMENTS.map((row) => (
              <DashboardExceptionRow
                key={row.text}
                tag={row.tag}
                tagVariant={row.tagVariant}
                title={row.text}
                action={row.action}
              />
            ))}
          </ul>
          <DashboardFooterButton className="mt-4">View all</DashboardFooterButton>
        </DashboardPanel>

        <DashboardPanel className="flex h-full min-w-0 flex-col p-3 sm:p-4">
          <DashboardPanelTitle
            icon="lightning"
            title="Recent customer activity"
            trailing={<DashboardFilterTabs tabs={CRM_ACTIVITY_TABS} />}
          />
          <ul className="mt-2 min-w-0 flex-1">
            {CRM_ACTIVITY.map((row) => (
              <DashboardActivityRow
                key={row.title}
                title={row.title}
                subtitle={row.subtitle}
                status={row.status}
                statusVariant={row.statusVariant}
              />
            ))}
          </ul>
          <DashboardFooterButton className="mt-4">View all</DashboardFooterButton>
        </DashboardPanel>
      </div>
    </div>
  );
}
