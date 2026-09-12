"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardMenuPopover,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import { crmApi, downloadCsv, type CrmEodReport, type CrmSalesActivity } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmDetailStateGate } from "@/features/crm/crm-states";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import {
  useSession,
  sessionDisplayName,
} from "@/features/app-shell/session-context";
import {
  EodRequestDetailModal,
  EodSendReminderModal,
  type EodAttentionItem,
  type RequestDetailPayload,
  type SendReminderPayload,
} from "./eod-flow-modals";

const TARGETS = {
  activities: 6,
  calls: 5,
  visits: 2,
  meetings: 1,
} as const;

type ThreadComment = {
  id: string;
  author: string;
  at: string;
  text: string;
};

type FollowTask = {
  id: string;
  label: string;
  done: boolean;
};

function shortName(full?: string | null) {
  if (!full?.trim()) return "—";
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.toUpperCase();
  return `${parts[0]![0]}. ${parts[parts.length - 1]}`.toUpperCase();
}

function initials(full?: string | null) {
  if (!full?.trim()) return "?";
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return full.slice(0, 2).toUpperCase();
}

function fmtLongDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

function fmtShortDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(/\s/g, "")
    .replace(/([AP])M$/i, "$1")
    .toUpperCase();
}

function fmtStamp(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(",", " ·")
    .toUpperCase();
}

function moneyK(value?: string | number | null) {
  if (value == null || value === "") return "$0";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n === 0) return "$0";
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n)}`;
}

function weekRangeHint(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - ((day + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const a = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const b = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `of ${a} – ${b}`;
}

function isOnTime(submittedAt?: string | null, reportDate?: string | null) {
  if (!submittedAt) return false;
  const s = new Date(submittedAt);
  if (Number.isNaN(s.getTime())) return false;
  if (s.getHours() >= 18) return false;
  if (reportDate) {
    const r = new Date(reportDate);
    if (!Number.isNaN(r.getTime()) && s.toDateString() !== r.toDateString()) {
      return false;
    }
  }
  return true;
}

function statusVariant(status: string) {
  const s = status.toUpperCase();
  if (s === "SUBMITTED" || s === "COMPLETE") return "success" as const;
  if (s === "PENDING" || s === "NEEDS_REVIEW" || s === "IN_PROGRESS")
    return "warning" as const;
  return "neutral" as const;
}

function Card({
  title,
  trailing,
  children,
  className,
}: {
  title?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[#2D2D30] bg-panel",
        className,
      )}
    >
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 sm:px-5">
          <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
            {title}
          </p>
          {trailing}
        </div>
      ) : null}
      <div className={cn("px-4 pb-4 sm:px-5", !title && "pt-4 sm:pt-5")}>
        {children}
      </div>
    </div>
  );
}

function MetaPair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
        {label}
      </p>
      <p className="mt-1.5 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {value}
      </p>
    </div>
  );
}

function ChevronNav({
  label,
  value,
  hint,
  onPrev,
  onNext,
  disablePrev,
  disableNext,
}: {
  label: string;
  value: string;
  hint?: string;
  onPrev: () => void;
  onNext: () => void;
  disablePrev?: boolean;
  disableNext?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
        {label}
      </span>
      <div className="inline-flex h-8 items-center overflow-hidden rounded-lg border border-[#2D2D30] bg-[#1A1A1A]">
        <button
          type="button"
          aria-label={`Previous ${label}`}
          disabled={disablePrev}
          onClick={onPrev}
          className="inline-flex h-full w-8 items-center justify-center text-[#FDFDFF] transition-colors hover:bg-white/5 disabled:opacity-30"
        >
          ‹
        </button>
        <span className="min-w-[120px] px-2 text-center font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Next ${label}`}
          disabled={disableNext}
          onClick={onNext}
          className="inline-flex h-full w-8 items-center justify-center text-[#FDFDFF] transition-colors hover:bg-white/5 disabled:opacity-30"
        >
          ›
        </button>
      </div>
      {hint ? (
        <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function PipelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#2D2D30] py-2.5 last:border-b-0">
      <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
        {label}
      </span>
      <span className="text-right font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {value}
      </span>
    </div>
  );
}

function avatarTone(seed: string) {
  const tones = [
    "bg-[#5B4B8A] text-[#E8E0FF]",
    "bg-[#1F4B4B] text-[#B8F0F0]",
    "bg-[#4A3A1A] text-[#F5E6B8]",
    "bg-[#3A1515] text-[#FFB4B4]",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * 17) % tones.length;
  return tones[h]!;
}

function parseNotesBlob(raw?: string | null) {
  const text = raw ?? "";
  const comments: ThreadComment[] = [];
  let ack: { by: string; at: string } | null = null;
  let body = text;

  const ackMatch = text.match(/---ACK---\s*(\{[\s\S]*?\})\s*$/m);
  if (ackMatch) {
    try {
      ack = JSON.parse(ackMatch[1]!) as { by: string; at: string };
    } catch {
      /* ignore */
    }
    body = body.replace(ackMatch[0], "").trim();
  }

  const commentsMatch = body.match(/---COMMENTS---\s*([\s\S]*?)(?=---ACK---|$)/);
  if (commentsMatch) {
    const block = commentsMatch[1] ?? "";
    for (const line of block.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("{")) continue;
      try {
        const c = JSON.parse(trimmed) as ThreadComment;
        if (c.author && c.text) comments.push(c);
      } catch {
        /* ignore */
      }
    }
    body = body.replace(commentsMatch[0], "").trim();
  }

  return { body, comments, ack };
}

function serializeNotesBlob(
  body: string,
  comments: ThreadComment[],
  ack: { by: string; at: string } | null,
) {
  const parts = [body.trim()];
  if (comments.length) {
    parts.push(
      "---COMMENTS---",
      ...comments.map((c) => JSON.stringify(c)),
    );
  }
  if (ack) {
    parts.push("---ACK---", JSON.stringify(ack));
  }
  return parts.filter(Boolean).join("\n");
}

function ClipboardCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M9 5h6M9 3.5h6A1.5 1.5 0 0116.5 5v1H18a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1h1.5V5A1.5 1.5 0 019 3.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9 13l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function activityLine(a: CrmSalesActivity) {
  const bits = [
    a.activityCode,
    a.type,
    a.customer?.name,
    a.subject,
    a.outcome,
  ]
    .filter(Boolean)
    .map((x) => String(x).toUpperCase());
  return bits.join(" · ");
}

export function EodReportDetailPage({ reportId }: { reportId: string }) {
  const router = useRouter();
  const { user } = useSession();
  const [detail, setDetail] = React.useState<CrmEodReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [activities, setActivities] = React.useState<CrmSalesActivity[]>([]);
  const [tasks, setTasks] = React.useState<FollowTask[]>([]);
  const [teamPipeline, setTeamPipeline] = React.useState("$0");
  const [sameDayReports, setSameDayReports] = React.useState<CrmEodReport[]>([]);
  const [dateNeighbors, setDateNeighbors] = React.useState<{
    prevId?: string;
    nextId?: string;
  }>({});
  const [replyDraft, setReplyDraft] = React.useState<Record<string, string>>({});
  const [replyOpen, setReplyOpen] = React.useState<string | null>(null);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const approveRef = React.useRef<HTMLButtonElement>(null);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLButtonElement>(null);
  const [requestDetailOpen, setRequestDetailOpen] = React.useState(false);
  const [sendReminderOpen, setSendReminderOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await crmApi.getEodReport(reportId);
        if (cancelled) return;
        setDetail(res.data);

        const day = res.data.reportDate.slice(0, 10);
        const repId = res.data.rep?.id;

        const [actsRes, followRes, kpiRes, dayList, allList] =
          await Promise.all([
            repId
              ? crmApi
                  .listSalesActivities({
                    repId,
                    from: day,
                    to: day,
                    pageSize: 50,
                    sort: "activityAt",
                    direction: "asc",
                  })
                  .catch(() => null)
              : Promise.resolve(null),
            repId
              ? crmApi
                  .listSalesActivities({
                    repId,
                    pageSize: 30,
                    sort: "followUpAt",
                    direction: "asc",
                  })
                  .catch(() => null)
              : Promise.resolve(null),
            crmApi.eodReportsKpi().catch(() => null),
            crmApi
              .listEodReports({
                dateFrom: day,
                dateTo: day,
                pageSize: 50,
                sort: "reportCode",
                direction: "asc",
              })
              .catch(() => null),
            crmApi
              .listEodReports({
                pageSize: 100,
                sort: "reportDate",
                direction: "asc",
              })
              .catch(() => null),
          ]);

        if (cancelled) return;

        const dayActs = actsRes?.data.items ?? [];
        setActivities(dayActs);

        const followItems = (followRes?.data.items ?? []).filter((a) => {
          if (!a.followUpAt) return false;
          const f = new Date(a.followUpAt);
          const reportDay = new Date(res.data.reportDate);
          if (Number.isNaN(f.getTime()) || Number.isNaN(reportDay.getTime()))
            return false;
          const diff = f.getTime() - reportDay.getTime();
          return diff >= -86_400_000 && diff <= 7 * 86_400_000;
        });

        setTasks(
          followItems.slice(0, 6).map((a) => ({
            id: a.id,
            label: [
              a.activityCode.replace(/^SA-/i, "TASK-"),
              a.subject || a.customer?.name || "Follow-up",
              a.followUpAt
                ? `Due ${fmtShortDate(a.followUpAt)} ${fmtTime(a.followUpAt)}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")
              .toUpperCase(),
            done: (a.status || "").toUpperCase() === "COMPLETE",
          })),
        );

        const pipe = kpiRes?.data?.pipeline;
        setTeamPipeline(
          typeof pipe === "string"
            ? pipe
            : moneyK(typeof pipe === "number" ? pipe : 0),
        );

        const dayItems = dayList?.data.items ?? [];
        setSameDayReports(dayItems);

        const allItems = allList?.data.items ?? [];
        const idx = allItems.findIndex((r) => r.id === reportId);
        setDateNeighbors({
          prevId: idx > 0 ? allItems[idx - 1]?.id : undefined,
          nextId:
            idx >= 0 && idx < allItems.length - 1
              ? allItems[idx + 1]?.id
              : undefined,
        });
      } catch (err) {
        toastApiError(err);
        if (!cancelled) {
          setDetail(null);
          setLoadError(
            err instanceof Error ? err.message : "Couldn't load report",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId, reloadKey]);

  const parsed = React.useMemo(
    () => parseNotesBlob(detail?.notes),
    [detail?.notes],
  );

  async function persistNotes(
    body: string,
    comments: ThreadComment[],
    ack: { by: string; at: string } | null,
  ) {
    if (!detail) return;
    const notes = serializeNotesBlob(body, comments, ack);
    const res = await crmApi.updateEodReport(detail.id, { notes });
    setDetail((prev) => (prev ? { ...prev, ...res.data } : res.data));
  }

  async function handleRequestDetail(payload: RequestDetailPayload) {
    if (!detail) return;
    try {
      const res = await crmApi.requestEodDetail(detail.id, payload);
      setDetail((prev) =>
        prev ? { ...prev, ...res.data.report } : res.data.report,
      );
      toastSuccess("Detail request sent");
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  async function handleSendReminder(payload: SendReminderPayload) {
    if (!detail) return;
    try {
      await crmApi.remindEodReport(detail.id, {
        message: payload.message,
        viaPush: payload.viaPush,
        viaEmail: payload.viaEmail,
      });
      toastSuccess("Reminder sent");
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  async function handleExportOne() {
    if (!detail) return;
    try {
      const res = await crmApi.exportEodReports({
        ids: detail.id,
        format: "csv",
      });
      if (!res.data.csv) throw new Error("No CSV file");
      downloadCsv(res.data.csv, res.data.filename);
      toastSuccess("Exported");
    } catch (err) {
      toastApiError(err);
    }
  }

  function handleContactRep() {
    if (!detail?.rep?.email) {
      toastApiError(new Error("No email on file for this rep"));
      return;
    }
    window.location.href = `mailto:${detail.rep.email}?subject=${encodeURIComponent(
      `EOD ${detail.reportCode}`,
    )}`;
  }

  async function handleAcknowledge() {
    if (!detail) return;
    try {
      const by = shortName(sessionDisplayName(user));
      const res = await crmApi.acknowledgeEodReport(detail.id, { by });
      setDetail((prev) => (prev ? { ...prev, ...res.data } : res.data));
      toastSuccess("Report acknowledged");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleApprove(mode: "approve" | "needs_review") {
    if (!detail) return;
    try {
      const res = await crmApi.updateEodReport(detail.id, {
        status: mode === "approve" ? "COMPLETE" : "NEEDS_REVIEW",
      });
      setDetail((prev) => (prev ? { ...prev, ...res.data } : res.data));
      toastSuccess(
        mode === "approve" ? "Report approved" : "Marked needs review",
      );
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleReply(parentId: string) {
    const text = (replyDraft[parentId] ?? "").trim();
    if (!text) return;
    try {
      const author = shortName(sessionDisplayName(user));
      const next: ThreadComment[] = [
        ...parsed.comments,
        {
          id: `c-${Date.now()}`,
          author,
          at: new Date().toISOString(),
          text: text.toUpperCase(),
        },
      ];
      await persistNotes(parsed.body, next, parsed.ack);
      setReplyDraft((d) => ({ ...d, [parentId]: "" }));
      setReplyOpen(null);
      toastSuccess("Reply added");
    } catch (err) {
      toastApiError(err);
    }
  }

  useSetHeaderBreadcrumb(
    detail?.reportCode
      ? `Sales / EOD Reports / ${detail.reportCode}`
      : "Sales / EOD Reports / Detail",
  );
  useSetHeaderActions(null, [reportId]);

  if (loading || !detail || loadError) {
    return (
      <CrmDetailStateGate
        loading={loading}
        error={loadError}
        missing={!loading && !detail && !loadError}
        missingTitle="Report Not Found"
        missingDescription="This EOD report could not be found or is no longer available."
        onRetry={() => setReloadKey((k) => k + 1)}
      >
        {null}
      </CrmDetailStateGate>
    );
  }

  const repName = shortName(
    detail.rep
      ? [detail.rep.firstName, detail.rep.lastName].filter(Boolean).join(" ")
      : null,
  );
  const onTime = isOnTime(detail.submittedAt, detail.reportDate);
  const submittedLate = Boolean(detail.submittedAt) && !onTime;
  const statusLabel =
    detail.status.toUpperCase() === "COMPLETE"
      ? "Approved"
      : submittedLate && detail.status.toUpperCase() === "SUBMITTED"
        ? "Late"
        : detail.status.replace(/_/g, " ");

  const emails = activities.filter((a) => a.type === "EMAIL").length;
  const calls =
    detail.callsCount ??
    activities.filter((a) => a.type === "CALL").length;
  const visits =
    detail.visitsCount ??
    activities.filter((a) => a.type === "VISIT").length;
  const meetings =
    detail.meetingsCount ??
    activities.filter((a) => a.type === "MEETING").length;
  const totalActs = detail.activitiesCount ?? activities.length;

  const eodNotes =
    parsed.body ||
    detail.nextDayPlan ||
    detail.activityLines?.map((l) => l.summary).join(" ") ||
    "No end-of-day notes.";

  const nextDayPlan =
    detail.nextDayPlan?.trim() ||
    (tasks.length ? `${tasks.length} Follow-Ups` : "—");

  const dayIdx = Math.max(
    0,
    sameDayReports.findIndex((r) => r.id === detail.id),
  );
  const repHint =
    sameDayReports.length > 0
      ? `${dayIdx + 1} of ${sameDayReports.length} reps`
      : undefined;

  const defaultComments: ThreadComment[] = parsed.comments;

  const openTasks = tasks.filter((t) => !t.done).length;

  const dayIso = detail.reportDate.slice(0, 10);
  const detailReminderItems: EodAttentionItem[] = [
    {
      id: detail.id,
      kind: !detail.submittedAt ? "missing" : "late",
      repName,
      dateLabel: fmtShortDate(detail.reportDate),
      detail: !detail.submittedAt
        ? "Missing report"
        : `Submitted ${fmtTime(detail.submittedAt)}`,
      selectedByDefault: true,
    },
  ];

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      {/* Title + actions */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="font-sans text-[18px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">
          Eod Report · {detail.reportCode}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <DashboardToolbarButton onClick={() => setRequestDetailOpen(true)}>
            Request Detail
          </DashboardToolbarButton>
          <DashboardToolbarButton
            ref={approveRef}
            variant="primary"
            leftIcon={<ClipboardCheckIcon className="shrink-0" />}
            showChevron
            onClick={() => setApproveOpen((o) => !o)}
          >
            Approve
          </DashboardToolbarButton>
          <DashboardMenuPopover
            open={approveOpen}
            onClose={() => setApproveOpen(false)}
            anchorRef={approveRef}
            align="right"
            items={[
              {
                id: "approve",
                label: "Approve Report",
                onSelect: () => void handleApprove("approve"),
              },
              {
                id: "review",
                label: "Needs Review",
                onSelect: () => void handleApprove("needs_review"),
              },
            ]}
          />
          <DashboardToolbarButton
            ref={moreRef}
            showChevron
            onClick={() => setMoreOpen((o) => !o)}
          >
            More
          </DashboardToolbarButton>
          <DashboardMenuPopover
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            anchorRef={moreRef}
            align="right"
            className="min-w-[240px]"
            items={[
              {
                id: "activities",
                label: "View Reps Activities That Day",
                onSelect: () =>
                  router.push(
                    `/crm/sales?${new URLSearchParams({
                      ...(detail.rep?.id ? { repId: detail.rep.id } : {}),
                      date: dayIso,
                    }).toString()}`,
                  ),
              },
              {
                id: "reminder",
                label: "Send Reminder",
                onSelect: () => setSendReminderOpen(true),
              },
              {
                id: "ack",
                label: "Acknowledge",
                onSelect: () => void handleAcknowledge(),
              },
              {
                id: "contact",
                label: "Contact Rep",
                onSelect: handleContactRep,
              },
              {
                id: "export",
                label: "Export",
                onSelect: () => void handleExportOne(),
              },
            ]}
          />
        </div>
      </div>

      {/* Date / Rep nav */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
        <ChevronNav
          label="Date"
          value={fmtLongDate(detail.reportDate)}
          hint={weekRangeHint(detail.reportDate)}
          onPrev={() => {
            if (dateNeighbors.prevId)
              router.push(`/crm/eod-reports/${dateNeighbors.prevId}`);
          }}
          onNext={() => {
            if (dateNeighbors.nextId)
              router.push(`/crm/eod-reports/${dateNeighbors.nextId}`);
          }}
          disablePrev={!dateNeighbors.prevId}
          disableNext={!dateNeighbors.nextId}
        />
        <ChevronNav
          label="Rep"
          value={repName}
          hint={repHint}
          onPrev={() => {
            if (dayIdx > 0 && sameDayReports[dayIdx - 1]) {
              router.push(`/crm/eod-reports/${sameDayReports[dayIdx - 1]!.id}`);
            }
          }}
          onNext={() => {
            if (dayIdx < sameDayReports.length - 1 && sameDayReports[dayIdx + 1]) {
              router.push(`/crm/eod-reports/${sameDayReports[dayIdx + 1]!.id}`);
            }
          }}
          disablePrev={dayIdx <= 0}
          disableNext={dayIdx >= sameDayReports.length - 1}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <DashboardBadge
          variant={
            submittedLate ? "warning" : statusVariant(detail.status)
          }
          pill
        >
          {statusLabel}
        </DashboardBadge>
        <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
          {repName} · {fmtShortDate(detail.reportDate)} ·{" "}
          {fmtTime(detail.submittedAt)} ·{" "}
          {detail.submittedAt ? (onTime ? "On Time" : "Late") : "Not Submitted"}
        </span>
      </div>

      {/* KPI row */}
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          <DashboardStatCell
            title="Activities"
            value={String(totalActs || "—")}
            meta={`Target ${TARGETS.activities}`}
            icon="lightning"
          />
          <DashboardStatCell
            title="Calls"
            value={String(calls || "—")}
            meta={`Target ${TARGETS.calls}`}
            icon="document"
          />
          <DashboardStatCell
            title="Visits"
            value={String(visits || "—")}
            meta={`Target ${TARGETS.visits}`}
            icon="time"
          />
          <DashboardStatCell
            title="Meetings"
            value={String(meetings || "—")}
            meta={`Target ${TARGETS.meetings}`}
            icon="folder"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      {/* Main grid */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="mb-5 flex items-center gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-sans text-[13px] font-[510]",
                  avatarTone(repName),
                )}
              >
                {initials(
                  detail.rep
                    ? [detail.rep.firstName, detail.rep.lastName]
                        .filter(Boolean)
                        .join(" ")
                    : repName,
                )}
              </div>
              <div className="min-w-0">
                <p className="font-sans text-[14px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {repName}
                </p>
                <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                  {fmtLongDate(detail.reportDate)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <MetaPair label="Submitted" value={fmtTime(detail.submittedAt)} />
              <MetaPair label="Total Activities" value={String(totalActs)} />
              <MetaPair label="Meetings" value={String(meetings)} />
              <MetaPair label="Emails" value={String(emails)} />
              <MetaPair label="Calls" value={String(calls)} />
              <MetaPair label="Visits" value={String(visits)} />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card title="Activities Today">
              {activities.length === 0 ? (
                <p className="font-sans text-[11px] uppercase text-[#959597]">
                  No activities logged
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {activities.slice(0, 5).map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/crm/sales/${a.id}`}
                        className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF] underline underline-offset-2 hover:opacity-80"
                      >
                        {activityLine(a)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => {
                  const q = new URLSearchParams();
                  if (detail.rep?.id) q.set("repId", detail.rep.id);
                  q.set("date", detail.reportDate.slice(0, 10));
                  router.push(`/crm/sales?${q.toString()}`);
                }}
                className="mt-4 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] underline underline-offset-2 hover:opacity-80"
              >
                View All {totalActs || activities.length} Activities →
              </button>
            </Card>

            <Card title="End-Of-Day Notes">
              <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF]">
                {eodNotes}
              </p>
            </Card>
          </div>

          <Card
            title={`Follow-Up Tasks · ${tasks.length || 0} · ${
              openTasks === 0 && tasks.length
                ? "All Done"
                : openTasks === tasks.length
                  ? "All Open"
                  : `${openTasks} Open`
            }`}
          >
            {tasks.length === 0 ? (
              <p className="font-sans text-[11px] uppercase text-[#959597]">
                No follow-up tasks
              </p>
            ) : (
              <ul className="space-y-2.5">
                {tasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-3"
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() =>
                          setTasks((prev) =>
                            prev.map((x) =>
                              x.id === t.id ? { ...x, done: !x.done } : x,
                            ),
                          )
                        }
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#3E3E3E] bg-[#2A2A2A]"
                      />
                      <span
                        className={cn(
                          "font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em]",
                          t.done
                            ? "text-[#6F6F72] line-through"
                            : "text-[#FDFDFF]",
                        )}
                      >
                        {t.label}
                      </span>
                    </label>
                    <DashboardBadge
                      variant={t.done ? "success" : "info"}
                      pill
                    >
                      {t.done ? "Done" : "Open"}
                    </DashboardBadge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Pipeline">
            <PipelineRow
              label="Quotes Sent"
              value={String(detail.quotesSent ?? detail.quotesNote ?? 0)}
            />
            <PipelineRow
              label="Added By This Rep"
              value={moneyK(detail.pipelineValue)}
            />
            <PipelineRow label="Team This Week" value={teamPipeline} />
            <PipelineRow
              label="Closed Today"
              value={moneyK(detail.closedToday)}
            />
            <PipelineRow label="Next-Day Plan" value={String(nextDayPlan)} />
          </Card>

          <Card title="Notes">
            <ul className="space-y-4">
              {defaultComments.length === 0 ? (
                <li className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                  No manager notes yet
                </li>
              ) : null}
              {defaultComments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-[11px] font-[510]",
                      avatarTone(c.author),
                    )}
                  >
                    {initials(c.author)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                        {c.author}
                      </span>
                      <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
                        {fmtStamp(c.at)}
                      </span>
                    </div>
                    <p className="mt-1.5 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#C8C8C8]">
                      {c.text}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setReplyOpen((id) => (id === c.id ? null : c.id))
                      }
                      className="mt-2 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
                    >
                      Reply
                    </button>
                    {replyOpen === c.id ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={replyDraft[c.id] ?? ""}
                          onChange={(e) =>
                            setReplyDraft((d) => ({
                              ...d,
                              [c.id]: e.target.value,
                            }))
                          }
                          rows={2}
                          className="w-full rounded-lg border-0 bg-[#2A2A2A] px-3 py-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#6F6F72]"
                          placeholder="Write a reply…"
                        />
                        <DashboardToolbarButton
                          variant="primary"
                          onClick={() => void handleReply(c.id)}
                        >
                          Post Reply
                        </DashboardToolbarButton>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Manager Acknowledgement">
            <DashboardToolbarButton
              className="h-11 w-full justify-center"
              disabled={Boolean(parsed.ack)}
              onClick={() => void handleAcknowledge()}
            >
              {parsed.ack ? "Acknowledged" : "Acknowledge Report"}
            </DashboardToolbarButton>
            <p className="mt-3 text-center font-sans text-[11px] uppercase tracking-[-0.02em] text-[#6F6F72]">
              {parsed.ack
                ? `Acknowledged by ${parsed.ack.by} · ${fmtStamp(parsed.ack.at)}`
                : "Not Yet Acknowledged"}
            </p>
          </Card>
        </div>
      </div>

      <EodRequestDetailModal
        open={requestDetailOpen}
        onClose={() => setRequestDetailOpen(false)}
        reportCode={detail.reportCode}
        onSend={handleRequestDetail}
      />

      <EodSendReminderModal
        open={sendReminderOpen}
        onClose={() => setSendReminderOpen(false)}
        items={detailReminderItems}
        onSend={handleSendReminder}
      />
    </div>
  );
}
