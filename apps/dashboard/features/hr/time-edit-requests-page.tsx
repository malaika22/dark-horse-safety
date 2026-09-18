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
  downloadCsv,
  hrApi,
  type HrTimeEditRequest,
  type HrTimeEditRequestKpi,
} from "@/lib/hr-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { useCrmDialogs } from "@/features/crm/use-crm-dialogs";
import {
  ApproveRequestModal,
  ClarifyRequestModal,
  OverrideConfirmModal,
  RejectRequestModal,
  formatRange,
  hoursLabel,
  isLockedOverride,
  typeBadgeClass,
} from "@/features/hr/time-edit-request-modals";

const EMPTY_KPI: HrTimeEditRequestKpi = {
  pending: 0,
  needsClarification: 0,
  approvedCycle: 0,
  avgTurnaroundHours: 0,
  rejectedCycle: 0,
  lockedCycle: false,
  cycleLabel: "",
};

type ModalKind = "clarify" | "approve" | "reject" | "override" | null;

function NoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 8v8M8 12h8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TimeEditRequestsPage() {
  const { askPrompt, dialogs } = useCrmDialogs();
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [kpi, setKpi] = React.useState<HrTimeEditRequestKpi>(EMPTY_KPI);
  const [rows, setRows] = React.useState<HrTimeEditRequest[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [adminNote, setAdminNote] = React.useState("");
  const [reloadKey, setReloadKey] = React.useState(0);
  const [modal, setModal] = React.useState<ModalKind>(null);

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;
  const locked = selected ? isLockedOverride(selected) : false;

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [kpiRes, openRes] = await Promise.all([
          hrApi.timeEditRequestsKpi(),
          hrApi.listTimeEditRequests({ pageSize: 50 }),
        ]);
        if (cancelled) return;
        setKpi(kpiRes.data);
        const items = openRes.data.items;
        setRows(items);
        setSelectedId((prev) =>
          prev && items.some((i) => i.id === prev)
            ? prev
            : (items[0]?.id ?? null),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setRows([]);
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
    setAdminNote("");
  }, [selected?.id]);

  useSetHeaderBreadcrumb("Employees & HR / Timesheets / Time Corrections");

  const onAddNote = React.useCallback(() => {
    void (async () => {
      const text = await askPrompt({
        title: "Add note",
        label: "Note",
        placeholder: "Internal note…",
        confirmLabel: "Add Note",
      });
      if (text == null || !text.trim()) return;
      setBusy(true);
      try {
        await hrApi.addTimeEditNote(text.trim(), selected?.id);
        toastSuccess("Note added");
        setReloadKey((k) => k + 1);
      } catch (err) {
        toastApiError(err);
      } finally {
        setBusy(false);
      }
    })();
  }, [askPrompt, selected?.id]);

  const onExport = React.useCallback(() => {
    void (async () => {
      setBusy(true);
      try {
        const res = await hrApi.exportTimeEditRequests();
        downloadCsv(res.data.csv, res.data.filename);
        toastSuccess("Export downloaded");
      } catch (err) {
        toastApiError(err);
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  useSetHeaderActions(
    <div className="flex items-center justify-end gap-2">
      <DashboardToolbarButton
        disabled={busy}
        onClick={onAddNote}
        leftIcon={<NoteIcon />}
        className="h-8 shrink-0 self-center"
      >
        Add Note
      </DashboardToolbarButton>
      <DashboardToolbarButton
        variant="primary"
        disabled={busy}
        onClick={onExport}
        leftIcon={<ExportIcon />}
        className="h-8 shrink-0 self-center"
      >
        Export Log
      </DashboardToolbarButton>
    </div>,
    [busy, onAddNote, onExport],
  );

  async function persistNoteIfNeeded(req: HrTimeEditRequest) {
    if (adminNote === (req.adminNote ?? "")) return;
    await hrApi.saveTimeEditAdminNote(req.id, adminNote);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-shell">
        <BrandLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 bg-shell p-5">
        <p className="font-sans text-[12px] uppercase text-[#FF6B6B]">{error}</p>
        <DashboardToolbarButton onClick={() => setReloadKey((k) => k + 1)}>
          Retry
        </DashboardToolbarButton>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 bg-shell p-3 sm:p-5">
        <DashboardStatGrid>
          <DashboardStatRow>
            <DashboardStatCell
              title="Pending"
              value={String(kpi.pending)}
              meta={`${kpi.needsClarification} need clarification`}
              icon="document"
            />
            <DashboardStatCell
              title="Approved (Cycle)"
              value={String(kpi.approvedCycle)}
              meta={`Avg turnaround ${kpi.avgTurnaroundHours}H`}
              icon="time"
            />
            <DashboardStatCell
              title="Rejected (Cycle)"
              value={String(kpi.rejectedCycle)}
              meta={kpi.lockedCycle ? "Locked cycle" : "Open cycle"}
              icon="document"
            />
          </DashboardStatRow>
        </DashboardStatGrid>

        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-xl bg-panel">
            <div className="px-4 pb-1 pt-4 sm:px-5">
              <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                Requests ({rows.length})
              </p>
            </div>
            <ul className="px-2 pb-3 sm:px-3">
              {rows.length === 0 ? (
                <li className="px-3 py-8 text-center font-sans text-[11px] uppercase text-[#959597]">
                  No open requests
                </li>
              ) : (
                rows.map((row) => {
                  const active = selected?.id === row.id;
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        className={cn(
                          "mt-2 w-full rounded-lg border px-3 py-3 text-left transition-colors",
                          active
                            ? "border-[#3B82F6] bg-[#1A1A1A]"
                            : "border-transparent bg-transparent hover:bg-[#1A1A1A]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                              {row.technician.name}
                            </p>
                            <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">
                              {row.dateLabel}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-sans text-[11px] font-[510] uppercase text-[#FDFDFF]">
                              {isLockedOverride(row)
                                ? "Override Req."
                                : row.deltaLabel}
                            </p>
                            <p className="mt-1 font-sans text-[9px] uppercase text-[#6B6B6B]">
                              {row.relativeTime ?? "—"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "mt-2 inline-flex rounded-full px-2 py-0.5 font-sans text-[9px] font-[510] uppercase",
                            typeBadgeClass(row.type),
                          )}
                        >
                          {row.typeLabel}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          <div className="overflow-hidden rounded-xl bg-panel">
            {selected ? (
              <div className="flex h-full flex-col px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-sans text-[18px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
                      {selected.technician.name}
                    </h2>
                    <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                      {[
                        selected.workOrderCode,
                        selected.dateLabel,
                        selected.customerName,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 font-sans text-[9px] font-[510] uppercase",
                      typeBadgeClass(selected.type),
                    )}
                  >
                    {selected.typeLabel}
                  </span>
                </div>

                {locked ? (
                  <div className="mt-5 grid gap-4 border-y border-[#2D2D30] py-4 sm:grid-cols-3">
                    <div>
                      <p className="font-sans text-[10px] uppercase text-[#959597]">
                        Original Value
                      </p>
                      <p className="mt-1.5 font-sans text-[22px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
                        {hoursLabel(selected.originalHours)}
                      </p>
                      <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6B]">
                        {selected.payrollCycleLabel ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="font-sans text-[10px] uppercase text-[#959597]">
                        Requested Value
                      </p>
                      <p className="mt-1.5 font-sans text-[22px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
                        {hoursLabel(selected.requestedHours)}
                      </p>
                      <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6B]">
                        {selected.cycleClosedLabel ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="font-sans text-[10px] uppercase text-[#959597]">
                        Difference
                      </p>
                      <p className="mt-1.5 font-sans text-[22px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
                        {selected.deltaLabel}
                      </p>
                      <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6B]">
                        {selected.dollarDeltaLabel ?? "—"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4 border-y border-[#2D2D30] py-4 sm:grid-cols-3">
                    <div>
                      <p className="font-sans text-[10px] uppercase text-[#959597]">
                        Original Value
                      </p>
                      <p className="mt-1.5 font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                        {formatRange(
                          selected.originalClockIn,
                          selected.originalClockOut,
                        )}
                      </p>
                      <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6B]">
                        {hoursLabel(selected.originalHours)}
                      </p>
                    </div>
                    <div>
                      <p className="font-sans text-[10px] uppercase text-[#959597]">
                        Requested Value
                      </p>
                      <p className="mt-1.5 font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                        {formatRange(
                          selected.requestedClockIn,
                          selected.requestedClockOut,
                        )}
                      </p>
                      <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6B]">
                        {hoursLabel(selected.requestedHours)}
                      </p>
                    </div>
                    <div>
                      <p className="font-sans text-[10px] uppercase text-[#959597]">
                        Difference
                      </p>
                      <p className="mt-1.5 font-sans text-[20px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">
                        {selected.deltaLabel}
                      </p>
                      <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6B]">
                        {selected.differenceKind}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-4">
                  <div>
                    <p className="mb-1.5 font-sans text-[10px] uppercase text-[#959597]">
                      Reason from Technician
                    </p>
                    <div className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-3">
                      <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF]">
                        {selected.technicianReason ?? "—"}
                      </p>
                    </div>
                  </div>

                  {locked && selected.auditWarning ? (
                    <div>
                      <p className="mb-1.5 font-sans text-[10px] uppercase text-[#959597]">
                        Audit Warning
                      </p>
                      <div className="rounded-lg border border-[#7F1D1D] bg-[#2A1212] px-3 py-3">
                        <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#F87171]">
                          {selected.auditWarning}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {!locked && selected.gpsContext ? (
                    <div>
                      <p className="mb-1.5 font-sans text-[10px] uppercase text-[#959597]">
                        GPS Context
                      </p>
                      <div className="rounded-lg border border-[#1E3A5F] bg-[#0F1B2D] px-3 py-3">
                        <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#93C5FD]">
                          {selected.gpsContext}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <p className="mb-1.5 font-sans text-[10px] uppercase text-[#959597]">
                      Admin Note (Optional)
                    </p>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={3}
                      placeholder="INTERNAL NOTE FOR THIS REQUEST..."
                      className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2.5 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none placeholder:text-[#6B6B6B]"
                    />
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <DashboardToolbarButton
                      disabled={busy}
                      onClick={() => setModal("clarify")}
                      className="h-8 shrink-0"
                    >
                      Ask for Clarification
                    </DashboardToolbarButton>
                    <DashboardToolbarButton
                      disabled={busy}
                      onClick={() => setModal("reject")}
                      className="h-8 shrink-0"
                    >
                      Reject
                    </DashboardToolbarButton>
                  </div>
                  {locked ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setModal("override")}
                      className="inline-flex h-8 min-h-8 w-full items-center justify-center rounded-lg bg-[#DC2626] px-4 font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-white transition-opacity disabled:opacity-50 sm:ml-auto sm:w-[min(100%,45%)]"
                    >
                      Admin Override
                    </button>
                  ) : (
                    <DashboardToolbarButton
                      variant="primary"
                      disabled={busy}
                      className="h-8 w-full shrink-0 sm:ml-auto sm:w-[min(100%,45%)]"
                      onClick={() => setModal("approve")}
                    >
                      Approve {selected.deltaLabel}
                    </DashboardToolbarButton>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center px-4 py-8">
                <p className="font-sans text-[11px] uppercase text-[#959597]">
                  Select a request to review
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ClarifyRequestModal
        open={modal === "clarify"}
        request={selected}
        busy={busy}
        onClose={() => setModal(null)}
        onConfirm={(question) => {
          if (!selected) return;
          void (async () => {
            setBusy(true);
            try {
              await persistNoteIfNeeded(selected);
              await hrApi.clarifyTimeEditRequest(selected.id, question);
              toastSuccess("Clarification requested");
              setModal(null);
              setReloadKey((k) => k + 1);
            } catch (err) {
              toastApiError(err);
            } finally {
              setBusy(false);
            }
          })();
        }}
      />

      <ApproveRequestModal
        open={modal === "approve"}
        request={selected}
        busy={busy}
        onClose={() => setModal(null)}
        onConfirm={(note) => {
          if (!selected) return;
          void (async () => {
            setBusy(true);
            try {
              await hrApi.approveTimeEditRequest(
                selected.id,
                note || adminNote || undefined,
              );
              toastSuccess("Request approved");
              setModal(null);
              setReloadKey((k) => k + 1);
            } catch (err) {
              toastApiError(err);
            } finally {
              setBusy(false);
            }
          })();
        }}
      />

      <RejectRequestModal
        open={modal === "reject"}
        request={selected}
        busy={busy}
        onClose={() => setModal(null)}
        onConfirm={(reason) => {
          if (!selected) return;
          void (async () => {
            setBusy(true);
            try {
              await persistNoteIfNeeded(selected);
              await hrApi.rejectTimeEditRequest(selected.id, reason);
              toastSuccess("Request rejected");
              setModal(null);
              setReloadKey((k) => k + 1);
            } catch (err) {
              toastApiError(err);
            } finally {
              setBusy(false);
            }
          })();
        }}
      />

      <OverrideConfirmModal
        open={modal === "override"}
        request={selected}
        busy={busy}
        onClose={() => setModal(null)}
        onConfirm={() => {
          if (!selected) return;
          void (async () => {
            setBusy(true);
            try {
              await hrApi.adminOverrideTimeEditRequest(selected.id, {
                adminNote: adminNote || undefined,
                overrideByName: "Ryan Crawford (CEO)",
              });
              toastSuccess("Admin override confirmed");
              setModal(null);
              setReloadKey((k) => k + 1);
            } catch (err) {
              toastApiError(err);
            } finally {
              setBusy(false);
            }
          })();
        }}
      />

      {dialogs}
    </>
  );
}
