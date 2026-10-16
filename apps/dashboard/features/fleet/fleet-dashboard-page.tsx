"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
  type StatIconName,
} from "@dark-horse-safety/ui";
import {
  fleetApi,
  type FleetDashboardOverview,
  type FleetDashboardStat,
} from "@/lib/fleet-api";
import { toastApiError } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { useSetHeaderActions } from "@/features/app-shell/header-actions-context";
import { fleetBadgeTone } from "./fleet-ui";

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ViewAllButton({
  label = "View All",
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-4 py-2.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:border-[#3E3E3E] hover:bg-[#222222] md:text-[12px]"
    >
      {label}
      <span aria-hidden>→</span>
    </button>
  );
}

function toIcon(name: string): StatIconName {
  const allowed: StatIconName[] = [
    "time",
    "edit",
    "gps",
    "wrench",
    "document",
    "lightning",
    "folder",
    "customers",
    "operations",
    "hr",
  ];
  return (allowed.includes(name as StatIconName)
    ? name
    : "operations") as StatIconName;
}

function ReadinessBar({
  percent,
  tone,
}: {
  percent: number;
  tone: "success" | "warning" | "error";
}) {
  const fill =
    tone === "success"
      ? "bg-[#22C55E]"
      : tone === "warning"
        ? "bg-[#FF9500]"
        : "bg-[#FF4D4D]";
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-[2px] bg-[#2A2A2A]">
        <div
          className={cn("h-full rounded-[2px] transition-all", fill)}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-sans text-[11px] font-[510] tabular-nums text-[#FDFDFF]">
        {percent}%
      </span>
    </div>
  );
}

export function FleetDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<FleetDashboardOverview | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  useSetHeaderActions(
    <div className="flex flex-wrap items-center gap-2">
      {data?.updatedAtLabel ? (
        <span className="hidden font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597] lg:inline">
          {data.updatedAtLabel}
        </span>
      ) : null}
      <DashboardToolbarButton
        variant="primary"
        leftIcon={<PlusIcon />}
        showChevron
        onClick={() => router.push("/fleet/assets")}
      >
        Add Asset
      </DashboardToolbarButton>
    </div>,
    [router, data?.updatedAtLabel],
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fleetApi.dashboardOverview();
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) {
          toastApiError(err);
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader label="Loading fleet dashboard" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="overflow-x-hidden bg-shell p-3 sm:p-6">
        <p className="mb-3 font-sans text-[12px] uppercase text-[#959597]">
          Failed to load fleet dashboard.
        </p>
        <DashboardToolbarButton onClick={() => setReloadKey((k) => k + 1)}>
          Retry
        </DashboardToolbarButton>
      </div>
    );
  }

  const row1 = data.stats.slice(0, 5);
  const row2 = data.stats.slice(5, 10);

  const renderStat = (stat: FleetDashboardStat) => (
    <DashboardStatCell
      key={stat.title}
      title={stat.title}
      value={stat.value}
      meta={stat.meta}
      icon={toIcon(stat.icon)}
    />
  );

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
      <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597] lg:hidden">
        {data.updatedAtLabel}
      </p>

      <DashboardStatGrid>
        <DashboardStatRow columns={5}>{row1.map(renderStat)}</DashboardStatRow>
        <DashboardStatRow columns={5}>{row2.map(renderStat)}</DashboardStatRow>
      </DashboardStatGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <DashboardPanel className="flex min-h-0 flex-col p-4 sm:p-5">
          <DashboardPanelTitle icon="activity" title="Open Repair Requests" />
          <ul className="mt-4 flex-1 list-none space-y-0">
            {data.openRepairs.length === 0 ? (
              <li className="py-6 font-sans text-[11px] uppercase text-[#959597]">
                No open repairs
              </li>
            ) : (
              data.openRepairs.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-3 border-b border-[#2A2A2A] py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {row.code}
                    </p>
                    <p className="mt-1 truncate font-sans text-[11px] uppercase text-[#959597]">
                      {row.assetLabel} · {row.truck}
                    </p>
                    <p className="mt-0.5 font-sans text-[10px] uppercase text-[#6B6B6D]">
                      {row.ageLabel}
                    </p>
                  </div>
                  <DashboardBadge variant={fleetBadgeTone(row.priorityTone)}>
                    {row.priorityLabel}
                  </DashboardBadge>
                </li>
              ))
            )}
          </ul>
          <ViewAllButton
            onClick={() => router.push("/fleet/repair-requests")}
          />
        </DashboardPanel>

        <DashboardPanel className="flex min-h-0 flex-col p-4 sm:p-5">
          <DashboardPanelTitle
            icon="sync"
            title="Calibration Expiring Soon"
          />
          <ul className="mt-4 flex-1 list-none space-y-0">
            {data.calibrationExpiring.length === 0 ? (
              <li className="py-6 font-sans text-[11px] uppercase text-[#959597]">
                No calibrations due
              </li>
            ) : (
              data.calibrationExpiring.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-3 border-b border-[#2A2A2A] py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {row.assetLabel}
                    </p>
                    <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
                      {row.assetCode}
                    </p>
                  </div>
                  <DashboardBadge variant={fleetBadgeTone(row.statusTone)}>
                    {row.statusLabel}
                  </DashboardBadge>
                </li>
              ))
            )}
          </ul>
          <ViewAllButton onClick={() => router.push("/fleet/calibration")} />
        </DashboardPanel>

        <DashboardPanel className="flex min-h-0 flex-col p-4 sm:p-5">
          <DashboardPanelTitle icon="document" title="Failed Inspections" />
          <ul className="mt-4 flex-1 list-none space-y-0">
            {data.failedInspections.length === 0 ? (
              <li className="py-6 font-sans text-[11px] uppercase text-[#959597]">
                No failed inspections
              </li>
            ) : (
              data.failedInspections.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-3 border-b border-[#2A2A2A] py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {row.code}
                    </p>
                    <p className="mt-1 truncate font-sans text-[11px] uppercase text-[#959597]">
                      {row.assetLabel} · {row.truck}
                    </p>
                    <p className="mt-0.5 font-sans text-[10px] uppercase text-[#6B6B6D]">
                      {row.type} · {row.ageLabel}
                    </p>
                  </div>
                  <DashboardBadge variant={fleetBadgeTone(row.resultTone)}>
                    {row.resultLabel}
                  </DashboardBadge>
                </li>
              ))
            )}
          </ul>
          <ViewAllButton onClick={() => router.push("/fleet/inspections")} />
        </DashboardPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4 lg:gap-5">
        <DashboardPanel className="flex min-h-0 flex-col p-4 sm:p-5 xl:col-span-1">
          <DashboardPanelTitle icon="chart" title="Truck Readiness Overview" />
          <ul className="mt-4 flex-1 list-none space-y-4">
            {data.truckReadiness.length === 0 ? (
              <li className="py-6 font-sans text-[11px] uppercase text-[#959597]">
                No trucks assigned
              </li>
            ) : (
              data.truckReadiness.map((row) => (
                <li key={`${row.truck}-${row.driver}`}>
                  <p className="mb-2 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {row.truck} — {row.driver}
                  </p>
                  <ReadinessBar percent={row.percent} tone={row.tone} />
                </li>
              ))
            )}
          </ul>
        </DashboardPanel>

        <DashboardPanel className="flex min-h-0 flex-col p-4 sm:p-5">
          <DashboardPanelTitle icon="lightning" title="Recent Movement Activity" />
          <ul className="mt-4 flex-1 list-none space-y-0">
            {data.recentMovement.map((row) => (
              <li
                key={row.id}
                className="border-b border-[#2A2A2A] py-3 last:border-b-0"
              >
                <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {row.text}
                </p>
                <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">
                  {row.meta}
                </p>
                <p className="mt-0.5 font-sans text-[10px] uppercase text-[#6B6B6D]">
                  {row.when}
                </p>
              </li>
            ))}
          </ul>
        </DashboardPanel>

        <DashboardPanel className="flex min-h-0 flex-col p-4 sm:p-5">
          <DashboardPanelTitle icon="clipboard" title="Low Inventory / Consumables" />
          <ul className="mt-4 flex-1 list-none space-y-0">
            {data.lowInventory.map((row) => (
              <li
                key={row.id}
                className="flex items-start justify-between gap-3 border-b border-[#2A2A2A] py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {row.name}
                  </p>
                  <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
                    {row.location}
                  </p>
                </div>
                <DashboardBadge variant={fleetBadgeTone(row.tone)}>
                  {row.stockLabel}
                </DashboardBadge>
              </li>
            ))}
          </ul>
        </DashboardPanel>

        <DashboardPanel className="flex min-h-0 flex-col p-4 sm:p-5">
          <DashboardPanelTitle icon="cycle" title="Asset Health Overview" />
          <ul className="mt-4 flex-1 list-none space-y-0">
            {data.assetHealth.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 border-b border-[#2A2A2A] py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {row.label}
                  </p>
                  <p className="mt-1 font-sans text-[18px] font-[590] tabular-nums text-[#FDFDFF]">
                    {row.value}
                  </p>
                </div>
                <DashboardBadge variant={fleetBadgeTone(row.tone)}>
                  {row.badge}
                </DashboardBadge>
              </li>
            ))}
          </ul>
        </DashboardPanel>
      </div>
    </div>
  );
}
