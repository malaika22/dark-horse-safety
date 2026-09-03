import type { ReactNode } from "react";
import {
  DashboardBadge,
  DashboardHorizontalBarChart,
  DashboardPanel,
  DashboardWidgetHeader,
  DashboardWorkloadBar,
  cn,
} from "@dark-horse-safety/ui";
import {
  ACCOUNT_SETUP_HEALTH,
  EOD_COMPLIANCE,
  FIELD_EVENTS_TODAY,
  FIELD_EVENTS_WEEK,
  MSA_RENEWALS,
  QUOTE_PIPELINE,
  QUOTE_PIPELINE_SUMMARY,
  REP_PERFORMANCE,
  SALES_ACTIVITY,
  SETUP_HEALTH_LEGEND,
  repEodBadgeVariant,
  type SalesActivityIcon,
  type SetupHealthTone,
} from "./data/overview.mock";

/** Figma pattern — gray section title above the panel card. */
export function CrmWidgetSection({
  title,
  actionLabel,
  children,
  className,
}: {
  title: string;
  actionLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <DashboardWidgetHeader title={title} actionLabel={actionLabel} />
      <DashboardPanel className="p-3.5 sm:p-4">{children}</DashboardPanel>
    </section>
  );
}

function SalesActivityIconGlyph({ type }: { type: SalesActivityIcon }) {
  switch (type) {
    case "dollar":
      return (
        <span className="font-sans text-[13px] font-[590] leading-none text-[#FDFDFF]">
          $
        </span>
      );
    case "building":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 20V8l7-4 7 4v12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "quote":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M8 4h9l3 3v13a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "visit":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 21s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="11" r="2" fill="currentColor" />
        </svg>
      );
  }
}

function FieldEventIcon({ type }: { type: "pin" | "phone" | "users" }) {
  if (type === "phone") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6.5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3a1.5 1.5 0 01-1.5 1.5C10.4 21 3 13.6 3 6.5A1.5 1.5 0 014.5 5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (type === "users") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M3 20c0-3 2.7-5 6-5s6 2 6 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M16 11a3 3 0 100-6M19 20c0-2.2-1.5-4-3.5-4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="11" r="2" fill="currentColor" />
    </svg>
  );
}

const setupToneColor: Record<SetupHealthTone, string> = {
  healthy: "#22C55E",
  warning: "#FF9500",
  critical: "#FF4D4D",
};

const numCell =
  "py-3 pr-3 text-right font-sans text-[12px] font-normal uppercase tabular-nums leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]";

export function CrmEodComplianceCard() {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[13px]">
            Compliance status
          </p>
          <p className="mt-3 font-sans text-[28px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[32px]">
            {EOD_COMPLIANCE.complete}/{EOD_COMPLIANCE.total}
          </p>
        </div>
        <p className="shrink-0 pt-0.5 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
          {EOD_COMPLIANCE.dateLabel}
        </p>
      </div>
      <div className="mt-5">
        <DashboardWorkloadBar
          segments={EOD_COMPLIANCE.segments}
          total={EOD_COMPLIANCE.barTotal}
          showTotal={false}
        />
      </div>
    </div>
  );
}

export function CrmRepPerformanceTable() {
  return (
    <div className="overflow-x-auto [-ms-overflow-style:auto] [scrollbar-width:thin]">
      <table className="w-full min-w-0 border-collapse text-left md:min-w-[520px]">
        <thead>
          <tr className="divider-row">
            {["Rep", "Calls", "Visits", "Quotes", "Pipeline", "Eod"].map(
              (header) => (
                <th
                  key={header}
                  scope="col"
                  className={cn(
                    "pb-3 pr-2 font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] last:pr-0 sm:pr-3 sm:text-[11px] md:text-[12px]",
                    header !== "Rep" && header !== "Eod" && "text-right",
                    header === "Eod" && "text-right",
                    (header === "Visits" || header === "Pipeline") &&
                      "hidden md:table-cell",
                  )}
                >
                  {header}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {REP_PERFORMANCE.map((row) => (
            <tr key={row.rep} className="divider-row">
              <td className="max-w-[7rem] truncate py-3 pr-2 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] sm:max-w-none sm:pr-3 sm:text-[12px] md:text-[13px]">
                {row.rep}
              </td>
              <td className={numCell}>{row.calls}</td>
              <td className={cn(numCell, "hidden md:table-cell")}>{row.visits}</td>
              <td className={numCell}>{row.quotes}</td>
              <td className={cn(numCell, "hidden md:table-cell")}>{row.pipeline}</td>
              <td className="py-3 text-right">
                <DashboardBadge variant={repEodBadgeVariant(row.eodTone)} pill>
                  {row.eod}
                </DashboardBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CrmSalesActivityList() {
  return (
    <ul className="list-none space-y-0">
      {SALES_ACTIVITY.map((item) => (
        <li
          key={item.title}
          className="flex items-center gap-3 divider-row py-3.5"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#2D2D30] bg-[#1A1A1A] text-[#FDFDFF]">
            <SalesActivityIconGlyph type={item.icon} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-sans text-[12px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
              {item.title}
            </p>
            <p className="mt-1.5 truncate font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
              {item.subtitle}
            </p>
          </div>
          <span className="shrink-0 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
            {item.time}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CrmMsaRenewalList() {
  return (
    <ul className="list-none space-y-0">
      {MSA_RENEWALS.map((item) => (
        <li
          key={item.client}
          className="flex items-center justify-between gap-3 divider-row py-3.5"
        >
          <span className="min-w-0 truncate font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
            {item.client}
          </span>
          <span className="shrink-0 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
            {item.due}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CrmFieldEventsWeek() {
  return (
    <div>
      <div className="flex items-start justify-between gap-1 overflow-x-auto pb-0.5 scrollbar-hidden sm:gap-2">
        {FIELD_EVENTS_WEEK.map((day, index) => (
          <div
            key={`${day.day}-${index}`}
            className="flex min-w-[2rem] flex-1 flex-col items-center gap-1.5 sm:min-w-0 sm:gap-2"
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full font-sans text-[10px] font-[590] uppercase leading-none tracking-[-0.02em] sm:h-8 sm:w-8 sm:text-[11px] md:h-9 md:w-9 md:text-[12px]",
                day.isToday
                  ? "bg-[#FDFDFF] text-[#0D0D0D]"
                  : "text-[#959597]",
              )}
            >
              {day.day}
            </span>
            <span className="font-sans text-[11px] font-[590] uppercase tabular-nums leading-none tracking-[-0.02em] text-[#FDFDFF] sm:text-[12px] md:text-[14px]">
              {day.count}
            </span>
          </div>
        ))}
      </div>
      <ul className="divider-section-top mt-4 list-none space-y-0 pt-1">
        {FIELD_EVENTS_TODAY.map((item) => (
          <li
            key={item.label}
            className="flex items-center justify-between gap-3 divider-row py-3"
          >
            <span className="inline-flex items-center gap-2.5 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[13px]">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-[#FDFDFF]">
                <FieldEventIcon type={item.icon} />
              </span>
              {item.label}
            </span>
            <span className="font-sans text-[12px] font-[590] uppercase tabular-nums leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
              {item.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CrmQuotePipelinePanel() {
  return (
    <div>
      <DashboardHorizontalBarChart items={QUOTE_PIPELINE} />
      <div className="divider-section-top mt-4 grid grid-cols-2 gap-4 pt-4 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] md:text-[12px]">
        <div>
          <p className="text-[#959597]">$ open</p>
          <p className="mt-1.5 font-[590] text-[#FDFDFF]">
            {QUOTE_PIPELINE_SUMMARY.open}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[#959597]">% conversion</p>
          <p className="mt-1.5 font-[590] text-[#FDFDFF]">
            {QUOTE_PIPELINE_SUMMARY.conversion}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CrmAccountSetupHealth({
  items = ACCOUNT_SETUP_HEALTH,
}: {
  items?: {
    label: string;
    value: number;
    total: number;
    tone: SetupHealthTone;
  }[];
}) {
  return (
    <div>
      <ul className="space-y-4">
        {items.map((row) => {
          const pct = Math.round((row.value / row.total) * 100);
          return (
            <li key={row.label}>
              <div className="mb-2 flex items-center justify-between gap-3 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] md:text-[12px]">
                <span className="text-[#959597]">{row.label}</span>
                <span className="font-[590] tabular-nums text-[#FDFDFF]">
                  {row.value}/{row.total}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#2A2A2A]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: setupToneColor[row.tone],
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="divider-section-top mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 pt-4">
        {SETUP_HEALTH_LEGEND.map((item) => (
          <span
            key={item.label}
            className="inline-flex h-4 items-center gap-1.5 font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[11px]"
          >
            <i
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
