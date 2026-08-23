import type { ReactNode } from "react";
import { ChevronRightIcon, SyncIcon } from "@/features/app-shell/icons";

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-[#161616] ${className}`}
    >
      {children}
    </div>
  );
}

function GoldLink({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#c4a35a] hover:text-[#d4b56a]"
    >
      {children}
      <ChevronRightIcon className="opacity-80" />
    </button>
  );
}

function OutlineButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground transition-colors hover:bg-white/5"
    >
      {children}
      <ChevronRightIcon />
    </button>
  );
}

const KPI_TOP = [
  { title: "CRM / Customer", value: "98%", meta: "3 new leads", action: "Review time" },
  { title: "Employees & HR", value: "5", meta: "Payroll due Thu", action: "Review request" },
  { title: "Fleet & Assets", value: "3", meta: "2 calib · 1 SCBA", action: "View flags" },
  { title: "Operations", value: "18", meta: "3 missing ST", action: "View assets" },
  { title: "Safety & Compliance", value: "7", meta: "3 missing ST", action: "View assets" },
];

const KPI_MID = [
  { title: "Pending time approvals", value: "38", meta: "Across 4 technicians" },
  { title: "Time edit request", value: "5", meta: "Awaiting review" },
  { title: "GPS & time flags", value: "2", meta: "Clock-in from home address" },
  {
    title: "Equipment & calibration alerts",
    value: "2",
    meta: "Calibration due · 1 inspection",
  },
];

const EXCEPTIONS = [
  { tag: "Operations", tagColor: "bg-blue-500/20 text-blue-300", text: "Missing sales ticket for WO-4412", action: "Review" },
  { tag: "Employee / HR", tagColor: "bg-amber-500/20 text-amber-300", text: "Time edit request from Isaac M.", action: "Open" },
  { tag: "Safety / Compliance", tagColor: "bg-emerald-500/20 text-emerald-300", text: "SCBA expired for Unit 12", action: "Review" },
  { tag: "Fleet / Asset", tagColor: "bg-violet-500/20 text-violet-300", text: "Calibration due — gas meter G-09", action: "Open" },
  { tag: "Billing", tagColor: "bg-rose-500/20 text-rose-300", text: "Unmatched work order vs sales ticket", action: "Review" },
];

const ACTIVITY = [
  { text: "Isaac submitted time edit request", time: "2m ago", status: "Pending", tone: "bg-amber-500/15 text-amber-300" },
  { text: "Dispatch updated WO-4412 status", time: "18m ago", status: "Needs review", tone: "bg-sky-500/15 text-sky-300" },
  { text: "SCBA inspection missing — Unit 12", time: "1h ago", status: "Missing", tone: "bg-rose-500/15 text-rose-300" },
  { text: "Payroll cycle advanced to step 13", time: "2h ago", status: "Pending", tone: "bg-amber-500/15 text-amber-300" },
];

export function DashboardOverview() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground-subtle">
            Control center
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground-muted">
            Last sync update 2:13pm CT
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground hover:bg-white/5"
          >
            <SyncIcon />
            Run sync
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-black"
          >
            Generate payroll
            <span className="opacity-60">▾</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {KPI_TOP.map((card) => (
          <Panel key={card.title} className="flex flex-col gap-3 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground-muted">
              {card.title}
            </p>
            <div>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {card.value}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-foreground-subtle">
                {card.meta}
              </p>
            </div>
            <GoldLink>{card.action}</GoldLink>
          </Panel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {KPI_MID.map((card) => (
          <Panel key={card.title} className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground-muted">
              {card.title}
            </p>
            <p className="mt-3 text-3xl font-bold text-foreground">{card.value}</p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-foreground-subtle">
              {card.meta}
            </p>
          </Panel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel className="flex flex-col p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em]">
              Exception queue
            </h2>
            <div className="flex flex-wrap gap-1">
              {["All", "Operation", "Employee", "Safety", "Fleet", "Billing"].map(
                (tab, i) => (
                  <span
                    key={tab}
                    className={`rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${
                      i === 0
                        ? "bg-white/10 text-foreground"
                        : "text-foreground-muted"
                    }`}
                  >
                    {tab}
                  </span>
                ),
              )}
            </div>
          </div>
          <ul className="space-y-2">
            {EXCEPTIONS.map((row) => (
              <li
                key={row.text}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-[#121212] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <span
                    className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] ${row.tagColor}`}
                  >
                    {row.tag}
                  </span>
                  <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-[0.04em] text-foreground-muted">
                    {row.text}
                  </p>
                </div>
                <GoldLink>{row.action}</GoldLink>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="flex flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.1em]">
                Payroll cycle
              </h2>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground-muted">
                Jun 1 – Jun 14, 2025
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-emerald-300">
              Open
            </span>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground-muted">
              <span>13 of 15</span>
              <span>342.5h total</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-[#2a2a2a]">
              <div className="w-[86%] bg-gradient-to-r from-emerald-600 to-emerald-400" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-foreground-muted">
            <div className="rounded-lg border border-border bg-[#121212] p-3">
              <p className="text-foreground-subtle">Approved</p>
              <p className="mt-1 text-lg font-bold text-foreground">286.0h</p>
            </div>
            <div className="rounded-lg border border-border bg-[#121212] p-3">
              <p className="text-foreground-subtle">Pending</p>
              <p className="mt-1 text-lg font-bold text-foreground">56.5h</p>
            </div>
          </div>

          <div className="mt-4">
            <OutlineButton>Manage payroll</OutlineButton>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.1em]">
                Billing discrepancies
              </h2>
              <p className="mt-2 text-2xl font-bold text-foreground">
                274k at risk{" "}
                <span className="text-sm font-semibold text-rose-400">↓</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-[9px] font-bold uppercase tracking-[0.08em] text-foreground-muted">
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-violet-400" /> Under billed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-sky-400" /> Over billed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-rose-400" /> Unresolved
              </span>
            </div>
          </div>

          <div className="mt-4 h-36 rounded-lg border border-border bg-[#121212] p-3">
            <svg viewBox="0 0 400 120" className="h-full w-full" aria-hidden>
              <path
                d="M0 80 C40 70, 80 90, 120 60 S200 20, 240 45 S320 90, 400 40"
                fill="none"
                stroke="#a78bfa"
                strokeWidth="2"
              />
              <path
                d="M0 90 C50 85, 90 70, 140 75 S220 95, 280 70 S360 50, 400 65"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
              />
              <path
                d="M0 100 C60 95, 100 100, 160 85 S260 60, 320 75 S370 95, 400 88"
                fill="none"
                stroke="#fb7185"
                strokeWidth="2"
              />
            </svg>
          </div>

          <div className="mt-4">
            <OutlineButton>View bill discrepancies</OutlineButton>
          </div>
        </Panel>

        <Panel className="flex flex-col p-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em]">
            Unmatched & missing records
          </h2>
          <div className="mt-4 flex items-center justify-center">
            <div className="relative flex h-28 w-40 items-end justify-center">
              <svg viewBox="0 0 120 70" className="h-full w-full" aria-hidden>
                <path
                  d="M10 60 A50 50 0 0 1 110 60"
                  fill="none"
                  stroke="#2a2a2a"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <path
                  d="M10 60 A50 50 0 0 1 90 20"
                  fill="none"
                  stroke="url(#gauge)"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="50%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute bottom-1 text-center">
                <p className="text-xl font-bold text-foreground">12</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-foreground-muted">
                  Total
                </p>
              </div>
            </div>
          </div>
          <ul className="mt-2 space-y-2 text-[10px] font-semibold uppercase tracking-[0.06em]">
            {[
              { label: "Missing sales tickets", value: 5, color: "bg-rose-400" },
              { label: "Unmatched work orders", value: 4, color: "bg-amber-400" },
              { label: "Missing required forms", value: 3, color: "bg-sky-400" },
            ].map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex justify-between text-foreground-muted">
                  <span>{row.label}</span>
                  <span className="text-foreground">{row.value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#2a2a2a]">
                  <div
                    className={`h-full ${row.color}`}
                    style={{ width: `${(row.value / 12) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <OutlineButton>View bill</OutlineButton>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel className="p-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em]">
            Recent activity
          </h2>
          <ul className="mt-4 space-y-2">
            {ACTIVITY.map((row) => (
              <li
                key={row.text}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-[#121212] px-3 py-2.5"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-foreground">
                    {row.text}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.06em] text-foreground-subtle">
                    {row.time}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${row.tone}`}
                >
                  {row.status}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <OutlineButton>View activity log</OutlineButton>
          </div>
        </Panel>

        <Panel className="flex flex-col p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em]">
              GoCanvas sync
            </h2>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-emerald-300">
              Live
            </span>
          </div>
          <ul className="mt-4 space-y-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-foreground-muted">
            {[
              ["Last sync", "2:13pm CT"],
              ["Records imported", "184"],
              ["Failed", "3"],
              ["Unmatched", "7"],
              ["Pending review", "12"],
            ].map(([label, value]) => (
              <li key={label} className="flex items-center justify-between border-b border-border/60 pb-2">
                <span>{label}</span>
                <span className="text-foreground">{value}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <OutlineButton>View errors</OutlineButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}
