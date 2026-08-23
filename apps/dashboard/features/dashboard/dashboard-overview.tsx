import {
  DashboardActivityRow,
  DashboardBadge,
  DashboardBillingChart,
  DashboardChartLegend,
  DashboardControlHeader,
  DashboardDropdownFilter,
  DashboardExceptionRow,
  DashboardFilterTabs,
  DashboardFooterButton,
  DashboardGaugeChart,
  DashboardKeyValueList,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardRecordSparkline,
  DashboardSegmentedProgress,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatList,
  DashboardSyncTable,
} from "@dark-horse-safety/ui";
import {
  ACTIVITY,
  ACTIVITY_TABS,
  BILLING,
  BILLING_LEGEND,
  EXCEPTIONS,
  EXCEPTION_TABS,
  GOCANVAS_SYNC,
  KPI_EQUIPMENT,
  KPI_MID,
  KPI_TOP,
  PAYROLL_CYCLE,
  UNMATCHED_RECORDS,
} from "./data/overview.mock";

export function DashboardOverview() {
  return (
    <div className="space-y-4 bg-shell p-4 sm:p-6">
      <DashboardControlHeader />

      {/* KPI grid — dividers only, no separate cards */}
      <DashboardStatGrid>
        {KPI_TOP.map((cell) => (
          <DashboardStatCell key={cell.title} {...cell} />
        ))}
        {KPI_MID.map((cell) => (
          <DashboardStatCell key={cell.title} {...cell} />
        ))}
        <DashboardStatCell {...KPI_EQUIPMENT} className="xl:col-span-2" />
      </DashboardStatGrid>

      {/* Row 3 — exception queue + payroll cycle */}
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[1.4fr_1fr]">
        <DashboardPanel className="flex h-full flex-col p-4">
          <DashboardPanelTitle
            icon="lightning"
            title="Exception queue"
            trailing={<DashboardFilterTabs tabs={EXCEPTION_TABS} />}
          />
          <ul className="mt-2 flex-1">
            {EXCEPTIONS.map((row) => (
              <DashboardExceptionRow
                key={row.text}
                tag={row.tag}
                tagVariant={row.tagVariant}
                title={row.text}
                action={row.action}
              />
            ))}
          </ul>
        </DashboardPanel>

        <DashboardPanel className="flex h-full flex-col justify-between gap-4 p-4">
          <DashboardPanelTitle
            icon="cycle"
            title="Payroll cycle"
            trailing={
              <DashboardBadge variant="success" pill>
                Open
              </DashboardBadge>
            }
          />

          <div>
            <p className="font-sans text-[24px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]">
              {PAYROLL_CYCLE.dateRange}
            </p>
            <p className="mt-2 font-sans text-[14px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597]">
              {PAYROLL_CYCLE.subtitle}
            </p>
          </div>

          <DashboardSegmentedProgress
            completed={PAYROLL_CYCLE.completed}
            total={PAYROLL_CYCLE.total}
            label={`${PAYROLL_CYCLE.completed} of ${PAYROLL_CYCLE.total}`}
            sublabel={PAYROLL_CYCLE.lockLabel}
            startLabel={PAYROLL_CYCLE.startLabel}
            todayLabel={PAYROLL_CYCLE.todayLabel}
            endLabel={PAYROLL_CYCLE.endLabel}
          />

          <DashboardStatList items={PAYROLL_CYCLE.stats} />

          <DashboardFooterButton>Manage payroll</DashboardFooterButton>
        </DashboardPanel>
      </div>

      {/* Row 4 — billing + unmatched records */}
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[1.4fr_1fr]">
        <DashboardPanel className="flex h-full flex-col justify-between gap-4 p-4">
          <DashboardPanelTitle
            iconSrc="/icons/billing-icon.png"
            title="Billing discrepancies"
            titleClassName="font-[274]"
            trailing={<DashboardDropdownFilter label="Weekly" />}
          />

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-sans text-[24px] font-normal uppercase leading-[130%] tracking-normal text-[#FDFDFF]">
                {BILLING.amount}
              </p>
              <p className="font-sans text-[10.6px] font-normal uppercase leading-[150%] tracking-[0.02em]">
                <span className="text-[#FF4D4D]">{BILLING.changePercent}</span>{" "}
                <span className="text-[#666D80]">{BILLING.changeLabel}</span>
              </p>
            </div>
            <DashboardChartLegend items={BILLING_LEGEND} className="items-center" />
          </div>
          <DashboardBillingChart />

          <DashboardFooterButton>View bill discrepancies</DashboardFooterButton>
        </DashboardPanel>

        <DashboardPanel className="flex h-full flex-col justify-between gap-4 p-4">
          <DashboardPanelTitle
            iconSrc="/icons/unmatched-icon.png"
            title="Unmatched & missing records"
          />
          <DashboardGaugeChart value={12} />
          <ul>
            {UNMATCHED_RECORDS.map((row) => (
              <DashboardRecordSparkline
                key={row.label}
                label={row.label}
                value={row.value}
                tone={row.tone}
                iconSrc={row.iconSrc}
              />
            ))}
          </ul>
          <DashboardFooterButton>View bill</DashboardFooterButton>
        </DashboardPanel>
      </div>

      {/* Row 5 — recent activity + GoCanvas sync */}
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[1.4fr_1fr]">
        <DashboardPanel className="flex h-full flex-col justify-between gap-4 p-4">
          <DashboardPanelTitle
            icon="lightning"
            title="Recent activity"
            trailing={<DashboardFilterTabs tabs={ACTIVITY_TABS} />}
          />
          <ul className="flex-1">
            {ACTIVITY.map((row) => (
              <DashboardActivityRow
                key={row.title}
                title={row.title}
                subtitle={row.subtitle}
                status={row.status}
                statusVariant={row.statusVariant}
              />
            ))}
          </ul>
          <DashboardFooterButton>View activity log</DashboardFooterButton>
        </DashboardPanel>

        <DashboardPanel className="flex h-full flex-col justify-between gap-4 p-4">
          <DashboardPanelTitle
            iconSrc="/icons/go-canvas-image.png"
            title="GoCanvas sync"
            trailing={
              <DashboardBadge variant="success" pill>
                Live
              </DashboardBadge>
            }
          />
          <DashboardKeyValueList items={GOCANVAS_SYNC.stats} />
          <DashboardSyncTable rows={GOCANVAS_SYNC.table} />
          <DashboardFooterButton>View errors</DashboardFooterButton>
        </DashboardPanel>
      </div>
    </div>
  );
}
