"use client";

import * as React from "react";
import {
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  hrApi,
  type HrGpsFlagDetail,
  type HrGpsFlagListItem,
  type HrGpsFlagsOverview,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";
import {
  RejectGpsFlagModal,
  RequestMoreInfoModal,
} from "@/features/hr/gps-flag-modals";

const EMPTY: HrGpsFlagsOverview = {
  kpis: {
    openFlags: 0,
    openMeta: "Unresolved",
    avgDistance: "0.0 MI",
    avgMeta: "From job site",
    oldestFlag: "0D",
    oldestMeta: "Awaiting review",
  },
  flags: [],
};

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20.5 12a8.5 8.5 0 01-14.55 6.05"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M3.5 12A8.5 8.5 0 0118.05 5.95"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M20.5 7.5V12H16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 16.5V12H8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8.5A2.5 2.5 0 016.5 6h2l1.2-1.8A1.5 1.5 0 0111 3.5h2a1.5 1.5 0 011.3.7L15.5 6h2A2.5 2.5 0 0120 8.5v9A2.5 2.5 0 0117.5 20h-11A2.5 2.5 0 014 17.5v-9z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="13" r="3.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function isUnavailable(type: string, label: string) {
  return (
    type === "GPS_UNAVAILABLE" ||
    label.toUpperCase().includes("UNAVAILABLE")
  );
}

function TypeBadge({
  type,
  label,
  solid,
}: {
  type: string;
  label: string;
  solid?: boolean;
}) {
  const unavailable = isUnavailable(type, label);
  if (solid && !unavailable) {
    return (
      <span className="inline-flex rounded-md bg-[#C4A35A] px-2.5 py-1 font-sans text-[9px] font-[590] uppercase tracking-[-0.01em] text-[#111111]">
        {label}
      </span>
    );
  }
  if (unavailable) {
    return (
      <span className="inline-flex rounded-md border border-[#3E3E3E] bg-[#2A2A2A] px-2 py-1 font-sans text-[9px] font-[510] uppercase tracking-[-0.01em] text-[#959597]">
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-md bg-[#3A2A14] px-2 py-1 font-sans text-[9px] font-[510] uppercase tracking-[-0.01em] text-[#D4A35A]">
      {label}
    </span>
  );
}

function PendingBadge() {
  return (
    <span className="inline-flex rounded-full bg-[#2A2A2A] px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.01em] text-[#C8C8C8]">
      Pending
    </span>
  );
}

/** Dark map matching Figma: geofence, trail waypoints, clock-in. */
function FlagMap({ flag }: { flag: HrGpsFlagDetail }) {
  const unavailable = isUnavailable(flag.type, flag.typeLabel);
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#2D2D30] bg-[#14181E]">
      <div
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(#2A3038 1px, transparent 1px), linear-gradient(90deg, #2A3038 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative h-[240px]">
        {/* Job site geofence */}
        <div className="absolute left-[26%] top-[34%] flex flex-col items-center">
          <div className="relative flex h-[72px] w-[72px] items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#3B82F6]/85 bg-[#1A2744]/35" />
            <div className="relative h-2.5 w-2.5 rounded-full bg-[#3B82F6] shadow-[0_0_0_4px_rgba(59,130,246,0.28)]" />
          </div>
          <span className="mt-1.5 font-sans text-[9px] font-[510] uppercase tracking-[-0.01em] text-[#6B9EFF]">
            Job Site
          </span>
        </div>

        {/* GPS trail + waypoints */}
        {!unavailable ? (
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 400 240"
            fill="none"
            aria-hidden
          >
            <path
              d="M130 95 C170 102, 210 128, 268 152"
              stroke="#EF4444"
              strokeWidth="2"
              strokeDasharray="5 5"
              opacity="0.9"
            />
            <circle cx="155" cy="100" r="3" fill="#A1A1AA" />
            <circle cx="195" cy="118" r="3" fill="#A1A1AA" />
            <circle cx="235" cy="138" r="3" fill="#A1A1AA" />
          </svg>
        ) : null}

        {/* Clock-in */}
        <div className="absolute right-[22%] top-[54%] flex flex-col items-center">
          <div
            className={cn(
              "h-3.5 w-3.5 rounded-full shadow-[0_0_0_5px_rgba(239,68,68,0.22)]",
              unavailable ? "bg-[#959597]" : "bg-[#EF4444]",
            )}
          />
          <span
            className={cn(
              "mt-1.5 font-sans text-[9px] font-[510] uppercase tracking-[-0.01em]",
              unavailable ? "text-[#959597]" : "text-[#F87171]",
            )}
          >
            Clock-In
          </span>
        </div>
      </div>

      <div className="relative flex flex-wrap items-center gap-4 border-t border-[#2A2A2A] bg-[#12161C]/90 px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 font-sans text-[9px] uppercase tracking-[-0.01em] text-[#959597]">
          <span className="h-2 w-2 rounded-full bg-[#3B82F6]" /> Job Site
        </span>
        <span className="inline-flex items-center gap-1.5 font-sans text-[9px] uppercase tracking-[-0.01em] text-[#959597]">
          <span className="h-2 w-2 rounded-full bg-[#EF4444]" /> Clock-In
        </span>
        <span className="inline-flex items-center gap-1.5 font-sans text-[9px] uppercase tracking-[-0.01em] text-[#959597]">
          <span className="h-0.5 w-4 border-t border-dashed border-[#A1A1AA]" />{" "}
          GPS Trail
        </span>
      </div>
    </div>
  );
}

export function GpsFlagReviewPage() {
  const [overview, setOverview] = React.useState<HrGpsFlagsOverview>(EMPTY);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<HrGpsFlagDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  useSetHeaderBreadcrumb("Employees & HR / GPS Flag Review");

  const refresh = React.useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useSetHeaderActions(
    <DashboardToolbarButton leftIcon={<RefreshIcon />} onClick={refresh}>
      Refresh Flags
    </DashboardToolbarButton>,
    [refresh],
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await hrApi.gpsFlagsOverview();
        if (cancelled) return;
        setOverview(res.data);
        setSelectedId((prev) => {
          if (prev && res.data.flags.some((f) => f.id === prev)) return prev;
          return res.data.flags[0]?.id ?? null;
        });
      } catch (err) {
        toastApiError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  React.useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void (async () => {
      try {
        const res = await hrApi.getGpsFlag(selectedId);
        if (!cancelled) setDetail(res.data);
      } catch (err) {
        toastApiError(err);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, reloadKey]);

  async function accept() {
    if (!detail) return;
    setBusy(true);
    try {
      await hrApi.decideGpsFlag(detail.id, { decision: "ACCEPTED" });
      toastSuccess("Explanation accepted");
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading && overview.flags.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <BrandLoader />
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
      <DashboardStatGrid>
        <DashboardStatRow columns={3}>
          <DashboardStatCell
            title="Open Flags"
            value={String(overview.kpis.openFlags)}
            meta={overview.kpis.openMeta}
            icon="document"
          />
          <DashboardStatCell
            title="Avg Distance"
            value={overview.kpis.avgDistance}
            meta={overview.kpis.avgMeta}
            icon="time"
          />
          <DashboardStatCell
            title="Oldest Flag"
            value={overview.kpis.oldestFlag}
            meta={overview.kpis.oldestMeta}
            icon="time"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,2.1fr)]">
        {/* Left: flag list */}
        <section className="overflow-hidden rounded-xl border border-[#2D2D30] bg-panel">
          <div className="border-b border-[#2A2A2A] px-4 py-3">
            <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#C4A35A]">
              {overview.flags.length} Open GPS Flags
            </p>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            {overview.flags.map((flag: HrGpsFlagListItem) => {
              const active = flag.id === selectedId;
              return (
                <button
                  key={flag.id}
                  type="button"
                  onClick={() => setSelectedId(flag.id)}
                  className={cn(
                    "relative flex w-full flex-col gap-1.5 border-b border-[#222] px-4 py-3.5 text-left transition-colors",
                    active ? "bg-[#1F1C16]" : "hover:bg-[#171717]",
                  )}
                >
                  {active ? (
                    <span className="absolute inset-y-0 left-0 w-[3px] bg-[#C4A35A]" />
                  ) : null}
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {flag.employee}
                    </p>
                    <span className="shrink-0 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#C4A35A]">
                      {flag.ageLabel}
                    </span>
                  </div>
                  <p className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                    {flag.eventAtLabel}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <TypeBadge type={flag.type} label={flag.typeLabel} />
                    <span className="font-sans text-[10px] font-[510] uppercase tracking-[-0.01em] text-[#959597]">
                      {flag.distanceLabel}
                    </span>
                  </div>
                </button>
              );
            })}
            {overview.flags.length === 0 ? (
              <p className="px-4 py-8 text-center font-sans text-[11px] uppercase text-[#959597]">
                No open GPS flags
              </p>
            ) : null}
          </div>
        </section>

        {/* Right: detail */}
        <section className="rounded-xl border border-[#2D2D30] bg-panel">
          {detailLoading && !detail ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <BrandLoader />
            </div>
          ) : detail ? (
            <div className="space-y-4 p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <TypeBadge
                  type={detail.type}
                  label={detail.typeLabel}
                  solid
                />
                <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#C8C8C8]">
                  {detail.title}
                </p>
              </div>

              <FlagMap flag={detail} />

              <div className="rounded-lg border border-[#5A2020] bg-[#3B1515] px-4 py-2.5">
                <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.01em] text-[#F0A0A0]">
                  {detail.alertBanner}
                </p>
              </div>

              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {[
                  { label: "Time of Event", value: detail.timeOfEvent },
                  { label: "Work Order", value: detail.workOrder || "—" },
                  { label: "Customer", value: detail.customer || "—" },
                  { label: "Flag Age", value: detail.flagAge },
                ].map((row) => (
                  <div key={row.label}>
                    <p className="mb-1 font-sans text-[9px] uppercase tracking-[-0.01em] text-[#959597]">
                      {row.label}
                    </p>
                    <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-1.5 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                  Technician Explanation
                </p>
                <div className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-3 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.01em] text-[#C8C8C8]">
                  {detail.explanation || "No explanation submitted."}
                </div>
              </div>

              {detail.photoMeta || detail.photoLabel ? (
                <div>
                  <p className="mb-1.5 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                    Attached Photo
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#2D2D30] bg-[#222] text-[#6F6F72]">
                      <CameraIcon />
                    </div>
                    <p className="min-w-0 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.01em] text-[#C8C8C8]">
                      {detail.photoMeta || detail.photoLabel}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3 border-t border-[#2A2A2A] pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                    Supervisor Decision
                  </span>
                  <PendingBadge />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <DashboardToolbarButton onClick={() => setRejectOpen(true)}>
                    Reject with Reason
                  </DashboardToolbarButton>
                  <DashboardToolbarButton onClick={() => setInfoOpen(true)}>
                    Request More Information
                  </DashboardToolbarButton>
                  <PayrollPrimaryButton
                    disabled={busy}
                    onClick={() => void accept()}
                  >
                    Accept Explanation
                  </PayrollPrimaryButton>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[40vh] items-center justify-center px-4">
              <p className="font-sans text-[11px] uppercase text-[#959597]">
                Select a flag to review
              </p>
            </div>
          )}
        </section>
      </div>

      <RejectGpsFlagModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        flag={detail}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
      <RequestMoreInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        flag={detail}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
