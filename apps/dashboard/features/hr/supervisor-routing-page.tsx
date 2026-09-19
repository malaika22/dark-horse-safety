"use client";

import * as React from "react";
import {
  DashboardModal,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  hrApi,
  type HrSupervisorRoute,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";

type Kpi = {
  supervisors: number;
  supervisorsMeta: string;
  crews: number;
  crewsMeta: string;
  members: number;
  membersMeta: string;
  regions: number;
  regionsMeta: string;
  unrouted: number;
  unroutedMeta: string;
};

const EMPTY_KPI: Kpi = {
  supervisors: 0,
  supervisorsMeta: "Active this pay cycle",
  crews: 0,
  crewsMeta: "2 have crossed pay cycles",
  members: 0,
  membersMeta: "Awaiting crew assignment",
  regions: 0,
  regionsMeta: "Covered by current roster",
  unrouted: 0,
  unroutedMeta: "Awaiting supervisor assignment",
};

type ManagerTier = "OPS_MGR" | "HSE_MGR";

function AddRouteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 3v4M16 3v4M12 11v6M9 14h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  const tone =
    s === "ACTIVE"
      ? "bg-[#203B2C] text-[#ACEBCE]"
      : "bg-[#2A2618] text-[#C4A35A]";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em]",
        tone,
      )}
    >
      {s}
    </span>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]"
      />
    </label>
  );
}

function SupervisorCard({ route }: { route: HrSupervisorRoute }) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="rounded-xl border border-[#2D2D30] bg-panel p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-sans text-[13px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {route.name}
            </p>
            <p className="mt-0.5 font-sans text-[10px] uppercase text-[#959597]">
              {route.code}
            </p>
          </div>
          <StatusPill status={route.status} />
        </div>
        <p className="mb-3 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
          {route.locationLabel}
        </p>
        <div className="space-y-1.5 border-t border-[#2A2A2A] pt-3">
          <div className="flex justify-between gap-2">
            <span className="font-sans text-[10px] uppercase text-[#959597]">
              Escalates To
            </span>
            <span className="text-right font-sans text-[10px] uppercase text-[#FDFDFF]">
              {route.escalateLabel}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="font-sans text-[10px] uppercase text-[#959597]">
              Backup When Absent
            </span>
            <span className="text-right font-sans text-[10px] uppercase text-[#FDFDFF]">
              {route.backupName || "—"}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="font-sans text-[10px] uppercase text-[#959597]">
              Coverage Window
            </span>
            <span className="text-right font-sans text-[10px] uppercase text-[#FDFDFF]">
              {route.coverageWindow || "—"}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="font-sans text-[10px] uppercase text-[#959597]">
              On-Call
            </span>
            <span className="text-right font-sans text-[10px] uppercase text-[#FDFDFF]">
              {route.onCall ? "YES" : "NO"}
            </span>
          </div>
        </div>
        <div className="mt-3 border-t border-[#2A2A2A] pt-3">
          <p className="mb-2 font-sans text-[10px] uppercase text-[#959597]">
            Approves
          </p>
          <div className="flex flex-wrap gap-1.5">
            {route.approvesTimeEdit ? (
              <span className="rounded-md bg-[#1A2744] px-2 py-1 font-sans text-[10px] font-[510] uppercase text-[#6B9EFF]">
                Time Edit
              </span>
            ) : null}
            {route.approvesTimeOff ? (
              <span className="rounded-md bg-[#1A2744] px-2 py-1 font-sans text-[10px] font-[510] uppercase text-[#6B9EFF]">
                Time Off
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mx-auto h-4 w-px bg-[#3E3E3E]" aria-hidden />
      <div className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5 text-center">
        <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {route.memberCount} Members
        </p>
        <p className="mt-0.5 font-sans text-[10px] uppercase text-[#959597]">
          {route.crew || "—"}
        </p>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  name: "",
  code: "",
  region: "",
  crew: "",
  escalatesTo: "",
  escalateDelay: "",
  backupName: "",
  coverageWindow: "",
  memberCount: "",
  onCall: false,
  status: "ACTIVE",
};

export function SupervisorRoutingPage() {
  const [kpi, setKpi] = React.useState<Kpi>(EMPTY_KPI);
  const [routes, setRoutes] = React.useState<HrSupervisorRoute[]>([]);
  const [structureDrives, setStructureDrives] = React.useState<
    Array<{ id: string; label: string; description: string }>
  >([]);
  const [tier, setTier] = React.useState<ManagerTier>("OPS_MGR");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FORM);

  useSetHeaderBreadcrumb("Employees & HR / Supervisor Routing");

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [kpiRes, overviewRes] = await Promise.all([
          hrApi.supervisorRoutingKpi(),
          hrApi.supervisorRoutingOverview({
            managerTier: tier,
            pageSize: 50,
          }),
        ]);
        if (cancelled) return;
        setKpi(kpiRes.data);
        setRoutes(overviewRes.data.routes.items);
        setStructureDrives(overviewRes.data.structureDrives);
      } catch (err) {
        toastApiError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tier, reloadKey]);

  const openAdd = React.useCallback(() => {
    setForm(EMPTY_FORM);
    setAddOpen(true);
  }, []);

  useSetHeaderActions(
    <DashboardToolbarButton
      variant="primary"
      leftIcon={<AddRouteIcon />}
      onClick={openAdd}
    >
      Add Route
    </DashboardToolbarButton>,
    [openAdd],
  );

  async function saveRoute() {
    if (!form.name.trim()) {
      toastApiError(new Error("Name is required"));
      return;
    }
    setBusy(true);
    try {
      await hrApi.createSupervisorRoute({
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        region: form.region.trim() || undefined,
        crew: form.crew.trim() || undefined,
        escalatesTo: form.escalatesTo.trim() || undefined,
        escalateDelay: form.escalateDelay.trim() || undefined,
        backupName: form.backupName.trim() || undefined,
        coverageWindow: form.coverageWindow.trim() || undefined,
        memberCount: form.memberCount.trim()
          ? Number(form.memberCount)
          : undefined,
        onCall: form.onCall,
        status: form.status || "ACTIVE",
        managerTier: tier,
      });
      toastSuccess("Route added");
      setAddOpen(false);
      setForm(EMPTY_FORM);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading && routes.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <BrandLoader />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
        <DashboardStatGrid>
          <DashboardStatRow columns={5}>
            <DashboardStatCell
              title="Supervisors"
              value={String(kpi.supervisors)}
              meta={kpi.supervisorsMeta}
              icon="lightning"
            />
            <DashboardStatCell
              title="Crews"
              value={String(kpi.crews)}
              meta={kpi.crewsMeta}
              icon="folder"
            />
            <DashboardStatCell
              title="Members"
              value={String(kpi.members)}
              meta={kpi.membersMeta}
              icon="customers"
            />
            <DashboardStatCell
              title="Regions"
              value={String(kpi.regions)}
              meta={kpi.regionsMeta}
              icon="document"
            />
            <DashboardStatCell
              title="Unrouted"
              value={String(kpi.unrouted)}
              meta={kpi.unroutedMeta}
              icon="alert"
            />
          </DashboardStatRow>
        </DashboardStatGrid>

        <div className="flex justify-center">
          <div className="inline-flex rounded-full border border-[#2D2D30] bg-[#141414] p-1">
            {(
              [
                ["OPS_MGR", "Ops Mgr"],
                ["HSE_MGR", "Hse Mgr"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTier(value)}
                className={cn(
                  "rounded-full px-5 py-2 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] transition-colors",
                  tier === value
                    ? "bg-[#1A2744] text-[#6B9EFF]"
                    : "text-[#959597] hover:text-[#FDFDFF]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute top-0 right-[12%] left-[12%] hidden h-px bg-[#3E3E3E] lg:block" />
          <div className="mb-2 hidden justify-center gap-[12%] lg:flex">
            {routes.map((r) => (
              <div key={`line-${r.id}`} className="h-4 w-px bg-[#3E3E3E]" />
            ))}
          </div>
          {routes.length === 0 ? (
            <p className="py-10 text-center font-sans text-[12px] uppercase text-[#959597]">
              No routes for this manager tier
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {routes.map((route) => (
                <SupervisorCard key={route.id} route={route} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#2D2D30] bg-panel px-4 py-4 sm:px-5">
          <h2 className="mb-4 font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            This Structure Drives
          </h2>
          <div className="space-y-3">
            {structureDrives.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 border-b border-[#2A2A2A] pb-3 last:border-0 last:pb-0 sm:grid-cols-[minmax(180px,240px)_1fr] sm:gap-6"
              >
                <button
                  type="button"
                  className="text-left font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#6B9EFF]"
                >
                  {item.label}
                </button>
                <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DashboardModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Route"
        widthClassName="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <DashboardToolbarButton onClick={() => setAddOpen(false)}>
              Cancel
            </DashboardToolbarButton>
            <PayrollPrimaryButton disabled={busy} onClick={() => void saveRoute()}>
              Save Route
            </PayrollPrimaryButton>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldInput
            label="Name"
            value={form.name}
            placeholder="C. HOLLIS"
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          />
          <FieldInput
            label="Code"
            value={form.code}
            placeholder="SR-005"
            onChange={(v) => setForm((f) => ({ ...f, code: v }))}
          />
          <FieldInput
            label="Region"
            value={form.region}
            placeholder="MIDLAND"
            onChange={(v) => setForm((f) => ({ ...f, region: v }))}
          />
          <FieldInput
            label="Crew"
            value={form.crew}
            placeholder="CREW A"
            onChange={(v) => setForm((f) => ({ ...f, crew: v }))}
          />
          <FieldInput
            label="Escalates To"
            value={form.escalatesTo}
            placeholder="OPS MGR"
            onChange={(v) => setForm((f) => ({ ...f, escalatesTo: v }))}
          />
          <FieldInput
            label="Escalate Delay"
            value={form.escalateDelay}
            placeholder="2 BUSINESS DAYS"
            onChange={(v) => setForm((f) => ({ ...f, escalateDelay: v }))}
          />
          <FieldInput
            label="Backup When Absent"
            value={form.backupName}
            placeholder="M. ELLIS"
            onChange={(v) => setForm((f) => ({ ...f, backupName: v }))}
          />
          <FieldInput
            label="Coverage Window"
            value={form.coverageWindow}
            placeholder="24/7"
            onChange={(v) => setForm((f) => ({ ...f, coverageWindow: v }))}
          />
          <FieldInput
            label="Members"
            value={form.memberCount}
            placeholder="8"
            onChange={(v) => setForm((f) => ({ ...f, memberCount: v }))}
          />
          <label className="block min-w-0">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
              Status
            </span>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value }))
              }
              className="h-10 w-full appearance-none rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            >
              <option value="">Select…</option>
              <option value="ACTIVE">Active</option>
              <option value="UNROUTED">Unrouted</option>
            </select>
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.onCall}
              onChange={(e) =>
                setForm((f) => ({ ...f, onCall: e.target.checked }))
              }
              className="h-4 w-4 rounded border-[#3E3E3E] bg-[#1A1A1A]"
            />
            <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
              On-Call
            </span>
          </label>
        </div>
      </DashboardModal>
    </>
  );
}
