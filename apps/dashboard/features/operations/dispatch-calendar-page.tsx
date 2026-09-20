"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardDataTable,
  DashboardFilterChips,
  DashboardSearchInput,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import {
  operationsApi,
  type DispatchBoard,
  type DispatchCard,
  type DispatchKpi,
  type DispatchOptions,
} from "@/lib/operations-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import {
  AssignJobModal,
  ConfirmRescheduleModal,
  DispatchWorkOrderCardModal,
  EligibilityCheckModal,
  HardGateOverrideModal,
  ReassignAfterDeclineModal,
} from "@/features/operations/dispatch-modals";
import {
  OpsLoadFailedState,
  OpsLoadingListState,
  OpsNothingScheduledState,
  OpsAllCaughtUpState,
} from "@/features/operations/operations-states";

type Tab = "SCHEDULE" | "ACCEPTANCE";
type ViewMode = "BOARD" | "TABLE";

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeekMonday(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay();
  const offset = (day + 6) % 7;
  x.setUTCDate(x.getUTCDate() - offset);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function cardTone(card: DispatchCard) {
  const s = card.status.toUpperCase();
  if (s === "ACCEPTED") return "border-[#203B2C] bg-[#163024] text-[#ACEBCE]";
  if (s === "PTO") return "border-[#2A2A2A] bg-[#1A1A1A] text-[#959597]";
  if (s === "CONFLICT" || card.conflictKind === "CERT" || card.conflictKind === "ASSET" || card.conflictKind === "OVERLAP")
    return "border-[#7F1D1D]/50 bg-[#3B2020] text-[#E8A0A0]";
  if (s === "DECLINED" || s === "NO_RESPONSE" || card.conflictKind === "CUSTOMER_REQ")
    return "border-[#C4A35A]/40 bg-[#2A2618] text-[#C4A35A]";
  if (s === "POSTED") return "border-[#C4A35A]/40 bg-[#2A2618] text-[#C4A35A]";
  return "border-[#2D2D30] bg-[#161616] text-[#FDFDFF]";
}

const EMPTY_KPI: DispatchKpi = {
  toDispatch: 0,
  toDispatchMeta: "Next 7 days",
  postedToMobile: 0,
  postedMeta: "Awaiting acceptance",
  accepted: 0,
  acceptedMeta: "Crews confirmed",
  needsReassign: 0,
  needsReassignMeta: "Declined · No response",
  noResponse: 0,
  noResponseMeta: "Over 2 hrs",
  conflicts: 0,
  conflictsMeta: "Cert · Asset · Overlap",
  rangeLabel: "—",
  from: "",
  to: "",
};

export function DispatchCalendarPage() {
  const router = useRouter();
  const weekStart = React.useMemo(() => startOfWeekMonday(new Date()), []);
  const [from, setFrom] = React.useState(() => isoDay(weekStart));
  const [to, setTo] = React.useState(() => isoDay(addDays(weekStart, 6)));
  const [tab, setTab] = React.useState<Tab>("SCHEDULE");
  const [view, setView] = React.useState<ViewMode>("BOARD");
  const [q, setQ] = React.useState("");
  const [crew, setCrew] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [kpi, setKpi] = React.useState<DispatchKpi>(EMPTY_KPI);
  const [board, setBoard] = React.useState<DispatchBoard | null>(null);
  const [acceptance, setAcceptance] = React.useState<DispatchCard[]>([]);
  const [options, setOptions] = React.useState<DispatchOptions | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [selectedCard, setSelectedCard] = React.useState<DispatchCard | null>(null);
  const [cardOpen, setCardOpen] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignDefaults, setAssignDefaults] = React.useState<{
    employeeId?: string;
    scheduledDate?: string;
  }>({});
  const [eligibilityWoId, setEligibilityWoId] = React.useState<string | null>(null);
  const [eligibilityOpen, setEligibilityOpen] = React.useState(false);
  const [overrideOpen, setOverrideOpen] = React.useState(false);
  const [overrideCtx, setOverrideCtx] = React.useState<{
    assignmentId: string;
    techName: string;
    requirement: string;
  } | null>(null);
  const [reassignId, setReassignId] = React.useState<string | null>(null);
  const [reassignOpen, setReassignOpen] = React.useState(false);
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [rescheduleBusy, setRescheduleBusy] = React.useState(false);
  const [reschedulePreview, setReschedulePreview] = React.useState<{
    id: string;
    jobLabel: string;
    fromLabel: string;
    toLabel: string;
    conflictMessage?: string | null;
    employeeId?: string;
    scheduledDate?: string;
  } | null>(null);

  useSetHeaderBreadcrumb("Jobs / Operations / Dispatch");

  const refresh = React.useCallback(() => setReloadKey((k) => k + 1), []);

  const postToMobile = React.useCallback(async () => {
    try {
      const res = await operationsApi.postDispatchToMobile();
      toastSuccess(res.data.message);
      refresh();
    } catch (err) {
      toastApiError(err);
    }
  }, [refresh]);

  const notifyTechs = React.useCallback(async () => {
    try {
      const res = await operationsApi.notifyDispatchTechs();
      toastSuccess(res.data.message);
    } catch (err) {
      toastApiError(err);
    }
  }, []);

  useSetHeaderActions(
    <div className="flex flex-wrap items-center gap-2">
      <DashboardToolbarButton onClick={() => void notifyTechs()}>
        Notify Techs
      </DashboardToolbarButton>
      <DashboardToolbarButton variant="primary" showChevron onClick={() => void postToMobile()}>
        Post to Mobile
      </DashboardToolbarButton>
    </div>,
    [notifyTechs, postToMobile],
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const [kpiRes, optRes] = await Promise.all([
          operationsApi.dispatchKpi({ from, to }),
          operationsApi.dispatchOptions(),
        ]);
        if (cancelled) return;
        setKpi(kpiRes.data);
        setOptions(optRes.data);

        if (tab === "SCHEDULE") {
          const boardRes = await operationsApi.dispatchSchedule({
            from,
            to,
            crew: crew || undefined,
            customerId: customerId || undefined,
            q: q || undefined,
          });
          if (cancelled) return;
          setBoard(boardRes.data);
          if (view === "TABLE") {
            const flat = boardRes.data.rows.flatMap((row) =>
              row.cells.flatMap((cell) => cell.cards.filter((c) => !c.isPto)),
            );
            setAcceptance([...flat, ...boardRes.data.unassigned]);
          }
        } else {
          const listRes = await operationsApi.dispatchAcceptance({
            from,
            to,
            q: q || undefined,
            pageSize: 50,
          });
          if (!cancelled) setAcceptance(listRes.data.items);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError("Couldn't load dispatch schedule.");
          toastApiError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to, tab, view, q, crew, customerId, reloadKey]);

  function shiftWeek(delta: number) {
    const start = addDays(new Date(`${from}T12:00:00.000Z`), delta * 7);
    const monday = startOfWeekMonday(start);
    setFrom(isoDay(monday));
    setTo(isoDay(addDays(monday, 6)));
  }

  async function openReschedule(card: DispatchCard) {
    if (!card.employeeId || card.isPto) return;
    const nextDate = isoDay(addDays(new Date(`${card.scheduledDate}T12:00:00.000Z`), 1));
    try {
      const res = await operationsApi.rescheduleDispatch(card.id, {
        scheduledDate: nextDate,
        force: false,
      });
      if (res.data.preview) {
        setReschedulePreview({
          id: card.id,
          jobLabel: res.data.jobLabel || `${card.locationName} · ${card.workOrderCode}`,
          fromLabel: res.data.fromLabel || `${card.employeeName} · ${card.scheduledDate}`,
          toLabel: res.data.toLabel || nextDate,
          conflictMessage: res.data.conflict?.message ?? null,
          scheduledDate: nextDate,
        });
        setRescheduleOpen(true);
      } else {
        toastSuccess("Rescheduled");
        refresh();
      }
    } catch (err) {
      toastApiError(err);
    }
  }

  async function confirmReschedule() {
    if (!reschedulePreview) return;
    setRescheduleBusy(true);
    try {
      await operationsApi.rescheduleDispatch(reschedulePreview.id, {
        scheduledDate: reschedulePreview.scheduledDate,
        employeeId: reschedulePreview.employeeId,
        force: true,
      });
      toastSuccess("Reschedule confirmed");
      setRescheduleOpen(false);
      setReschedulePreview(null);
      refresh();
    } catch (err) {
      toastApiError(err);
    } finally {
      setRescheduleBusy(false);
    }
  }

  const acceptanceColumns = React.useMemo<DashboardDataTableColumn<DispatchCard>[]>(
    () => [
      {
        id: "wo",
        header: "WO Number",
        cell: (row) => (
          <button
            type="button"
            className="font-sans text-[11px] uppercase text-[#8B9BB4] hover:underline"
            onClick={() => row.workOrderId && router.push(`/operations/work-orders/${row.workOrderId}`)}
          >
            {row.workOrderCode}
          </button>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
            {row.customerName}
          </span>
        ),
      },
      {
        id: "location",
        header: "Location",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.locationName}
          </span>
        ),
      },
      {
        id: "type",
        header: "Job Type",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.category || row.jobType || "—"}
          </span>
        ),
      },
      {
        id: "date",
        header: "Job Date",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.scheduledDate}
          </span>
        ),
      },
      {
        id: "tech",
        header: "Tech",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
            {row.techLabel || row.employeeName}
          </span>
        ),
      },
      {
        id: "posted",
        header: "Posted",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#8B9BB4]">
            {row.postedLabel || "—"}
          </span>
        ),
      },
      {
        id: "response",
        header: "Response",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 font-sans text-[10px] uppercase",
              row.status === "ACCEPTED" && "bg-[#203B2C] text-[#ACEBCE]",
              row.status === "DECLINED" && "bg-[#203B2C] text-[#ACEBCE]",
              row.status === "NO_RESPONSE" && "bg-[#3B2020] text-[#E8A0A0]",
              row.status === "POSTED" && "bg-[#2A2618] text-[#C4A35A]",
            )}
          >
            {row.status.replace(/_/g, " ")}
          </span>
        ),
      },
      {
        id: "time",
        header: "Response Time",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.responseLabel || "—"}
          </span>
        ),
      },
      {
        id: "reason",
        header: "Reason",
        cell: (row) => (
          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            {row.reasonLabel || "—"}
          </span>
        ),
      },
    ],
    [router],
  );

  const chips = [
    crew ? { id: "crew", label: crew } : null,
    customerId
      ? {
          id: "customer",
          label:
            options?.customers.find((c) => c.value === customerId)?.label ||
            "Customer",
        }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string }>;

  const boardHasJobs =
    Boolean(board?.unassigned.length) ||
    Boolean(
      board?.rows.some((row) =>
        row.cells.some((cell) => cell.cards.some((c) => !c.isPto)),
      ),
    );
  const scheduleEmpty =
    tab === "SCHEDULE" && !loading && !loadError && board && !boardHasJobs;
  const acceptanceEmpty =
    tab === "ACCEPTANCE" && !loading && !loadError && acceptance.length === 0;

  if (loading && !board && acceptance.length === 0) {
    return (
      <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
        <OpsLoadingListState rows={5} />
      </div>
    );
  }

  if (loadError && !board && acceptance.length === 0) {
    return (
      <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
        <OpsLoadFailedState
          description={loadError}
          onRetry={() => refresh()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
      <DashboardStatGrid>
        <DashboardStatRow columns={3}>
          <DashboardStatCell
            title="To Dispatch"
            value={String(kpi.toDispatch)}
            meta={kpi.toDispatchMeta}
            icon="lightning"
          />
          <DashboardStatCell
            title="Posted to Mobile"
            value={String(kpi.postedToMobile)}
            meta={kpi.postedMeta}
            icon="document"
          />
          <DashboardStatCell
            title="Accepted"
            value={String(kpi.accepted)}
            meta={kpi.acceptedMeta}
            icon="operations"
          />
        </DashboardStatRow>
        <DashboardStatRow columns={3}>
          <DashboardStatCell
            title="Needs Reassign"
            value={String(kpi.needsReassign)}
            meta={kpi.needsReassignMeta}
            icon="folder"
          />
          <DashboardStatCell
            title="No Response"
            value={String(kpi.noResponse)}
            meta={kpi.noResponseMeta}
            icon="time"
          />
          <DashboardStatCell
            title="Conflicts"
            value={String(kpi.conflicts)}
            meta={kpi.conflictsMeta}
            icon="document"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <section className="rounded-xl border border-[#2D2D30] bg-panel">
        <div className="flex flex-col gap-3 border-b border-[#2A2A2A] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(["SCHEDULE", "ACCEPTANCE"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setView(t === "ACCEPTANCE" ? "TABLE" : view);
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em]",
                  tab === t
                    ? "bg-[#FDFDFF] text-[#111111]"
                    : "bg-[#2A2A2A] text-[#959597]",
                )}
              >
                {t === "SCHEDULE" ? "Schedule" : "Tech Acceptance"}
              </button>
            ))}
            {tab === "SCHEDULE" ? (
              <div className="ml-1 flex gap-1">
                {(["TABLE", "BOARD"] as ViewMode[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-sans text-[10px] font-[510] uppercase",
                      view === v
                        ? "bg-[#353535] text-[#FDFDFF]"
                        : "text-[#959597]",
                    )}
                  >
                    {v === "BOARD" ? "Board View" : "Table View"}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#3E3E3E] text-[#FDFDFF]"
            >
              ‹
            </button>
            <span className="min-w-[120px] text-center font-sans text-[11px] uppercase text-[#C8C8C8]">
              {kpi.rangeLabel || board?.rangeLabel || "Week"}
            </span>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#3E3E3E] text-[#FDFDFF]"
            >
              ›
            </button>
            <DashboardToolbarButton
              onClick={() => {
                setAssignDefaults({});
                setAssignOpen(true);
              }}
            >
              Assign Job
            </DashboardToolbarButton>
            <DashboardToolbarButton onClick={() => void postToMobile()}>
              Post Schedule
            </DashboardToolbarButton>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1 sm:max-w-md">
              <DashboardSearchInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search WO, customer, location…"
              />
            </div>
            <select
              className="h-8 rounded-lg border border-[#3E3E3E] bg-[#353535] px-2 font-sans text-[11px] uppercase text-[#FDFDFF]"
              value={crew}
              onChange={(e) => setCrew(e.target.value)}
            >
              <option value="">Filter Crew</option>
              {(options?.crews ?? []).map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              className="h-8 rounded-lg border border-[#3E3E3E] bg-[#353535] px-2 font-sans text-[11px] uppercase text-[#FDFDFF]"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Filter Customer</option>
              {(options?.customers ?? []).map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <DashboardFilterChips
            chips={chips}
            onRemove={(id) => {
              if (id === "crew") setCrew("");
              if (id === "customer") setCustomerId("");
            }}
            onClearAll={() => {
              setCrew("");
              setCustomerId("");
            }}
          />

          {scheduleEmpty ? (
            <OpsNothingScheduledState
              onAssign={() => {
                setAssignDefaults({});
                setAssignOpen(true);
              }}
            />
          ) : acceptanceEmpty ? (
            <OpsAllCaughtUpState />
          ) : tab === "SCHEDULE" && view === "BOARD" && board ? (
            <div className="overflow-x-auto">
              <div
                className="min-w-[900px]"
                style={{
                  display: "grid",
                  gridTemplateColumns: `160px repeat(${board.days.length}, minmax(140px, 1fr))`,
                }}
              >
                <div className="border-b border-[#2A2A2A] p-2 font-sans text-[10px] uppercase text-[#959597]">
                  Technician
                </div>
                {board.days.map((d) => (
                  <div
                    key={d.date}
                    className="border-b border-l border-[#2A2A2A] p-2 text-center font-sans text-[10px] uppercase text-[#8B9BB4]"
                  >
                    {d.weekday} {d.dayNum}
                  </div>
                ))}

                {board.rows.map((row) => (
                  <React.Fragment key={row.employeeId}>
                    <button
                      type="button"
                      className="border-b border-[#2A2A2A] p-2 text-left font-sans text-[11px] uppercase text-[#FDFDFF] hover:bg-[#1A1A1A]"
                      onClick={() => {
                        setAssignDefaults({
                          employeeId: row.employeeId,
                          scheduledDate: from,
                        });
                        setAssignOpen(true);
                      }}
                    >
                      {row.employeeName}
                    </button>
                    {row.cells.map((cell) => (
                      <div
                        key={`${row.employeeId}-${cell.date}`}
                        className="min-h-[88px] space-y-1.5 border-b border-l border-[#2A2A2A] p-1.5"
                        onDoubleClick={() => {
                          setAssignDefaults({
                            employeeId: row.employeeId,
                            scheduledDate: cell.date,
                          });
                          setAssignOpen(true);
                        }}
                      >
                        {cell.cards.map((card) => (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => {
                              if (card.isPto) return;
                              setSelectedCard(card);
                              setCardOpen(true);
                            }}
                            className={cn(
                              "w-full rounded-md border px-2 py-1.5 text-left transition-colors",
                              cardTone(card),
                            )}
                          >
                            <p className="truncate font-sans text-[10px] font-[510] uppercase">
                              {card.locationName}
                            </p>
                            <p className="mt-0.5 truncate font-sans text-[9px] uppercase opacity-80">
                              {card.conflictLabel ||
                                card.status.replace(/_/g, " ")}
                            </p>
                          </button>
                        ))}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 font-sans text-[10px] uppercase text-[#959597]">
                <span className="text-[#ACEBCE]">■ Accepted</span>
                <span className="text-[#C4A35A]">■ Not Accepted / Req</span>
                <span className="text-[#E8A0A0]">■ Conflict</span>
                <span className="text-[#6F6F72]">■ PTO / Holiday</span>
              </div>
            </div>
          ) : (
            <DashboardDataTable
              columns={acceptanceColumns}
              rows={acceptance}
              getRowId={(row) => row.id}
              emptyMessage="No dispatch assignments in this range"
            />
          )}
        </div>
      </section>

      <DispatchWorkOrderCardModal
        open={cardOpen}
        card={selectedCard}
        onClose={() => setCardOpen(false)}
        onOpenWorkOrder={(id) => router.push(`/operations/work-orders/${id}`)}
        onReassign={(card) => {
          setCardOpen(false);
          if (card.status === "DECLINED" || card.status === "NO_RESPONSE") {
            setReassignId(card.id);
            setReassignOpen(true);
          } else if (card.workOrderId) {
            setEligibilityWoId(card.workOrderId);
            setEligibilityOpen(true);
          }
        }}
        onReschedule={(card) => {
          setCardOpen(false);
          void openReschedule(card);
        }}
        onCancel={async (card) => {
          try {
            await operationsApi.cancelDispatch(card.id);
            toastSuccess("Assignment cancelled");
            setCardOpen(false);
            refresh();
          } catch (err) {
            toastApiError(err);
          }
        }}
      />

      <AssignJobModal
        open={assignOpen}
        options={options}
        defaults={assignDefaults}
        onClose={() => setAssignOpen(false)}
        onAssigned={refresh}
      />

      <EligibilityCheckModal
        open={eligibilityOpen}
        workOrderId={eligibilityWoId}
        onClose={() => setEligibilityOpen(false)}
        onResolve={(data) => {
          setEligibilityOpen(false);
          const blocked = data.technicians.find((t) => !t.eligible);
          if (blocked?.assignmentId) {
            setOverrideCtx({
              assignmentId: blocked.assignmentId,
              techName: blocked.name,
              requirement: blocked.detail,
            });
            setOverrideOpen(true);
          } else if (data.workOrderId) {
            router.push(`/operations/work-orders/${data.workOrderId}`);
          }
        }}
        onDispatchAnyway={(data) => {
          setEligibilityOpen(false);
          const blocked = data.technicians.find((t) => !t.eligible);
          if (blocked?.assignmentId) {
            setOverrideCtx({
              assignmentId: blocked.assignmentId,
              techName: blocked.name,
              requirement: blocked.detail,
            });
            setOverrideOpen(true);
          }
        }}
      />

      <HardGateOverrideModal
        open={overrideOpen}
        techName={overrideCtx?.techName || "Technician"}
        requirement={overrideCtx?.requirement || "required training"}
        onClose={() => setOverrideOpen(false)}
        onConfirm={async (reason) => {
          if (!overrideCtx) return;
          await operationsApi.overrideDispatch(overrideCtx.assignmentId, {
            reason,
          });
          toastSuccess("Override recorded — posted to mobile");
          refresh();
        }}
      />

      <ReassignAfterDeclineModal
        open={reassignOpen}
        assignmentId={reassignId}
        onClose={() => setReassignOpen(false)}
        onDone={refresh}
      />

      <ConfirmRescheduleModal
        open={rescheduleOpen}
        jobLabel={reschedulePreview?.jobLabel || "—"}
        fromLabel={reschedulePreview?.fromLabel || "—"}
        toLabel={reschedulePreview?.toLabel || "—"}
        conflictMessage={reschedulePreview?.conflictMessage}
        busy={rescheduleBusy}
        onClose={() => setRescheduleOpen(false)}
        onConfirm={() => void confirmReschedule()}
      />
    </div>
  );
}
