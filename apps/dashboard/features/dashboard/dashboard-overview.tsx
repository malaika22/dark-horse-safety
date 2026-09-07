import {
  DashboardChartLegend,
  DashboardControlHeader,
  DashboardCycleKpiCard,
  DashboardCycleKpiStrip,
  DashboardExceptionRow,
  DashboardHorizontalBarChart,
  DashboardMutedLink,
  DashboardUnbilledHoursChart,
  DashboardWorkloadBar,
} from "@dark-horse-safety/ui";
import {
  DashboardCrewAvatars,
  DashboardCrewLegend,
  DashboardFleetStatList,
  DashboardFleetVehicleRow,
  DashboardMobileSyncList,
  DashboardMobileSyncStatus,
  DashboardReportDueRow,
  DashboardSafetyRecordList,
  DashboardSectionLabel,
  DashboardWidgetSection,
} from "./dashboard-widgets";
import {
  EXCEPTIONS,
  FLEET_STATS,
  FLEET_VEHICLES,
  JOB_FLOW,
  LIVE_CREW,
  LIVE_CREW_MORE,
  MOBILE_SYNC_ROWS,
  MOBILE_SYNC_SUMMARY,
  PAYROLL,
  QUOTE_PIPELINE,
  REPORTS_DUE,
  SAFETY_RECORD,
  SYNC_LABEL,
  THIS_CYCLE,
  UNBILLED_LEGEND,
} from "./data/overview.mock";

const LIVE_CREW_VISIBLE = LIVE_CREW.slice(0, 8);

export function DashboardOverview() {
  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <DashboardControlHeader
        title="Dashboard"
        syncLabel={SYNC_LABEL}
        showNotificationBell
        className="divider-edge-bottom -mx-3 px-3 pb-3 sm:-mx-5 sm:px-5 sm:pb-4"
      />

      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DashboardSectionLabel>This cycle</DashboardSectionLabel>
          <DashboardMutedLink>View full financials</DashboardMutedLink>
        </div>
        <DashboardCycleKpiStrip>
          {THIS_CYCLE.map((cell) => (
            <DashboardCycleKpiCard key={cell.title} {...cell} />
          ))}
        </DashboardCycleKpiStrip>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(240px,1fr)] lg:gap-5">
        <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
          <DashboardWidgetSection title="Payroll" actionLabel="Manage payroll">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <p className="font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[13px]">
                  {PAYROLL.lockPrefix}
                </p>
                <p className="mt-1.5 font-sans text-[22px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[28px]">
                  {PAYROLL.lockValuePrimary}{" "}
                  <span className="text-[#959597]">{PAYROLL.lockValueSecondary}</span>
                </p>
              </div>
              <p className="shrink-0 font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[11px]">
                Day 13/14
              </p>
            </div>
            <div className="mt-4">
              <DashboardWorkloadBar
                segments={PAYROLL.segments}
                total={PAYROLL.total}
              />
            </div>
          </DashboardWidgetSection>

          <DashboardWidgetSection title="Unbilled hours" actionLabel="View billing">
            <DashboardUnbilledHoursChart />
            <DashboardChartLegend
              items={UNBILLED_LEGEND}
              className="mt-2.5 justify-start"
            />
          </DashboardWidgetSection>

          <DashboardWidgetSection title="Exception queue" actionLabel="View all">
            <ul className="list-none space-y-0">
              {EXCEPTIONS.map((row) => (
                <DashboardExceptionRow
                  key={row.title}
                  tag={row.tag}
                  tagVariant={row.tagVariant}
                  title={row.title}
                  tagPosition="end"
                />
              ))}
            </ul>
          </DashboardWidgetSection>

          <DashboardWidgetSection
            title="Live crew"
            actionLabel={`View +${LIVE_CREW_MORE} more`}
          >
            <DashboardCrewAvatars crew={LIVE_CREW_VISIBLE} />
            <DashboardCrewLegend />
          </DashboardWidgetSection>

          <DashboardWidgetSection title="Reports due" actionLabel="View reports">
            <ul className="list-none space-y-0">
              {REPORTS_DUE.map((row) => (
                <DashboardReportDueRow key={row.title} {...row} />
              ))}
            </ul>
          </DashboardWidgetSection>
        </div>

        <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
          <DashboardWidgetSection title="Safety record" actionLabel="View safety">
            <DashboardSafetyRecordList items={SAFETY_RECORD} />
          </DashboardWidgetSection>

          <DashboardWidgetSection title="Fleet" actionLabel="View fleet dash">
            <DashboardFleetVehicleRow vehicles={FLEET_VEHICLES} />
            <DashboardFleetStatList items={FLEET_STATS} />
          </DashboardWidgetSection>

          <DashboardWidgetSection title="Mobile sync" actionLabel="Sync details">
            <DashboardMobileSyncStatus items={MOBILE_SYNC_SUMMARY} />
            <DashboardMobileSyncList rows={MOBILE_SYNC_ROWS} />
          </DashboardWidgetSection>

          <DashboardWidgetSection title="Job flow" actionLabel="View operations">
            <DashboardHorizontalBarChart items={JOB_FLOW} />
          </DashboardWidgetSection>

          <DashboardWidgetSection title="Quote pipeline" actionLabel="View crm">
            <DashboardHorizontalBarChart items={QUOTE_PIPELINE} />
          </DashboardWidgetSection>
        </div>
      </div>
    </div>
  );
}
