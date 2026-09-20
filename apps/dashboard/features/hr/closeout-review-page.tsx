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
  type HrCloseoutDetail,
  type HrCloseoutListItem,
  type HrCloseoutsOverview,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";
import {
  OpsAlreadyActionedState,
  OpsAllCloseoutsReviewedState,
  OpsLoadFailedState,
  OpsLoadingListState,
} from "@/features/operations/operations-states";
import { ApiError } from "@dark-horse-safety/api-client";

const EMPTY: HrCloseoutsOverview = {
  kpis: {
    openFlags: 0,
    openMeta: "Unresolved",
    avgDistance: "0.0 MI",
    avgMeta: "From job site",
    oldestFlag: "0D",
    oldestMeta: "Awaiting review",
  },
  pending: [],
  pendingCount: 0,
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

function WarnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4l9 16H3L12 4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="6"
        y="11"
        width="12"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8.5 11V8.5a3.5 3.5 0 017 0V11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
      {children}
    </p>
  );
}

export function CloseoutReviewPage() {
  const [overview, setOverview] = React.useState<HrCloseoutsOverview>(EMPTY);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<HrCloseoutDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [alreadyActioned, setAlreadyActioned] = React.useState<{
    actionedBy: string;
    actionedAgo: string;
  } | null>(null);

  useSetHeaderBreadcrumb("Employees & HR / Closeout Review");

  const refresh = React.useCallback(() => setReloadKey((k) => k + 1), []);

  const refreshFlags = React.useCallback(async () => {
    try {
      const res = await hrApi.refreshCloseoutFlags();
      toastSuccess(res.data.message);
      refresh();
    } catch (err) {
      toastApiError(err);
    }
  }, [refresh]);

  useSetHeaderActions(
    <DashboardToolbarButton onClick={() => void refreshFlags()}>
      <span className="inline-flex items-center gap-1.5">
        <RefreshIcon />
        Refresh Flags
      </span>
    </DashboardToolbarButton>,
    [refreshFlags],
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const res = await hrApi.closeoutsOverview();
        if (cancelled) return;
        setOverview(res.data);
        setSelectedId((prev) => {
          if (prev && res.data.pending.some((p) => p.id === prev)) return prev;
          return res.data.pending[0]?.id ?? null;
        });
      } catch (err) {
        if (!cancelled) {
          setLoadError("Couldn't load closeout review.");
          setOverview(EMPTY);
          toastApiError(err);
        }
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
      setAlreadyActioned(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setAlreadyActioned(null);
    void (async () => {
      try {
        const res = await hrApi.getCloseout(selectedId);
        if (cancelled) return;
        setDetail(res.data);
        if (res.data.status !== "PENDING") {
          setAlreadyActioned({
            actionedBy: res.data.decidedByName || "Someone",
            actionedAgo: res.data.actionedAgo || "just now",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          toastApiError(err);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, reloadKey]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (busy || !selectedId) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const idx = overview.pending.findIndex((p) => p.id === selectedId);
      if (e.key === "ArrowDown" && idx < overview.pending.length - 1) {
        e.preventDefault();
        setSelectedId(overview.pending[idx + 1]!.id);
      } else if (e.key === "ArrowUp" && idx > 0) {
        e.preventDefault();
        setSelectedId(overview.pending[idx - 1]!.id);
      } else if (e.key.toLowerCase() === "a") {
        e.preventDefault();
        void decide("ACCEPT");
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        void decide("RETURN");
      } else if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        void decide("HOLD");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, selectedId, overview.pending]);

  async function decide(decision: "ACCEPT" | "RETURN" | "HOLD") {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      await hrApi.decideCloseout(selectedId, { decision });
      toastSuccess(
        decision === "ACCEPT"
          ? "Closeout accepted"
          : decision === "RETURN"
            ? "Returned for correction"
            : "Closeout held",
      );
      setAlreadyActioned(null);
      refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === "ALREADY_ACTIONED") {
        setAlreadyActioned({
          actionedBy: err.details?.actionedBy?.[0] || "Someone",
          actionedAgo: err.details?.actionedAgo?.[0] || "just now",
        });
        refresh();
        return;
      }
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading && overview.pending.length === 0) {
    return (
      <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
        <OpsLoadingListState rows={5} />
      </div>
    );
  }

  if (loadError && overview.pending.length === 0) {
    return (
      <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
        <OpsLoadFailedState description={loadError} onRetry={() => refresh()} />
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-sans text-[18px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">
          Closeout Review
        </h1>
      </div>

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

      {overview.pending.length === 0 ? (
        <OpsAllCloseoutsReviewedState />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
          <aside className="rounded-xl border border-[#2D2D30] bg-panel">
            <div className="border-b border-[#2A2A2A] px-3 py-3">
              <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
                {overview.pendingCount} Closeout
                {overview.pendingCount === 1 ? "" : "s"} Pending Review
              </p>
            </div>
            <ul className="max-h-[70vh] overflow-y-auto">
              {overview.pending.map((item) => (
                <CloseoutListRow
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  onSelect={() => {
                    setAlreadyActioned(null);
                    setSelectedId(item.id);
                  }}
                />
              ))}
            </ul>
          </aside>

          <section className="rounded-xl border border-[#2D2D30] bg-panel">
            {alreadyActioned ? (
              <div className="p-4 sm:p-5">
                <OpsAlreadyActionedState
                  actionedBy={alreadyActioned.actionedBy}
                  actionedAgo={alreadyActioned.actionedAgo}
                />
              </div>
            ) : detailLoading && !detail ? (
              <div className="p-4">
                <OpsLoadingListState rows={4} showLabel={false} />
              </div>
            ) : detail ? (
              <CloseoutDetailPanel
                detail={detail}
                busy={busy}
                onReturn={() => void decide("RETURN")}
                onHold={() => void decide("HOLD")}
                onAccept={() => void decide("ACCEPT")}
              />
            ) : (
              <div className="p-6">
                <OpsAllCloseoutsReviewedState />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function CloseoutListRow({
  item,
  selected,
  onSelect,
}: {
  item: HrCloseoutListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-start gap-2 border-b border-[#2A2A2A] px-3 py-3 text-left transition-colors",
          selected
            ? "border-l-2 border-l-[#C4A35A] bg-[#1A1814]"
            : "border-l-2 border-l-transparent hover:bg-[#161616]",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {item.workOrderCode} · {item.customerShort}
          </p>
          <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">
            {item.technician}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-sans text-[9px] uppercase text-[#6F6F72]">
            {item.ageLabel}
          </span>
          {item.flagCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#3B2020] px-1.5 py-0.5 font-sans text-[9px] font-[510] text-[#E8A0A0]">
              <WarnIcon />
              {item.flagCount}
            </span>
          ) : null}
        </div>
      </button>
    </li>
  );
}

function CloseoutDetailPanel({
  detail,
  busy,
  onReturn,
  onHold,
  onAccept,
}: {
  detail: HrCloseoutDetail;
  busy: boolean;
  onReturn: () => void;
  onHold: () => void;
  onAccept: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-5 p-4 sm:p-5">
        <div>
          <h2 className="font-sans text-[14px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {detail.headerLabel}
          </h2>
          <p className="mt-2 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            Service date: {detail.serviceDateLabel} · Submitted by:{" "}
            {detail.submittedBy} · Submitted: {detail.submittedAtLabel}
          </p>
        </div>

        {detail.flags.length > 0 ? (
          <div>
            <div className="mb-2 flex items-center gap-2 text-[#C4A35A]">
              <WarnIcon />
              <SectionLabel>Auto-Flagged</SectionLabel>
            </div>
            <div className="space-y-2">
              {detail.flags.map((f) => (
                <div
                  key={`${f.code}-${f.message}`}
                  className="rounded-lg border border-[#C4A35A]/35 bg-[#2A2618] px-3 py-2.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#C4A35A]"
                >
                  {f.message}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <SectionLabel>Time Summary</SectionLabel>
          <div className="overflow-hidden rounded-lg border border-[#2A2A2A]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A2A2A] bg-[#161616]">
                  {["Technician", "Clocked", "Billable", "Non-Billable"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#6F6F72]"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {detail.timeRows.map((row) => (
                  <tr
                    key={row.technician}
                    className="border-b border-[#2A2A2A] last:border-0"
                  >
                    <td className="px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]">
                      {row.technician}
                    </td>
                    <td className="px-3 py-2 font-sans text-[11px] uppercase text-[#C8C8C8]">
                      {row.clocked.toFixed(1)} H
                    </td>
                    <td className="px-3 py-2 font-sans text-[11px] uppercase text-[#C8C8C8]">
                      {row.billable.toFixed(1)} H
                    </td>
                    <td className="px-3 py-2 font-sans text-[11px] uppercase text-[#C8C8C8]">
                      {row.nonBillable.toFixed(1)} H
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <SectionLabel>Required Forms</SectionLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {detail.forms.map((form) => {
              const ok = form.status === "SUBMITTED";
              return (
                <div
                  key={form.name}
                  className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2"
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      ok ? "bg-[#22C55E]" : "bg-[#EF4444]",
                    )}
                  />
                  <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                    {form.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <SectionLabel>Photos & Signatures</SectionLabel>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {detail.photos.map((p) => (
              <div
                key={p.label}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] text-[#6F6F72]"
              >
                <LockIcon />
                <span className="font-sans text-[9px] uppercase">Locked</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Sales Ticket</SectionLabel>
          <div className="overflow-hidden rounded-lg border border-[#2A2A2A]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A2A2A] bg-[#161616]">
                  {["Line Item", "Hours", "Total"].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-3 py-2 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#6F6F72]",
                        h === "Total" ? "text-right" : "text-left",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.salesLines.map((line) => (
                  <tr
                    key={line.item}
                    className="border-b border-[#2A2A2A] last:border-0"
                  >
                    <td className="px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]">
                      {line.item}
                    </td>
                    <td className="px-3 py-2 font-sans text-[11px] uppercase text-[#C8C8C8]">
                      {line.hoursLabel}
                    </td>
                    <td className="px-3 py-2 text-right font-sans text-[11px] uppercase text-[#FDFDFF]">
                      {line.totalLabel}
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#161616]">
                  <td
                    colSpan={2}
                    className="px-3 py-2 text-right font-sans text-[11px] font-[510] uppercase text-[#959597]"
                  >
                    Total
                  </td>
                  <td className="px-3 py-2 text-right font-sans text-[11px] font-[590] uppercase text-[#FDFDFF]">
                    {detail.salesTotalLabel}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <SectionLabel>Purchase Orders</SectionLabel>
          <ul className="space-y-2">
            {detail.purchaseOrders.map((po) => (
              <li
                key={po.code}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2.5"
              >
                <span
                  className={cn(
                    "font-sans text-[11px] uppercase",
                    po.overThreshold ? "text-[#C4A35A]" : "text-[#FDFDFF]",
                  )}
                >
                  {po.code} · {po.label}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-sans text-[11px] uppercase",
                    po.overThreshold ? "text-[#C4A35A]" : "text-[#C8C8C8]",
                  )}
                >
                  {po.amountLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 border-t border-[#2A2A2A] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
          Keyboard: A = Accept · R = Return · H = Hold · ↑↓ to move
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <DashboardToolbarButton disabled={busy} onClick={onReturn}>
            Return for Correction
          </DashboardToolbarButton>
          <DashboardToolbarButton disabled={busy} onClick={onHold}>
            Hold
          </DashboardToolbarButton>
          <PayrollPrimaryButton disabled={busy} onClick={onAccept}>
            Accept
          </PayrollPrimaryButton>
        </div>
      </div>
    </div>
  );
}
