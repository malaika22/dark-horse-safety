"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardBadge,
  DashboardField,
  DashboardFormGrid,
  DashboardMenuPopover,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardSelectField,
  DashboardTextField,
  DashboardToolbarButton,
  cn,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmQuoteAttachment } from "@/lib/crm-api";
import { parseMoney, toIsoDate } from "@/lib/crm-ui";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { CrmPickModal } from "./crm-action-modals";
import {
  AddCustomItemModal,
  JobTemplatePickerModal,
  QUOTE_JOB_PACKAGES,
  type JobPackageOption,
} from "./create-quote-overlays";
import { SendQuoteModal, type SendQuotePayload } from "./send-quote-modal";
import { DocumentPlusIcon } from "./crm-list-page-shell";
import { useCrmDialogs } from "./use-crm-dialogs";

type LineKind = "standard" | "custom";

type LineItem = {
  key: string;
  item: string;
  description: string;
  qty: string;
  rate: string;
  kind: LineKind;
  /** Catalog rate from pricing rules — used to detect manual override. */
  catalogRate: number | null;
};

type PricingRuleOpt = {
  id: string;
  label: string;
  rate: number;
};

const textareaClass =
  "min-h-[88px] w-full resize-y rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5 font-sans text-[12px] font-normal uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF] outline-none transition-colors placeholder:text-[#959597] focus:border-[#5A5A5A] md:text-[13px]";

const inputClass =
  "h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#959597] focus:border-[#5A5A5A]";

function newLine(partial?: Partial<LineItem>): LineItem {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    item: partial?.item ?? "",
    description: partial?.description ?? "",
    qty: partial?.qty ?? "1",
    rate: partial?.rate ?? "",
    kind: partial?.kind ?? "standard",
    catalogRate:
      partial?.catalogRate !== undefined
        ? (partial.catalogRate ?? null)
        : partial?.rate != null && partial.rate !== ""
          ? (parseMoney(String(partial.rate)) ?? null)
          : null,
  };
}

function matchRate(
  itemName: string,
  rules: PricingRuleOpt[],
): number | null {
  const needle = itemName.toLowerCase();
  const exact = rules.find((r) => r.label.toLowerCase() === needle);
  if (exact) return exact.rate;
  const partial = rules.find(
    (r) =>
      needle.includes(r.label.toLowerCase()) ||
      r.label.toLowerCase().includes(needle),
  );
  return partial?.rate ?? null;
}

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function stripLineFlags(item: string) {
  return item
    .replace(/\s*[·•|\-–—]?\s*manual\s*override\s*/gi, " ")
    .replace(/\s*[·•|\-–—]?\s*custom\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isManualOverride(line: LineItem) {
  if (/manual\s*override/i.test(line.item)) return true;
  if (line.catalogRate == null) return false;
  const rate = parseMoney(line.rate);
  if (rate == null) return false;
  return Math.abs(rate - line.catalogRate) > 0.009;
}

function serializeLineItem(line: LineItem) {
  let item = stripLineFlags(line.item.trim());
  if (!item) return null;
  if (line.description.trim()) {
    item = `${item} · ${line.description.trim()}`;
  }
  if (line.kind === "custom" && !/\bcustom\b/i.test(item)) {
    item = `${item} - CUSTOM`;
  }
  if (isManualOverride(line) && !/manual\s*override/i.test(item)) {
    item = `${item} - MANUAL OVERRIDE`;
  }
  return {
    item,
    quantity: Number(line.qty) || 1,
    rate: parseMoney(line.rate) ?? 0,
  };
}

function SaveDiskIcon({ className }: { className?: string }) {
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
        d="M5 4h11l3 3v13H5V4z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M8 4v5h8V4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8 18h8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden>
      <circle cx="3" cy="2" r="1.25" fill="currentColor" />
      <circle cx="7" cy="2" r="1.25" fill="currentColor" />
      <circle cx="3" cy="7" r="1.25" fill="currentColor" />
      <circle cx="7" cy="7" r="1.25" fill="currentColor" />
      <circle cx="3" cy="12" r="1.25" fill="currentColor" />
      <circle cx="7" cy="12" r="1.25" fill="currentColor" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 2 20h20L12 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4M12 17.5v.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Shared Create / Edit Quote screen — matches Create Quote Figma layout.
 */
export function CreateQuotePage({
  mode = "create",
  quoteId,
}: {
  mode?: "create" | "edit";
  quoteId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { askConfirm, dialogs } = useCrmDialogs();
  const isEdit = mode === "edit";
  const [sendOpen, setSendOpen] = React.useState(false);
  const [templateOpen, setTemplateOpen] = React.useState(false);
  const [customOpen, setCustomOpen] = React.useState(false);
  const [editLineKey, setEditLineKey] = React.useState<string | null>(null);
  const [lineMenuOpen, setLineMenuOpen] = React.useState(false);
  const lineMenuRef = React.useRef<HTMLButtonElement>(null);
  const [rowMenuKey, setRowMenuKey] = React.useState<string | null>(null);
  const rowMenuRef = React.useRef<HTMLButtonElement>(null);
  const [pricingPickOpen, setPricingPickOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [previousQuotes, setPreviousQuotes] = React.useState<
    { value: string; label: string; hint?: string }[]
  >([]);
  const [reorderMode, setReorderMode] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);

  const [customers, setCustomers] = React.useState<DashboardSelectOption[]>([]);
  const [contacts, setContacts] = React.useState<DashboardSelectOption[]>([]);
  const [locations, setLocations] = React.useState<DashboardSelectOption[]>([]);
  const [pricingRules, setPricingRules] = React.useState<PricingRuleOpt[]>([]);

  const [customerId, setCustomerId] = React.useState(
    searchParams.get("customerId") ?? "",
  );
  const [contactId, setContactId] = React.useState(
    searchParams.get("contactId") ?? "",
  );
  const [locationId, setLocationId] = React.useState("");
  const [quoteDate, setQuoteDate] = React.useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [validUntil, setValidUntil] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [terms, setTerms] = React.useState("");
  const [discountPct, setDiscountPct] = React.useState("");
  const [taxPct, setTaxPct] = React.useState("");
  const [customerNotes, setCustomerNotes] = React.useState("");
  const [internalNotes, setInternalNotes] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [status, setStatus] = React.useState("DRAFT");
  const [lines, setLines] = React.useState<LineItem[]>([newLine()]);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [savedAttachments, setSavedAttachments] = React.useState<
    CrmQuoteAttachment[]
  >([]);
  const [dragKey, setDragKey] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isEdit) {
          const contactParam = searchParams.get("contactId");
          if (contactParam) {
            try {
              const contactRes = await crmApi.getContact(contactParam);
              if (!cancelled && contactRes.data) {
                setContactId(contactRes.data.id);
                if (contactRes.data.primaryCustomerId) {
                  setCustomerId(contactRes.data.primaryCustomerId);
                }
              }
            } catch {
              /* ignore */
            }
          }
        }

        const res = await crmApi.lookupCustomers(
          !isEdit ? searchParams.get("customer") || undefined : undefined,
        );
        if (cancelled) return;
        const opts = res.data.map((c) => ({ value: c.id, label: c.name }));
        if (!isEdit) {
          const qId = searchParams.get("customerId");
          const qName = searchParams.get("customer");
          if (qId && qName && !opts.some((o) => o.value === qId)) {
            opts.unshift({ value: qId, label: qName });
          }
        }
        setCustomers(opts);
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, isEdit]);

  React.useEffect(() => {
    if (!isEdit || !quoteId) return;
    let cancelled = false;
    (async () => {
      try {
        const [res, attRes] = await Promise.all([
          crmApi.getQuote(quoteId),
          crmApi.listQuoteAttachments(quoteId).catch(() => null),
        ]);
        if (cancelled) return;
        const q = res.data;
        setCustomerId(q.customer?.id ?? "");
        setContactId(q.contact?.id ?? "");
        setTerms(q.terms ?? "");
        setStatus((q.status || "DRAFT").toUpperCase());
        if (q.expiresAt) setValidUntil(q.expiresAt.slice(0, 10));
        if (q.createdAt) setQuoteDate(q.createdAt.slice(0, 10));
        const notes = q.notes ?? "";
        const internalMatch = notes.match(/\[INTERNAL\]\s*([\s\S]*)$/i);
        if (internalMatch) {
          setInternalNotes(internalMatch[1]?.trim() ?? "");
          setCustomerNotes(notes.replace(internalMatch[0], "").trim());
        } else {
          setCustomerNotes(notes);
        }
        const disc = notes.match(/Discount:\s*([\d.]+)%/i);
        const tax = notes.match(/Tax:\s*([\d.]+)%/i);
        if (disc?.[1]) setDiscountPct(disc[1]);
        if (tax?.[1]) setTaxPct(tax[1]);
        const locMatch = notes.match(/Location:\s*(.+)/i);
        const loaded = (q.lineItems ?? []).map((line) => {
          const raw = line.item ?? "";
          const custom = /\bcustom\b/i.test(raw);
          return newLine({
            item: stripLineFlags(raw),
            qty: String(line.quantity ?? 1),
            rate: String(line.rate ?? ""),
            kind: custom ? "custom" : "standard",
            catalogRate: custom ? null : Number(line.rate) || null,
          });
        });
        setLines(loaded.length ? loaded : [newLine()]);
        if (q.customer?.id && q.customer.name) {
          setCustomers((prev) =>
            prev.some((o) => o.value === q.customer!.id)
              ? prev
              : [{ value: q.customer!.id, label: q.customer!.name }, ...prev],
          );
        }
        setSavedAttachments(attRes?.data ?? []);
        if (locMatch?.[1]) {
          /* location resolved after locations load */
        }
        setReady(true);
      } catch (err) {
        toastApiError(err);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, quoteId]);

  React.useEffect(() => {
    if (!customerId) {
      setContacts([]);
      setLocations([]);
      setPricingRules([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [contactRes, locRes, detailRes, pricingRes] = await Promise.all([
          crmApi.listContacts({ customerId, pageSize: 100 }),
          crmApi.lookupLocations(undefined, customerId),
          crmApi.getCustomer(customerId).catch(() => null),
          crmApi
            .listPricingRules({ customerId, pageSize: 50, status: "ACTIVE" })
            .catch(() => null),
        ]);
        if (cancelled) return;
        setContacts(
          (contactRes.data.items ?? []).map((c) => ({
            value: c.id,
            label: c.fullName,
          })),
        );
        setLocations(
          locRes.data.map((l) => ({
            value: l.id,
            label: [l.name, l.county].filter(Boolean).join(" · "),
          })),
        );
        if (detailRes?.data?.paymentTerms) {
          setTerms((prev) =>
            !prev ? `${detailRes.data.paymentTerms} (From Customer)` : prev,
          );
        }
        const rules = (pricingRes?.data.items ?? []).filter(
          (r) => (r.approvalStatus ?? "APPROVED").toUpperCase() === "APPROVED",
        );
        setPricingRules(
          rules.map((r) => ({
            id: r.id,
            label: r.serviceItem,
            rate: Number(r.rate) || 0,
          })),
        );
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  React.useEffect(() => {
    if (!contactId) {
      setContactEmail("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.getContact(contactId);
        if (!cancelled) setContactEmail(res.data.email ?? "");
      } catch {
        if (!cancelled) setContactEmail("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  const subtotal = React.useMemo(
    () =>
      lines.reduce((sum, line) => {
        const qty = Number(line.qty) || 0;
        const rate = parseMoney(line.rate) ?? 0;
        return sum + qty * rate;
      }, 0),
    [lines],
  );
  const discount = React.useMemo(() => {
    const pct = Number(discountPct) || 0;
    return subtotal * (pct / 100);
  }, [discountPct, subtotal]);
  const net = Math.max(0, subtotal - discount);
  const tax = React.useMemo(() => {
    const pct = Number(taxPct) || 0;
    return net * (pct / 100);
  }, [taxPct, net]);
  const total = net + tax;
  const customCount = lines.filter((l) => l.kind === "custom").length;

  function updateLine(key: string, patch: Partial<LineItem>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function applyPackage(pkg: JobPackageOption) {
    const next = pkg.items.map((itemName) => {
      const rate = matchRate(itemName, pricingRules);
      return newLine({
        item: itemName,
        qty: "1",
        rate: rate != null ? String(rate) : "",
        kind: "standard",
        catalogRate: rate,
      });
    });
    setLines(next.length ? next : [newLine()]);
    toastSuccess(`Applied ${pkg.label}`);
  }

  function addPricingRuleLine(ruleId: string) {
    const rule = pricingRules.find((r) => r.id === ruleId);
    if (!rule) return;
    setLines((prev) => [
      ...prev.filter((l) => l.item.trim() || l.rate.trim()),
      newLine({
        item: rule.label,
        qty: "1",
        rate: String(rule.rate),
        kind: "standard",
        catalogRate: rule.rate,
      }),
    ]);
    toastSuccess(`Added ${rule.label}`);
  }

  function addAllPricingRules() {
    if (pricingRules.length === 0) {
      toastApiError(new Error("No active pricing rules for this customer"));
      return;
    }
    setLines(
      pricingRules.map((r) =>
        newLine({
          item: r.label,
          qty: "1",
          rate: String(r.rate),
          kind: "standard",
          catalogRate: r.rate,
        }),
      ),
    );
    toastSuccess("Added customer pricing rules");
  }

  async function openImportPrevious() {
    if (!customerId) {
      toastApiError(new Error("Select a customer first"));
      return;
    }
    try {
      const res = await crmApi.listQuotes({
        customerId,
        pageSize: 50,
        sort: "createdAt",
        direction: "desc",
      });
      const opts = (res.data.items ?? [])
        .filter((q) => !quoteId || q.id !== quoteId)
        .map((q) => ({
          value: q.id,
          label: q.quoteNumber,
          hint: `${q.status} · ${money(Number(q.amount) || 0)}`,
        }));
      if (opts.length === 0) {
        toastApiError(new Error("No previous quotes for this customer"));
        return;
      }
      setPreviousQuotes(opts);
      setImportOpen(true);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function importFromQuote(id: string) {
    try {
      const res = await crmApi.getQuote(id);
      const imported = (res.data.lineItems ?? []).map((line) => {
        const raw = line.item ?? "";
        const custom = /\bcustom\b/i.test(raw);
        return newLine({
          item: stripLineFlags(raw),
          qty: String(line.quantity ?? 1),
          rate: String(line.rate ?? ""),
          kind: custom ? "custom" : "standard",
          catalogRate: custom ? null : Number(line.rate) || null,
        });
      });
      if (imported.length === 0) {
        toastApiError(new Error("That quote has no line items"));
        return;
      }
      setLines(imported);
      toastSuccess(`Imported from ${res.data.quoteNumber}`);
    } catch (err) {
      toastApiError(err);
    }
  }

  function moveLine(key: string, dir: -1 | 1) {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.key === key);
      if (idx < 0) return prev;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(nextIdx, 0, moved!);
      return next;
    });
  }

  function duplicateLine(key: string) {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.key === key);
      if (idx < 0) return prev;
      const src = prev[idx]!;
      const copy = newLine({
        item: src.item,
        description: src.description,
        qty: src.qty,
        rate: src.rate,
        kind: src.kind,
        catalogRate: src.catalogRate,
      });
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  async function clearAllLines() {
    const ok = await askConfirm({
      title: "Clear all line items?",
      description: "Remove every line item from this quote draft.",
      confirmLabel: "Clear All",
      destructive: true,
    });
    if (!ok) return;
    setLines([newLine()]);
  }

  function buildNotes() {
    const parts: string[] = [];
    if (customerNotes.trim()) parts.push(customerNotes.trim());
    if (locationId) {
      const loc = locations.find((l) => l.value === locationId);
      if (loc) parts.push(`Location: ${loc.label}`);
    }
    if (quoteDate) parts.push(`Quote date: ${quoteDate}`);
    if (Number(discountPct) > 0) parts.push(`Discount: ${discountPct}%`);
    if (Number(taxPct) > 0) parts.push(`Tax: ${taxPct}%`);
    if (internalNotes.trim()) {
      parts.push(`[INTERNAL] ${internalNotes.trim()}`);
    }
    return parts.join("\n") || undefined;
  }

  function buildLinePayload() {
    return lines
      .map(serializeLineItem)
      .filter((l): l is NonNullable<typeof l> => Boolean(l));
  }

  async function uploadPending(targetQuoteId: string) {
    for (const file of pendingFiles) {
      const buffer = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]!);
      }
      await crmApi.uploadQuoteAttachment(targetQuoteId, {
        fileName: file.name,
        mimeType: file.type || undefined,
        contentBase64: btoa(binary),
      });
    }
  }

  async function uploadSendAttachments(
    targetQuoteId: string,
    files: File[] | undefined,
  ): Promise<string[]> {
    const attachmentIds: string[] = [];
    for (const file of files ?? []) {
      const buffer = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]!);
      }
      const uploaded = await crmApi.uploadQuoteAttachment(targetQuoteId, {
        fileName: file.name,
        mimeType: file.type || undefined,
        contentBase64: btoa(binary),
      });
      if (uploaded.data?.id) attachmentIds.push(uploaded.data.id);
    }
    return attachmentIds;
  }

  async function handleSave(opts?: {
    sendPayload?: SendQuotePayload;
    addAnother?: boolean;
  }) {
    if (!customerId) {
      toastApiError(new Error("Customer is required"));
      return;
    }
    if (!contactId) {
      toastApiError(new Error("Contact is required"));
      return;
    }
    if (!quoteDate) {
      toastApiError(new Error("Quote date is required"));
      return;
    }
    if (!validUntil) {
      toastApiError(new Error("Valid until is required"));
      return;
    }
    const linePayload = buildLinePayload();
    if (linePayload.length === 0) {
      toastApiError(new Error("Add at least one line item"));
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        customerId,
        contactId,
        expiresAt: toIsoDate(validUntil),
        terms: terms || undefined,
        notes: buildNotes(),
        status: opts?.sendPayload ? "SENT" : status || "DRAFT",
        lineItems: linePayload,
      };

      let id = quoteId;
      if (isEdit && quoteId) {
        await crmApi.updateQuote(quoteId, body);
        id = quoteId;
      } else {
        const res = await crmApi.createQuote(body);
        id = res.data.id;
      }

      if (id && pendingFiles.length) {
        await uploadPending(id);
        setPendingFiles([]);
      }

      if (opts?.sendPayload && id) {
        const attachmentIds = await uploadSendAttachments(
          id,
          opts.sendPayload.files,
        );
        await crmApi.sendQuote(id, {
          to: opts.sendPayload.recipient,
          subject: opts.sendPayload.subject,
          message: opts.sendPayload.message,
          schedule: opts.sendPayload.schedule,
          scheduledAt:
            opts.sendPayload.schedule === "later"
              ? opts.sendPayload.scheduledAt
              : undefined,
          attachmentIds: attachmentIds.length ? attachmentIds : undefined,
        });
        toastSuccess(
          opts.sendPayload.schedule === "later"
            ? `Quote scheduled for ${opts.sendPayload.scheduledAt || "later"}`
            : "Quote sent",
        );
        router.push(`/crm/quotes/${id}`);
        return;
      }

      toastSuccess(isEdit ? "Quote updated" : "Quote saved");
      if (opts?.addAnother) {
        setContactId("");
        setLocationId("");
        setCustomerNotes("");
        setInternalNotes("");
        setDiscountPct("");
        setTaxPct("");
        setLines([newLine()]);
        setPendingFiles([]);
        setSavedAttachments([]);
        setStatus("DRAFT");
        router.push("/crm/quotes/new");
        return;
      }
      router.push(`/crm/quotes/${id}`);
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteDraft() {
    if (!isEdit || !quoteId) {
      router.push("/crm/quotes");
      return;
    }
    const ok = await askConfirm({
      title: "Delete Draft?",
      description:
        "This will archive the draft quote. This cannot be undone from here.",
      confirmLabel: "Delete Draft",
      destructive: true,
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await crmApi.archiveQuote(quoteId);
      toastSuccess("Draft deleted");
      router.push("/crm/quotes");
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeSavedAttachment(attachmentId: string) {
    if (!quoteId) return;
    try {
      await crmApi.deleteQuoteAttachment(quoteId, attachmentId);
      setSavedAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toastSuccess("Attachment removed");
    } catch (err) {
      toastApiError(err);
    }
  }

  function onDropLine(targetKey: string) {
    if (!dragKey || dragKey === targetKey) {
      setDragKey(null);
      return;
    }
    setLines((prev) => {
      const from = prev.findIndex((l) => l.key === dragKey);
      const to = prev.findIndex((l) => l.key === targetKey);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    });
    setDragKey(null);
  }

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell p-6">
        <BrandLoader label="Loading quote" />
      </div>
    );
  }

  const cancelHref =
    isEdit && quoteId ? `/crm/quotes/${quoteId}` : "/crm/quotes";
  const badgeLabel = (status || "DRAFT").toUpperCase();

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="font-sans text-[18px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">
            {isEdit ? "Edit Quote" : "Create Quote"}
          </h1>
          <DashboardBadge variant="error" pill>
            {badgeLabel === "DRAFT" ? "Draft" : badgeLabel}
          </DashboardBadge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DashboardToolbarButton
            disabled={submitting}
            onClick={() => void handleDeleteDraft()}
          >
            Delete Draft
          </DashboardToolbarButton>
          <Link href={cancelHref}>
            <DashboardToolbarButton>Discard</DashboardToolbarButton>
          </Link>
          <DashboardToolbarButton
            onClick={() => setTemplateOpen(true)}
          >
            Pick Job Template
          </DashboardToolbarButton>
          <DashboardToolbarButton
            leftIcon={<SaveDiskIcon />}
            disabled={submitting}
            onClick={() => void handleSave()}
          >
            Save Draft
          </DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            leftIcon={<DocumentPlusIcon className="shrink-0" />}
            disabled={submitting}
            onClick={() => setSendOpen(true)}
          >
            Send Quote
          </DashboardToolbarButton>
        </div>
      </div>

      <DashboardPanel className="overflow-hidden">
        <div className="px-4 pt-4 pb-3 sm:px-5">
          <DashboardPanelTitle
            icon="lightning"
            title="Customer and Contact Details"
          />
        </div>
        <div className="divider-line-full w-full" aria-hidden />
        <div className="space-y-5 p-4 sm:p-5">
          <DashboardFormGrid className="gap-x-4 gap-y-5">
            <DashboardSelectField
              label="Customer*"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setContactId("");
                setLocationId("");
                setTerms("");
              }}
              options={[
                { value: "", label: "Select customer" },
                ...customers,
              ]}
            />
            <DashboardSelectField
              label="Contact*"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              options={[
                { value: "", label: "Select contact" },
                ...contacts,
              ]}
            />
            <DashboardField label="Location">
              <select
                className={inputClass}
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">Select location</option>
                {locations.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                This customer&apos;s locations only.
              </p>
            </DashboardField>
            <DashboardTextField
              label="Quote Date*"
              type="date"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
            />
            <DashboardTextField
              label="Valid Until*"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
            <DashboardTextField
              label="Payment Terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Net 30"
            />
            <DashboardTextField
              label="Discount"
              value={discountPct}
              onChange={(e) => setDiscountPct(e.target.value)}
              placeholder="0%"
            />
            <DashboardTextField
              label="Tax"
              value={taxPct}
              onChange={(e) => setTaxPct(e.target.value)}
              placeholder="0%"
            />
            <DashboardField label="Notes to Customer">
              <textarea
                className={textareaClass}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Visible on the customer quote"
              />
            </DashboardField>
            <DashboardField label="Internal Notes">
              <textarea
                className={textareaClass}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Internal only"
              />
            </DashboardField>
          </DashboardFormGrid>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) {
                  setPendingFiles((prev) => [...prev, ...files]);
                }
                e.target.value = "";
              }}
            />
            {savedAttachments.length > 0 || pendingFiles.length > 0 ? (
              <ul className="space-y-2">
                {savedAttachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-[#1A1A1A] px-3 py-2.5"
                  >
                    <span className="min-w-0 truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {a.fileName}
                      {a.sizeBytes != null ? (
                        <span className="text-[#959597]">
                          {" "}
                          ({formatBytes(a.sizeBytes)})
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove attachment"
                      className="shrink-0 text-[#959597] hover:text-[#FDFDFF]"
                      onClick={() => void removeSavedAttachment(a.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
                {pendingFiles.map((f) => (
                  <li
                    key={`${f.name}-${f.size}-${f.lastModified}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-[#1A1A1A] px-3 py-2.5"
                  >
                    <span className="min-w-0 truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {f.name}{" "}
                      <span className="text-[#959597]">
                        ({formatBytes(f.size)})
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label="Remove file"
                      className="shrink-0 text-[#959597] hover:text-[#FDFDFF]"
                      onClick={() =>
                        setPendingFiles((prev) =>
                          prev.filter(
                            (x) =>
                              !(
                                x.name === f.name &&
                                x.size === f.size &&
                                x.lastModified === f.lastModified
                              ),
                          ),
                        )
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <DashboardToolbarButton
              onClick={() => fileInputRef.current?.click()}
            >
              + Add Attachment
            </DashboardToolbarButton>
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
          <DashboardPanelTitle icon="document" title="Line Items" />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <DashboardToolbarButton
                ref={lineMenuRef}
                showChevron
                onClick={() => setLineMenuOpen((o) => !o)}
              >
                Actions
              </DashboardToolbarButton>
              <DashboardMenuPopover
                open={lineMenuOpen}
                onClose={() => setLineMenuOpen(false)}
                anchorRef={lineMenuRef}
                align="right"
                className="min-w-[260px]"
                items={[
                  {
                    id: "add-line",
                    label: "Add Line Item",
                    onSelect: () =>
                      setLines((prev) => [
                        ...prev,
                        newLine({ kind: "standard" }),
                      ]),
                  },
                  {
                    id: "pricing",
                    label: "Add From Pricing Rules",
                    onSelect: () => {
                      if (!customerId) {
                        toastApiError(new Error("Select a customer first"));
                        return;
                      }
                      if (pricingRules.length === 0) {
                        toastApiError(
                          new Error("No active pricing rules for this customer"),
                        );
                        return;
                      }
                      setPricingPickOpen(true);
                    },
                  },
                  {
                    id: "custom",
                    label: "Add Custom Item",
                    onSelect: () => {
                      setEditLineKey(null);
                      setCustomOpen(true);
                    },
                  },
                  {
                    id: "template",
                    label: "Add From Template",
                    onSelect: () => setTemplateOpen(true),
                  },
                  {
                    id: "import",
                    label: "Import From A Previous Quote",
                    onSelect: () => void openImportPrevious(),
                  },
                  {
                    id: "reorder",
                    label: reorderMode ? "Done Reordering" : "Reorder",
                    onSelect: () => setReorderMode((v) => !v),
                  },
                  {
                    id: "clear",
                    label: "Clear All Line Items",
                    destructive: true,
                    onSelect: () => void clearAllLines(),
                  },
                ]}
              />
            </div>
            <DashboardToolbarButton
              onClick={() => {
                setEditLineKey(null);
                setCustomOpen(true);
              }}
            >
              + Add Custom Item
            </DashboardToolbarButton>
            <DashboardToolbarButton
              onClick={() =>
                setLines((prev) => [...prev, newLine({ kind: "standard" })])
              }
            >
              + Add Line Item
            </DashboardToolbarButton>
          </div>
        </div>
        <div className="divider-line-full w-full" aria-hidden />
        <div className="space-y-4 p-4 sm:p-5">
          <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
            Rate pre-fills from the customer&apos;s pricing rules.
          </p>
          {reorderMode ? (
            <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#E8C47C]">
              Reorder mode — drag the handle to rearrange lines.
            </p>
          ) : null}

          {customCount > 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-[#E8C47C]/35 bg-[#E8C47C]/10 px-3 py-2.5 text-[#E8C47C]">
              <span className="mt-0.5 shrink-0">
                <WarnIcon />
              </span>
              <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em]">
                {customCount} custom item{customCount === 1 ? "" : "s"} on this
                quote will not match automatically during billing
                reconciliation.
              </p>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-divider">
                  <th className="w-8 pb-3" aria-hidden />
                  <th className="pb-3 pr-3 font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
                    Item
                  </th>
                  <th className="w-[88px] pb-3 text-right font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
                    Qty
                  </th>
                  <th className="w-[120px] pb-3 text-right font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
                    Rate
                  </th>
                  <th className="w-[120px] pb-3 text-right font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
                    Amount
                  </th>
                  <th className="w-10 pb-3" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const qty = Number(line.qty) || 0;
                  const rate = parseMoney(line.rate) ?? 0;
                  const manual = isManualOverride(line);
                  return (
                    <tr
                      key={line.key}
                      className="group border-b border-divider"
                      onDragOver={(e) => {
                        if (reorderMode) e.preventDefault();
                      }}
                      onDrop={() => {
                        if (reorderMode) onDropLine(line.key);
                      }}
                    >
                      <td className="py-3 pr-1 align-middle text-[#6F6F72]">
                        <button
                          type="button"
                          draggable={reorderMode}
                          aria-label="Line actions"
                          className="inline-flex cursor-grab items-center justify-center p-0.5 active:cursor-grabbing"
                          onDragStart={() => {
                            if (reorderMode) setDragKey(line.key);
                          }}
                          onDragEnd={() => setDragKey(null)}
                          onClick={(e) => {
                            rowMenuRef.current = e.currentTarget;
                            setRowMenuKey((k) =>
                              k === line.key ? null : line.key,
                            );
                          }}
                        >
                          <DragHandleIcon />
                        </button>
                      </td>
                      <td className="py-3 pr-3 align-middle">
                        <input
                          value={line.item}
                          onChange={(e) =>
                            updateLine(line.key, { item: e.target.value })
                          }
                          placeholder="Service item"
                          className={inputClass}
                        />
                        {line.description ? (
                          <p className="mt-1 truncate font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                            {line.description}
                          </p>
                        ) : null}
                        {manual ? (
                          <p className="mt-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#E8A54B]">
                            Manual Override
                          </p>
                        ) : null}
                        {line.kind === "custom" ? (
                          <p className="mt-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#60A5FA]">
                            Custom
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3 pl-2 align-middle">
                        <input
                          value={line.qty}
                          onChange={(e) =>
                            updateLine(line.key, { qty: e.target.value })
                          }
                          className={cn(inputClass, "text-right tabular-nums")}
                        />
                      </td>
                      <td className="py-3 pl-2 align-middle">
                        <input
                          value={line.rate}
                          onChange={(e) =>
                            updateLine(line.key, { rate: e.target.value })
                          }
                          placeholder="0.00"
                          className={cn(inputClass, "text-right tabular-nums")}
                        />
                      </td>
                      <td className="py-3 pl-2 text-right align-middle font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                        {money(qty * rate)}
                      </td>
                      <td className="py-3 pl-2 text-right align-middle">
                        <button
                          type="button"
                          aria-label="Remove line"
                          className="font-sans text-[11px] uppercase text-[#959597] hover:text-[#FF4D4D]"
                          onClick={() =>
                            setLines((prev) =>
                              prev.length <= 1
                                ? [newLine()]
                                : prev.filter((l) => l.key !== line.key),
                            )
                          }
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <DashboardMenuPopover
            open={Boolean(rowMenuKey)}
            onClose={() => setRowMenuKey(null)}
            anchorRef={rowMenuRef}
            align="left"
            className="min-w-[180px]"
            items={
              rowMenuKey
                ? [
                    {
                      id: "edit",
                      label: "Edit",
                      onSelect: () => {
                        setEditLineKey(rowMenuKey);
                        setCustomOpen(true);
                      },
                    },
                    {
                      id: "dup",
                      label: "Duplicate",
                      onSelect: () => duplicateLine(rowMenuKey),
                    },
                    {
                      id: "up",
                      label: "Move Up",
                      onSelect: () => moveLine(rowMenuKey, -1),
                    },
                    {
                      id: "down",
                      label: "Move Down",
                      onSelect: () => moveLine(rowMenuKey, 1),
                    },
                    {
                      id: "del",
                      label: "Delete Draft",
                      destructive: true,
                      onSelect: () =>
                        setLines((prev) =>
                          prev.length <= 1
                            ? [newLine()]
                            : prev.filter((l) => l.key !== rowMenuKey),
                        ),
                    },
                  ]
                : []
            }
          />

          <div className="flex justify-end">
            <dl className="w-full max-w-[280px] space-y-2">
              <div className="flex items-center justify-between gap-6">
                <dt className="font-sans text-[11px] uppercase text-[#959597]">
                  Subtotal
                </dt>
                <dd className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                  {money(subtotal)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-6">
                <dt className="font-sans text-[11px] uppercase text-[#959597]">
                  Discount ({Number(discountPct) || 0}%)
                </dt>
                <dd className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                  -{money(discount)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-6">
                <dt className="font-sans text-[11px] uppercase text-[#959597]">
                  Net
                </dt>
                <dd className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                  {money(net)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-6">
                <dt className="font-sans text-[11px] uppercase text-[#959597]">
                  Tax ({Number(taxPct) || 0}%)
                </dt>
                <dd className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                  +{money(tax)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-6 border-t border-divider pt-2">
                <dt className="font-sans text-[12px] font-[510] uppercase text-[#FDFDFF]">
                  Total
                </dt>
                <dd className="font-sans text-[14px] font-[590] uppercase tabular-nums text-[#FDFDFF]">
                  {money(total)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </DashboardPanel>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href={cancelHref}>
          <DashboardToolbarButton>Cancel</DashboardToolbarButton>
        </Link>
        <DashboardToolbarButton
          disabled={submitting}
          onClick={() => void handleSave({ addAnother: true })}
        >
          Save & Add Another
        </DashboardToolbarButton>
        <DashboardToolbarButton
          variant="primary"
          disabled={submitting}
          onClick={() => void handleSave()}
        >
          Save
        </DashboardToolbarButton>
      </div>

      <JobTemplatePickerModal
        open={templateOpen}
        packages={QUOTE_JOB_PACKAGES}
        onClose={() => setTemplateOpen(false)}
        onSelect={applyPackage}
      />

      <AddCustomItemModal
        open={customOpen}
        mode={editLineKey ? "edit" : "create"}
        initial={
          editLineKey
            ? (() => {
                const line = lines.find((l) => l.key === editLineKey);
                return line
                  ? {
                      name: line.item,
                      description: line.description,
                      qty: line.qty,
                      rate: line.rate,
                    }
                  : null;
              })()
            : null
        }
        onClose={() => {
          setCustomOpen(false);
          setEditLineKey(null);
        }}
        onSubmit={(draft) => {
          if (editLineKey) {
            updateLine(editLineKey, {
              item: draft.name,
              description: draft.description,
              qty: draft.qty,
              rate: draft.rate,
            });
            return;
          }
          setLines((prev) => [
            ...prev.filter((l) => l.item.trim() || l.rate.trim()),
            newLine({
              item: draft.name,
              description: draft.description,
              qty: draft.qty,
              rate: draft.rate,
              kind: "custom",
              catalogRate: null,
            }),
          ]);
        }}
      />

      <CrmPickModal
        open={pricingPickOpen}
        title="Add From Pricing Rules"
        label="Pricing Rule"
        confirmLabel="Add Item"
        options={[
          {
            value: "__all__",
            label: "All Active Pricing Rules",
            hint: `${pricingRules.length} items`,
          },
          ...pricingRules.map((r) => ({
            value: r.id,
            label: r.label,
            hint: money(r.rate),
          })),
        ]}
        onClose={() => setPricingPickOpen(false)}
        onConfirm={(value) => {
          if (value === "__all__") addAllPricingRules();
          else addPricingRuleLine(value);
        }}
      />

      <CrmPickModal
        open={importOpen}
        title="Import From A Previous Quote"
        label="Quote"
        confirmLabel="Import Lines"
        options={previousQuotes}
        onClose={() => setImportOpen(false)}
        onConfirm={(value) => void importFromQuote(value)}
      />

      <SendQuoteModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        defaultRecipient={contactEmail}
        defaultSubject={`Quote — ${customers.find((c) => c.value === customerId)?.label ?? "Customer"}`}
        onConfirm={(payload) => handleSave({ sendPayload: payload })}
      />
      {dialogs}
    </div>
  );
}
