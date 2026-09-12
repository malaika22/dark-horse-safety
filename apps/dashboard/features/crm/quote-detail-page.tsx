"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardMenuPopover,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  crmApi,
  downloadPdf,
  downloadXlsx,
  type CrmQuote,
} from "@/lib/crm-api";
import { toastApiError, toastSuccess, toastInfo } from "@/lib/toast";
import { CrmDetailStateGate } from "@/features/crm/crm-states";
import { CrmPickModal } from "@/features/crm/crm-action-modals";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import {
  useSession,
  sessionDisplayName,
} from "@/features/app-shell/session-context";
import { SendQuoteModal, type SendQuotePayload } from "./send-quote-modal";
import {
  type CompareVersionRow,
  MarkAsAcceptedModal,
  type MarkAcceptedPayload,
  QuoteCompareVersionsModal,
  QuotePreviewOverlay,
  QuoteSendFailedModal,
  QuoteSentSuccessModal,
  QuoteVersionHistoryModal,
  type QuoteVersionListItem,
  WorkOrderCreatedModal,
} from "./quote-flow-modals";

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

function fmtDate(iso?: string | null) {
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

function money(value?: string | number | null) {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function statusVariant(status: string) {
  const s = status.toUpperCase();
  if (s === "SENT") return "billing" as const;
  if (s === "WON" || s === "OPEN") return "success" as const;
  if (s === "EXPIRED" || s === "LOST") return "error" as const;
  if (s === "DRAFT") return "operations" as const;
  return "neutral" as const;
}

function approvalTone(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s === "PENDING") return "text-[#E8A54B]";
  if (s === "APPROVED") return "text-[#4ADE80]";
  if (s === "REJECTED") return "text-[#FF6B6B]";
  return "text-[#FDFDFF]";
}

function approvalLabel(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (!s || s === "NOT_REQUIRED") return "—";
  return s.replace(/_/g, " ");
}

function expiresInLabel(expiresAt?: string | null) {
  if (!expiresAt) return "—";
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return "—";
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return `Expired ${Math.abs(days)} Days Ago`;
  if (days === 0) return "Today";
  if (days === 1) return "1 Day";
  return `${days} Days`;
}

function GlassBtn({
  children,
  onClick,
  href,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const cls = cn(
    "inline-flex h-8 items-center rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5",
    className,
  );
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

function SectionCard({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#2D2D30] bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3 sm:px-5">
        <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
          {title}
        </p>
        {trailing}
      </div>
      <div className="px-4 pb-5 sm:px-5">{children}</div>
    </div>
  );
}

function MetaPair({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597]">
        {label}
      </p>
      <div
        className={cn(
          "mt-2 font-sans text-[12px] font-[510] uppercase leading-snug tracking-[-0.02em] text-[#FDFDFF]",
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
}

/** Quote Details row — label left, value right (Figma). */
function DetailPair({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="shrink-0 font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
        {label}
      </span>
      <div
        className={cn(
          "min-w-0 text-right font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]",
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
}

function formatBillingAddress(raw?: string | null) {
  if (!raw?.trim()) return "—";
  try {
    const parsed = JSON.parse(raw) as {
      street?: string;
      suite?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    if (parsed && typeof parsed === "object" && "street" in parsed) {
      const line1 = [parsed.street, parsed.suite].filter(Boolean).join(", ");
      const line2 = [parsed.city, parsed.state, parsed.zip]
        .filter(Boolean)
        .join(", ");
      return [line1, line2].filter(Boolean).join("\n") || "—";
    }
  } catch {
    /* plain text */
  }
  return raw.trim();
}

function WarningTriangleIcon({ className }: { className?: string }) {
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
        d="M12 3.5L22 20.5H2L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.25" r="1" fill="currentColor" />
    </svg>
  );
}

/** Figma Send CTA — 2×2 rounded grid. */
function QuoteGridIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <rect x="3.25" y="3.25" width="7.5" height="7.5" rx="1.75" fill="currentColor" />
      <rect x="13.25" y="3.25" width="7.5" height="7.5" rx="1.75" fill="currentColor" />
      <rect x="3.25" y="13.25" width="7.5" height="7.5" rx="1.75" fill="currentColor" />
      <rect x="13.25" y="13.25" width="7.5" height="7.5" rx="1.75" fill="currentColor" />
    </svg>
  );
}

function TermRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2.5 first:pt-0 last:pb-0">
      <span className="shrink-0 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
        {label}
      </span>
      <span className="min-w-0 text-right font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {value}
      </span>
    </div>
  );
}

function DragHandleIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden>
      <circle cx="3" cy="3" r="1.25" />
      <circle cx="9" cy="3" r="1.25" />
      <circle cx="3" cy="8" r="1.25" />
      <circle cx="9" cy="8" r="1.25" />
      <circle cx="3" cy="13" r="1.25" />
      <circle cx="9" cy="13" r="1.25" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function isManualOverride(item: string, quantity?: string | number, rate?: string | number, amount?: string | number) {
  if (/manual\s*override/i.test(item)) return true;
  const q = Number(quantity);
  const r = Number(rate);
  const a = Number(amount);
  if (![q, r, a].every((n) => Number.isFinite(n))) return false;
  const expected = Math.round(q * r * 100) / 100;
  const actual = Math.round(a * 100) / 100;
  return Math.abs(expected - actual) > 0.009;
}

function lineItemLabel(item: string) {
  return item
    .replace(/\s*[·•|\-–—]?\s*manual\s*override\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function CellBox({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 min-w-[3.25rem] items-center justify-center rounded-md border border-[#2D2D30] bg-[#1A1A1A] px-2.5 font-sans text-[11px] uppercase tabular-nums tracking-[-0.02em] text-[#FDFDFF]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function apiErrorMessage(err: unknown) {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Delivery failed — the recipient's mail server rejected the message. Check the address and try again.";
}

type LineRow = NonNullable<CrmQuote["lineItems"]>[number];

export function QuoteDetailPage({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const { user } = useSession();
  const [quote, setQuote] = React.useState<CrmQuote | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [sendOpen, setSendOpen] = React.useState(false);
  const [sentOpen, setSentOpen] = React.useState(false);
  const [failOpen, setFailOpen] = React.useState(false);
  const [failReason, setFailReason] = React.useState("");
  const [lastSend, setLastSend] = React.useState<{
    recipient: string;
    versionLabel: string;
    supersedeWarning: string | null;
  } | null>(null);

  const [acceptOpen, setAcceptOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyVersions, setHistoryVersions] = React.useState<
    QuoteVersionListItem[]
  >([]);
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [compareMeta, setCompareMeta] = React.useState<{
    leftLabel: string;
    rightLabel: string;
    rows: CompareVersionRow[];
  }>({ leftLabel: "V1", rightLabel: "V2", rows: [] });

  const [woOpen, setWoOpen] = React.useState(false);
  const [woMeta, setWoMeta] = React.useState<{
    workOrderCode: string;
    workOrderId?: string;
    customer: string;
    value: string;
    scheduled: string;
    createdBy: string;
  } | null>(null);

  const [templateOpen, setTemplateOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [templateOpts, setTemplateOpts] = React.useState<
    { value: string; label: string; hint?: string; lines: { item: string; qty: number; rate: number }[] }[]
  >([]);
  const [importOpts, setImportOpts] = React.useState<
    { value: string; label: string; hint?: string }[]
  >([]);

  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLButtonElement>(null);
  const [lineMenuOpen, setLineMenuOpen] = React.useState(false);
  const lineMenuRef = React.useRef<HTMLButtonElement>(null);
  const [rowMenuId, setRowMenuId] = React.useState<string | null>(null);
  const rowMenuRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await crmApi.getQuote(quoteId);
        if (!cancelled) setQuote(res.data);
      } catch (err) {
        toastApiError(err);
        if (!cancelled) {
          setQuote(null);
          setLoadError(
            err instanceof Error ? err.message : "Couldn't load quote",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId, reloadKey]);

  const revision = quote?.revision ?? 1;
  const currentRevision = quote?.currentRevision ?? revision;
  const viewingOlder = currentRevision > revision;

  async function persistLines(next: LineRow[]) {
    const payload = next.map((line, index) => ({
      item: line.item,
      quantity: Number(line.quantity) || 1,
      rate: Number(line.rate) || 0,
      sortOrder: index,
    }));
    const res = await crmApi.updateQuote(quoteId, { lineItems: payload });
    setQuote((prev) => (prev ? { ...prev, ...res.data } : res.data));
  }

  async function handleSend(payload: SendQuotePayload) {
    const versionLabel = `Quote V${revision}`;
    const supersedeWarning =
      quote?.sentAt && revision > 1
        ? `The customer previously received V${revision - 1}. Sending V${revision} supersedes it.`
        : null;
    try {
      for (const file of payload.files) {
        const contentBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = String(reader.result ?? "");
            const b64 = result.includes(",") ? result.split(",")[1]! : result;
            resolve(b64);
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        await crmApi.uploadQuoteAttachment(quoteId, {
          fileName: file.name,
          mimeType: file.type || undefined,
          contentBase64,
        });
      }
      const to = payload.recipient.includes("@")
        ? payload.recipient.split(/[·•]/).pop()?.trim() || payload.recipient
        : payload.recipient;
      const res = await crmApi.sendQuote(quoteId, {
        to,
        subject: payload.subject,
        message: payload.message,
        attachPdf: payload.attachPdf,
        schedule: payload.schedule,
        scheduledAt:
          payload.schedule === "later" ? payload.scheduledAt : undefined,
      });
      setQuote((prev) => (prev ? { ...prev, ...res.data } : res.data));
      if (payload.schedule === "later") {
        toastSuccess(
          `Quote scheduled for ${payload.scheduledAt || "later"} — not sent yet`,
        );
        return;
      }
      setLastSend({
        recipient: payload.recipient,
        versionLabel,
        supersedeWarning,
      });
      setSentOpen(true);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFailReason(apiErrorMessage(err));
      setFailOpen(true);
    }
  }

  async function handleMarkAccepted(payload: MarkAcceptedPayload) {
    try {
      const acceptanceNote = [
        `[ACCEPTED] By ${payload.acceptedBy} on ${payload.dateAccepted} via ${payload.how.replace(/_/g, " ")}`,
        payload.reference ? `Ref: ${payload.reference}` : null,
        payload.note || null,
      ]
        .filter(Boolean)
        .join(" · ");
      const existing = quote?.notes?.trim();
      await crmApi.updateQuote(quoteId, {
        notes: existing ? `${existing}\n${acceptanceNote}` : acceptanceNote,
        ...(payload.reference
          ? { hasPo: true, poNumber: payload.reference }
          : {}),
      });
      const res = await crmApi.markQuoteWon(quoteId);
      setQuote((prev) => (prev ? { ...prev, ...res.data } : res.data));
      toastSuccess("Quote marked as accepted");
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  async function handleMarkDeclined() {
    try {
      const res = await crmApi.markQuoteLost(quoteId);
      setQuote((prev) => (prev ? { ...prev, ...res.data } : res.data));
      toastSuccess("Quote marked as declined");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function openHistory() {
    try {
      const res = await crmApi.listQuoteVersions(quoteId);
      setHistoryVersions(res.data.versions);
      setHistoryOpen(true);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function openCompare() {
    try {
      const res = await crmApi.compareQuoteVersions(quoteId);
      setCompareMeta({
        leftLabel: res.data.left.label,
        rightLabel: res.data.right.label,
        rows: res.data.rows,
      });
      setCompareOpen(true);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function exportQuote(format: "pdf" | "xlsx") {
    try {
      const res = await crmApi.exportQuotes({
        ids: quoteId,
        format,
      });
      if (format === "pdf" && res.data.pdf) {
        downloadPdf(res.data.pdf, res.data.filename || `${quote?.quoteNumber}.pdf`);
      } else if (format === "xlsx" && res.data.xlsx) {
        downloadXlsx(
          res.data.xlsx,
          res.data.filename || `${quote?.quoteNumber}.xlsx`,
        );
      } else {
        toastInfo("Export ready — no file payload returned");
      }
    } catch (err) {
      toastApiError(err);
    }
  }

  async function emailMyself() {
    const email = user?.email;
    if (!email) {
      toastInfo("No email on your account");
      return;
    }
    try {
      await crmApi.sendQuote(quoteId, {
        to: email,
        subject: `Copy of ${quote?.quoteNumber ?? "quote"}`,
        message: `Copy of quote ${quote?.quoteNumber ?? ""} for your records.`,
        attachPdf: true,
      });
      toastSuccess("Copy emailed to you");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function convertToWo() {
    try {
      const res = await crmApi.convertQuoteToWorkOrder(quoteId);
      const wo = res.data;
      setWoMeta({
        workOrderCode: wo.code ?? wo.workOrderNumber ?? "WO",
        workOrderId: wo.id,
        customer: quote?.customer?.name ?? "—",
        value: money(quote?.amount),
        scheduled: wo.serviceDate ? fmtDate(wo.serviceDate) : "—",
        createdBy: shortName(sessionDisplayName(user)),
      });
      setWoOpen(true);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function deleteDraft() {
    try {
      await crmApi.archiveQuote(quoteId);
      toastSuccess("Quote archived");
      router.push("/crm/quotes");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function openTemplates() {
    if (!quote?.customer?.id) {
      toastInfo("No customer on this quote");
      return;
    }
    try {
      const res = await crmApi.listPricingRules({
        customerId: quote.customer.id,
        pageSize: 50,
        status: "ACTIVE",
      });
      const rules = (res.data.items ?? []).filter(
        (r) => (r.approvalStatus ?? "APPROVED").toUpperCase() === "APPROVED",
      );
      if (!rules.length) {
        toastInfo("No active pricing rules for this customer");
        return;
      }
      setTemplateOpts([
        {
          value: "all",
          label: "All Active Pricing Rules",
          hint: `${rules.length} lines`,
          lines: rules.map((r) => ({
            item: r.serviceItem,
            qty: 1,
            rate: Number(r.rate) || 0,
          })),
        },
        ...rules.map((r) => ({
          value: r.id,
          label: r.serviceItem,
          hint: money(r.rate),
          lines: [
            {
              item: r.serviceItem,
              qty: 1,
              rate: Number(r.rate) || 0,
            },
          ],
        })),
      ]);
      setTemplateOpen(true);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function addAllCustomerRates() {
    if (!quote?.customer?.id) {
      toastInfo("No customer on this quote");
      return;
    }
    try {
      const res = await crmApi.listPricingRules({
        customerId: quote.customer.id,
        pageSize: 100,
        status: "ACTIVE",
      });
      const rules = (res.data.items ?? []).filter(
        (r) => (r.approvalStatus ?? "APPROVED").toUpperCase() === "APPROVED",
      );
      if (!rules.length) {
        toastInfo("No active pricing rules for this customer");
        return;
      }
      const existing = quote.lineItems ?? [];
      const added: LineRow[] = rules.map((r, i) => ({
        id: `tmp-${r.id}-${i}`,
        item: r.serviceItem,
        quantity: 1,
        rate: Number(r.rate) || 0,
        amount: Number(r.rate) || 0,
      }));
      await persistLines([...existing, ...added]);
      toastSuccess(`Added ${added.length} customer rates`);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function openImportPrevious() {
    if (!quote?.customer?.id) {
      toastInfo("No customer on this quote");
      return;
    }
    try {
      const res = await crmApi.listQuotes({
        customerId: quote.customer.id,
        pageSize: 25,
      });
      const items = (res.data.items ?? []).filter((q) => q.id !== quoteId);
      if (!items.length) {
        toastInfo("No previous quotes for this customer");
        return;
      }
      setImportOpts(
        items.map((q) => ({
          value: q.id,
          label: q.quoteNumber,
          hint: `${money(q.amount)} · ${q.status}`,
        })),
      );
      setImportOpen(true);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function importFromQuote(sourceId: string) {
    try {
      const res = await crmApi.getQuote(sourceId);
      const lines = res.data.lineItems ?? [];
      if (!lines.length) {
        toastInfo("That quote has no line items");
        return;
      }
      const existing = quote?.lineItems ?? [];
      await persistLines([
        ...existing,
        ...lines.map((l, i) => ({
          ...l,
          id: `imp-${l.id}-${i}`,
        })),
      ]);
      toastSuccess(`Imported ${lines.length} line items`);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function clearAllLines() {
    try {
      await persistLines([]);
      toastSuccess("Line items cleared");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function applyTemplate(value: string) {
    const tpl = templateOpts.find((t) => t.value === value);
    if (!tpl) return;
    const existing = quote?.lineItems ?? [];
    const added: LineRow[] = tpl.lines.map((l, i) => ({
      id: `tpl-${value}-${i}`,
      item: l.item,
      quantity: l.qty,
      rate: l.rate,
      amount: l.qty * l.rate,
    }));
    try {
      await persistLines([...existing, ...added]);
      toastSuccess(`Applied ${tpl.label}`);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function reorderLine(lineId: string, dir: -1 | 1) {
    const lines = [...(quote?.lineItems ?? [])];
    const idx = lines.findIndex((l) => l.id === lineId);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= lines.length) return;
    const tmp = lines[idx]!;
    lines[idx] = lines[next]!;
    lines[next] = tmp;
    try {
      await persistLines(lines);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function duplicateLine(lineId: string) {
    const lines = quote?.lineItems ?? [];
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    try {
      await persistLines([
        ...lines,
        { ...line, id: `dup-${line.id}-${Date.now()}` },
      ]);
      toastSuccess("Line duplicated");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function deleteLine(lineId: string) {
    const lines = (quote?.lineItems ?? []).filter((l) => l.id !== lineId);
    try {
      await persistLines(lines);
      toastSuccess("Line removed");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function logFollowUp() {
    if (!quote?.customer?.id) {
      router.push("/crm/sales/new");
      return;
    }
    try {
      const followUpAt = new Date();
      followUpAt.setDate(followUpAt.getDate() + 2);
      const res = await crmApi.createSalesActivity({
        type: "EMAIL",
        subject: `Follow up on ${quote.quoteNumber}`,
        customerId: quote.customer.id,
        contactId: quote.contact?.id,
        linkedQuoteId: quote.id,
        notes: `Follow up after sending ${quote.quoteNumber}`,
        followUpAt: followUpAt.toISOString(),
        activityAt: new Date().toISOString(),
      });
      toastSuccess("Follow-up task logged");
      setSentOpen(false);
      if (res.data.id) router.push(`/crm/sales/${res.data.id}`);
    } catch (err) {
      toastApiError(err);
      router.push(
        `/crm/sales/new?customerId=${quote.customer.id}&quoteId=${quote.id}`,
      );
    }
  }

  function copyQuoteLink() {
    const url = `${window.location.origin}/crm/quotes/${quoteId}`;
    void navigator.clipboard.writeText(url).then(
      () => toastSuccess("Link copied"),
      () => toastInfo(url),
    );
  }

  useSetHeaderBreadcrumb(
    quote?.quoteNumber
      ? `CRM / Quotes / ${quote.quoteNumber}`
      : "CRM / Quotes / Detail",
  );

  useSetHeaderActions(null, [quoteId]);

  if (loading || !quote || loadError) {
    return (
      <CrmDetailStateGate
        loading={loading}
        error={loadError}
        missing={!loading && !quote && !loadError}
        missingTitle="Quote Not Found"
        missingDescription="This quote could not be found or is no longer available."
        onRetry={() => setReloadKey((k) => k + 1)}
      >
        {null}
      </CrmDetailStateGate>
    );
  }

  const lines = quote.lineItems ?? [];
  const subtotal = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const tax = 0;
  const total = Number(quote.amount) || subtotal + tax;
  const contactName = shortName(quote.contact?.fullName);
  const contactRole = quote.contact?.roleTitle ?? "—";
  const contactEmail =
    quote.contact?.email ?? quote.customer?.email ?? "—";
  const contactPhone =
    quote.contact?.officePhone ??
    quote.contact?.mobile ??
    quote.customer?.phone ??
    "—";
  const ownerName = shortName(
    quote.owner
      ? [quote.owner.firstName, quote.owner.lastName].filter(Boolean).join(" ")
      : null,
  );
  const ownerEmail = quote.owner?.email ?? user?.email ?? "";
  const converted =
    quote.convertedWorkOrder ?? quote.workOrders?.[0] ?? null;
  const discountMatch = quote.notes?.match(/discount[:\s]*([\d.]+)\s*%/i);
  const discountLabel = discountMatch ? `${discountMatch[1]}%` : "0%";
  const paymentTerms =
    quote.terms?.trim() ||
    (quote.notes?.match(/net\s*\d+/i)?.[0]?.toUpperCase() ?? "Net 30");

  const recipientDisplay =
    quote.contact?.fullName && contactEmail !== "—"
      ? `${shortName(quote.contact.fullName)} · ${contactEmail}`
      : contactEmail !== "—"
        ? contactEmail
        : "";
  const ccDisplay =
    ownerName !== "—" && ownerEmail
      ? `${ownerName} (Assigned Rep) · ${ownerEmail}`
      : ownerEmail || "";
  const sendSubject = `Quote ${quote.quoteNumber} from Dark Horse Safety — ${money(total)}`;
  const sendMessage = `Hi ${quote.contact?.fullName?.split(/\s+/)[0] ?? "there"},

Attached is quote ${quote.quoteNumber} for ${money(total)}, valid until ${fmtDate(quote.expiresAt)}.

Let me know if you have any questions.

${ownerName !== "—" ? ownerName : sessionDisplayName(user)} · Dark Horse Safety`;

  const rowMenuLine = lines.find((l) => l.id === rowMenuId);

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="font-sans text-[18px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">
            Quote · {quote.quoteNumber} ·{" "}
            <span className="underline decoration-[#FDFDFF]/55 underline-offset-[5px]">
              V{revision}
            </span>
          </h1>
          <DashboardBadge variant={statusVariant(quote.status)} pill>
            {quote.status.replace(/_/g, " ")}
          </DashboardBadge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            ref={menuRef}
            type="button"
            aria-label="Quote actions"
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2D2D30] bg-[#1A1A1A] text-[#FDFDFF] transition-colors hover:bg-white/5"
          >
            <ChevronDownIcon />
          </button>
          <DashboardMenuPopover
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            anchorRef={menuRef}
            align="right"
            className="min-w-[220px]"
            items={[
              {
                id: "pdf",
                label: "Download Pdf",
                onSelect: () => void exportQuote("pdf"),
              },
              {
                id: "xlsx",
                label: "Download Excel",
                onSelect: () => void exportQuote("xlsx"),
              },
              {
                id: "print",
                label: "Print",
                onSelect: () => {
                  setPreviewOpen(true);
                  window.setTimeout(() => window.print(), 400);
                },
              },
              {
                id: "email-me",
                label: "Email A Copy To Myself",
                onSelect: () => void emailMyself(),
              },
              {
                id: "history",
                label: "View Version History",
                onSelect: () => void openHistory(),
              },
              {
                id: "compare",
                label: "Compare Versions",
                onSelect: () => void openCompare(),
              },
              {
                id: "dup",
                label: "Duplicate Quote",
                onSelect: () => {
                  void (async () => {
                    try {
                      const res = await crmApi.duplicateQuote(quote.id);
                      toastSuccess("Quote duplicated");
                      router.push(`/crm/quotes/${res.data.id}`);
                    } catch (err) {
                      toastApiError(err);
                    }
                  })();
                },
              },
              {
                id: "convert",
                label: "Convert To Work Order",
                onSelect: () => void convertToWo(),
              },
              {
                id: "delete",
                label: "Delete Draft",
                destructive: true,
                onSelect: () => void deleteDraft(),
              },
            ]}
          />
          <GlassBtn onClick={() => void handleMarkDeclined()}>
            Mark as Declined
          </GlassBtn>
          <GlassBtn onClick={() => setAcceptOpen(true)}>
            Mark as Accepted
          </GlassBtn>
          <DashboardToolbarButton
            variant="primary"
            leftIcon={<QuoteGridIcon className="shrink-0" />}
            onClick={() => setSendOpen(true)}
          >
            Send to Customer
          </DashboardToolbarButton>
        </div>
      </div>

      {viewingOlder ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5 text-[#C8C8C8]">
            <WarningTriangleIcon className="shrink-0 text-[#C8C8C8]" />
            <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
              You&apos;re viewing V{revision}. The current version is V
              {currentRevision}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="shrink-0 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] underline underline-offset-2 hover:opacity-80"
          >
            Go to Latest Quote
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <SectionCard title="Customer & Contact">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2A2A2A] font-sans text-[12px] font-[510] text-[#FDFDFF] ring-1 ring-[#2D2D30]">
              {initials(quote.contact?.fullName ?? quote.customer?.name)}
            </div>
            <div className="min-w-0">
              <p className="font-sans text-[13px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]">
                {contactName}
              </p>
              <p className="mt-1.5 font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
                {contactRole}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <MetaPair label="Company" value={quote.customer?.name ?? "—"} />
            <MetaPair
              label="Email"
              value={
                <span className="break-all normal-case tracking-normal">
                  {contactEmail}
                </span>
              }
            />
            <MetaPair label="Phone" value={contactPhone} />
            <MetaPair
              label="Billing Address"
              value={
                <span className="whitespace-pre-line">
                  {formatBillingAddress(quote.customer?.billingAddress)}
                </span>
              }
            />
          </div>
        </SectionCard>

        <SectionCard title="Quote Details">
          <div className="grid grid-cols-1 gap-x-10 gap-y-1 sm:grid-cols-2">
            <div className="min-w-0 space-y-0.5">
              <DetailPair label="Quote #" value={quote.quoteNumber} />
              <DetailPair label="Created" value={fmtDate(quote.createdAt)} />
              <DetailPair
                label="Valid Until"
                value={fmtDate(quote.expiresAt)}
              />
              <DetailPair label="Owner" value={ownerName} />
              <DetailPair
                label="Status"
                value={quote.status.replace(/_/g, " ")}
              />
              <DetailPair
                label="Version"
                value={
                  <span className="inline-flex flex-wrap items-center justify-end gap-1">
                    <span>V{currentRevision}</span>
                    <button
                      type="button"
                      onClick={() => void openHistory()}
                      className="font-[510] text-[#4ADE80] hover:opacity-80"
                    >
                      · View History →
                    </button>
                  </span>
                }
              />
              <DetailPair label="Sent On" value={fmtDate(quote.sentAt)} />
              {quote.scheduledSendAt && !quote.sentAt ? (
                <DetailPair
                  label="Scheduled Send"
                  value={fmtDate(quote.scheduledSendAt)}
                />
              ) : null}
            </div>
            <div className="min-w-0 space-y-0.5">
              <DetailPair
                label="Sent To"
                value={
                  <span className="block truncate normal-case tracking-normal" title={contactEmail}>
                    {contactEmail}
                  </span>
                }
              />
              <DetailPair label="Viewed On" value="—" />
              <DetailPair
                label="Approval Status"
                value={approvalLabel(quote.approvalStatus)}
                valueClassName={approvalTone(quote.approvalStatus)}
              />
              <DetailPair label="Approved On" value="—" />
              <DetailPair label="Approved By" value="—" />
              <DetailPair
                label="Expires In"
                value={expiresInLabel(quote.expiresAt)}
              />
              <DetailPair
                label="Converted WO"
                value={
                  converted ? (
                    <Link
                      href={`/operations/work-orders/${converted.id}`}
                      className="text-[#4ADE80] underline underline-offset-2 hover:opacity-80"
                    >
                      {converted.code ?? "View WO"}
                    </Link>
                  ) : (
                    "Not Converted"
                  )
                }
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Line Items"
        trailing={
          <div className="flex flex-wrap items-center gap-2">
            <button
              ref={lineMenuRef}
              type="button"
              aria-label="Line item bulk actions"
              onClick={() => setLineMenuOpen((o) => !o)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2D2D30] bg-[#1A1A1A] text-[#FDFDFF] hover:bg-white/5"
            >
              <ChevronDownIcon />
            </button>
            <DashboardMenuPopover
              open={lineMenuOpen}
              onClose={() => setLineMenuOpen(false)}
              anchorRef={lineMenuRef}
              align="right"
              className="min-w-[240px]"
              items={[
                {
                  id: "template",
                  label: "Add From Template",
                  onSelect: () => void openTemplates(),
                },
                {
                  id: "rates",
                  label: "Add All Of This Customers Rates",
                  onSelect: () => void addAllCustomerRates(),
                },
                {
                  id: "import",
                  label: "Import From A Previous Quote",
                  onSelect: () => void openImportPrevious(),
                },
                {
                  id: "clear",
                  label: "Clear All",
                  destructive: true,
                  onSelect: () => void clearAllLines(),
                },
              ]}
            />
            <GlassBtn href={`/crm/quotes/${quote.id}/edit`}>
              + Add Custom Item
            </GlassBtn>
            <GlassBtn href={`/crm/quotes/${quote.id}/edit`}>
              + Add Line Item
            </GlassBtn>
          </div>
        }
      >
        {lines.length === 0 ? (
          <p className="font-sans text-[11px] uppercase text-[#959597]">
            No line items
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="w-8 pb-2.5 pr-1" aria-hidden />
                  <th className="pb-2.5 pr-3 font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
                    Item
                  </th>
                  <th className="w-[72px] pb-2.5 px-1 text-center font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
                    Qty
                  </th>
                  <th className="w-[120px] pb-2.5 px-1 text-center font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
                    Rate
                  </th>
                  <th className="w-[120px] pb-2.5 pl-1 text-right font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
                    Amount
                  </th>
                  <th className="w-8 pb-2.5" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const manual = isManualOverride(
                    line.item,
                    line.quantity,
                    line.rate,
                    line.amount,
                  );
                  const label = lineItemLabel(line.item) || line.item;
                  return (
                    <tr key={line.id} className="group">
                      <td className="py-2.5 pr-1 align-middle text-[#6F6F72]">
                        <button
                          type="button"
                          aria-label="Line actions"
                          className="inline-flex cursor-grab items-center justify-center p-0.5 active:cursor-grabbing"
                          onClick={(e) => {
                            rowMenuRef.current = e.currentTarget;
                            setRowMenuId((id) =>
                              id === line.id ? null : line.id,
                            );
                          }}
                        >
                          <DragHandleIcon />
                        </button>
                      </td>
                      <td className="py-2.5 pr-3 align-middle">
                        <div className="min-w-0">
                          <p className="font-sans text-[11px] font-[510] uppercase leading-snug tracking-[-0.02em] text-[#FDFDFF]">
                            {label}
                          </p>
                          {manual ? (
                            <p className="mt-0.5 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#E8A54B]">
                              Manual Override
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-1 py-2.5 text-center align-middle">
                        <CellBox className="w-full min-w-[3rem]">
                          {line.quantity}
                        </CellBox>
                      </td>
                      <td className="px-1 py-2.5 text-center align-middle">
                        <CellBox className="w-full min-w-[5.5rem]">
                          {money(line.rate)}
                        </CellBox>
                      </td>
                      <td className="py-2.5 pl-2 text-right align-middle">
                        <span className="font-sans text-[12px] font-[510] uppercase tabular-nums tracking-[-0.02em] text-[#FDFDFF]">
                          {money(line.amount)}
                        </span>
                      </td>
                      <td className="w-8 py-2.5 pl-1 align-middle">
                        <button
                          ref={rowMenuId === line.id ? rowMenuRef : undefined}
                          type="button"
                          aria-label={`Line ${index + 1} actions`}
                          onClick={(e) => {
                            rowMenuRef.current = e.currentTarget;
                            setRowMenuId((id) =>
                              id === line.id ? null : line.id,
                            );
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#6F6F72] opacity-0 transition-opacity hover:bg-white/5 hover:text-[#FDFDFF] group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <ChevronDownIcon />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <DashboardMenuPopover
          open={Boolean(rowMenuId && rowMenuLine)}
          onClose={() => setRowMenuId(null)}
          anchorRef={rowMenuRef}
          align="right"
          className="min-w-[160px]"
          items={
            rowMenuLine
              ? [
                  {
                    id: "edit",
                    label: "Edit",
                    onSelect: () =>
                      router.push(`/crm/quotes/${quote.id}/edit`),
                  },
                  {
                    id: "dup",
                    label: "Duplicate",
                    onSelect: () => void duplicateLine(rowMenuLine.id),
                  },
                  {
                    id: "up",
                    label: "Move Up",
                    onSelect: () => void reorderLine(rowMenuLine.id, -1),
                  },
                  {
                    id: "down",
                    label: "Move Down",
                    onSelect: () => void reorderLine(rowMenuLine.id, 1),
                  },
                  {
                    id: "del",
                    label: "Delete Draft",
                    destructive: true,
                    onSelect: () => void deleteLine(rowMenuLine.id),
                  },
                ]
              : []
          }
        />
        <div className="mt-5 flex justify-end">
          <div className="w-full max-w-[220px] space-y-2">
            <div className="flex items-center justify-between gap-8 font-sans text-[11px] uppercase tracking-[-0.02em]">
              <span className="text-[#959597]">Subtotal</span>
              <span className="tabular-nums text-[#FDFDFF]">
                {money(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8 font-sans text-[11px] uppercase tracking-[-0.02em]">
              <span className="text-[#959597]">Tax (0%)</span>
              <span className="tabular-nums text-[#FDFDFF]">{money(tax)}</span>
            </div>
            <div className="flex items-center justify-between gap-8 font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              <span>Total</span>
              <span className="tabular-nums">{money(total)}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Quote Terms">
        <div className="max-w-xl space-y-0">
          <TermRow label="Valid Until" value={fmtDate(quote.expiresAt)} />
          <TermRow label="Payment Terms" value={paymentTerms} />
          <TermRow label="Discount" value={discountLabel} />
        </div>
      </SectionCard>

      <SendQuoteModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        defaultRecipient={recipientDisplay}
        defaultCc={ccDisplay}
        defaultSubject={sendSubject}
        defaultMessage={sendMessage}
        defaultPdfName={`Quote ${quote.quoteNumber} V${revision}.pdf`}
        defaultPdfSizeLabel="240 KB"
        onPreview={() => {
          setSendOpen(false);
          setPreviewOpen(true);
        }}
        onConfirm={handleSend}
      />

      <QuoteSentSuccessModal
        open={sentOpen}
        onClose={() => setSentOpen(false)}
        recipient={lastSend?.recipient ?? recipientDisplay}
        versionLabel={lastSend?.versionLabel ?? `Quote V${revision}`}
        sentAt={quote.sentAt ?? new Date()}
        supersedeWarning={lastSend?.supersedeWarning}
        quoteId={quote.id}
        onLogFollowUp={() => void logFollowUp()}
        onCopyLink={copyQuoteLink}
      />

      <QuoteSendFailedModal
        open={failOpen}
        onClose={() => setFailOpen(false)}
        errorReason={failReason}
        onDownloadManual={() => {
          setFailOpen(false);
          void exportQuote("pdf");
        }}
        onEditRecipient={() => {
          setFailOpen(false);
          setSendOpen(true);
        }}
        onRetry={() => {
          setFailOpen(false);
          setSendOpen(true);
        }}
      />

      <MarkAsAcceptedModal
        open={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        defaultAcceptedBy={recipientDisplay}
        onConfirm={handleMarkAccepted}
      />

      <QuotePreviewOverlay
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        quoteNumber={quote.quoteNumber}
        createdAt={quote.createdAt}
        expiresAt={quote.expiresAt}
        terms={paymentTerms}
        amount={quote.amount}
        customerName={quote.customer?.name}
        contactName={contactName}
        contactRole={contactRole !== "—" ? contactRole : null}
        billingAddress={quote.customer?.billingAddress}
        lineItems={lines}
        onPrint={() => window.print()}
        onDownload={() => void exportQuote("pdf")}
      />

      <QuoteVersionHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        quoteNumber={quote.quoteNumber}
        customer={quote.customer?.name ?? "—"}
        versions={historyVersions}
        onCompare={() => {
          setHistoryOpen(false);
          void openCompare();
        }}
        onOpenCurrent={() => {
          setHistoryOpen(false);
          setReloadKey((k) => k + 1);
        }}
      />

      <QuoteCompareVersionsModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        leftLabel={compareMeta.leftLabel}
        rightLabel={compareMeta.rightLabel}
        rows={compareMeta.rows}
        onKeepLeft={() => setCompareOpen(false)}
        onSendRight={() => {
          setCompareOpen(false);
          setSendOpen(true);
        }}
      />

      <WorkOrderCreatedModal
        open={woOpen && Boolean(woMeta)}
        onClose={() => {
          setWoOpen(false);
          setWoMeta(null);
        }}
        quoteNumber={quote.quoteNumber}
        workOrderCode={woMeta?.workOrderCode ?? "—"}
        customer={woMeta?.customer ?? "—"}
        value={woMeta?.value ?? "—"}
        scheduled={woMeta?.scheduled ?? "—"}
        createdBy={woMeta?.createdBy ?? "—"}
        quoteId={quote.id}
        workOrderId={woMeta?.workOrderId}
      />

      <CrmPickModal
        open={templateOpen}
        title="Add From Template"
        label="Template"
        confirmLabel="Add Lines"
        options={templateOpts}
        onClose={() => setTemplateOpen(false)}
        onConfirm={(value) => applyTemplate(value)}
      />

      <CrmPickModal
        open={importOpen}
        title="Import From A Previous Quote"
        label="Quote"
        confirmLabel="Import Lines"
        options={importOpts}
        onClose={() => setImportOpen(false)}
        onConfirm={(value) => importFromQuote(value)}
      />
    </div>
  );
}
