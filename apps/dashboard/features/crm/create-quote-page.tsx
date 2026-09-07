"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardBadge,
  DashboardField,
  DashboardFormGrid,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardSelectField,
  DashboardTextField,
  DashboardToolbarButton,
  cn,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { parseMoney, toIsoDate } from "@/lib/crm-ui";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { CrmPickModal } from "./crm-action-modals";
import { SendQuoteModal, type SendQuotePayload } from "./send-quote-modal";
import { DocumentPlusIcon } from "./crm-list-page-shell";

type LineItem = {
  key: string;
  item: string;
  qty: string;
  rate: string;
};

type JobTemplate = {
  id: string;
  label: string;
  lines: { item: string; qty: number; rate: number }[];
};

const textareaClass =
  "min-h-[88px] w-full resize-y rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5 font-sans text-[12px] font-normal uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF] outline-none transition-colors placeholder:text-[#959597] focus:border-[#5A5A5A] md:text-[13px]";

function newLine(partial?: Partial<LineItem>): LineItem {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    item: partial?.item ?? "",
    qty: partial?.qty ?? "1",
    rate: partial?.rate ?? "",
  };
}

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
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
      <path d="M8 18h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function PaperclipIcon({ className }: { className?: string }) {
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
        d="M21 12.5l-8.5 8.5a5 5 0 01-7.1-7.1L14.5 5a3.2 3.2 0 014.5 4.5L10 18.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
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
  const isEdit = mode === "edit";
  const [sendOpen, setSendOpen] = React.useState(false);
  const [templateOpen, setTemplateOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);

  const [customers, setCustomers] = React.useState<DashboardSelectOption[]>([]);
  const [contacts, setContacts] = React.useState<DashboardSelectOption[]>([]);
  const [locations, setLocations] = React.useState<DashboardSelectOption[]>([]);
  const [pricingHint, setPricingHint] = React.useState("");
  const [jobTemplates, setJobTemplates] = React.useState<JobTemplate[]>([]);

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
  const [terms, setTerms] = React.useState("Net 30");
  const [discountPct, setDiscountPct] = React.useState("0");
  const [taxPct, setTaxPct] = React.useState("0");
  const [customerNotes, setCustomerNotes] = React.useState("");
  const [internalNotes, setInternalNotes] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [status, setStatus] = React.useState("DRAFT");
  const [lines, setLines] = React.useState<LineItem[]>([newLine()]);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
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
        if (!isEdit && !customerId && opts[0]) setCustomerId(opts[0].value);
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!isEdit || !quoteId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.getQuote(quoteId);
        if (cancelled) return;
        const q = res.data;
        setCustomerId(q.customer?.id ?? "");
        setContactId(q.contact?.id ?? "");
        setTerms(q.terms ?? "Net 30");
        setStatus(q.status || "DRAFT");
        if (q.expiresAt) {
          setValidUntil(q.expiresAt.slice(0, 10));
        }
        if (q.createdAt) {
          setQuoteDate(q.createdAt.slice(0, 10));
        }
        const notes = q.notes ?? "";
        const internalMatch = notes.match(/\[INTERNAL\]\s*([\s\S]*)$/i);
        if (internalMatch) {
          setInternalNotes(internalMatch[1]?.trim() ?? "");
          setCustomerNotes(notes.replace(internalMatch[0], "").trim());
        } else {
          setCustomerNotes(notes);
        }
        const loaded = (q.lineItems ?? []).map((line) =>
          newLine({
            item: line.item,
            qty: String(line.quantity ?? 1),
            rate: String(line.rate ?? ""),
          }),
        );
        setLines(loaded.length ? loaded : [newLine()]);
        if (q.customer?.id && q.customer.name) {
          setCustomers((prev) =>
            prev.some((o) => o.value === q.customer!.id)
              ? prev
              : [{ value: q.customer!.id, label: q.customer!.name }, ...prev],
          );
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
      setPricingHint("");
      setJobTemplates([]);
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
            prev === "Net 30" || !prev
              ? `${detailRes.data.paymentTerms} (From Customer)`
              : prev,
          );
        }
        const rules = pricingRes?.data.items ?? [];
        if (rules[0]) {
          setPricingHint(
            `Rate pre-fills from the customer’s pricing rules · e.g. ${rules[0].serviceItem} @ ${money(Number(rules[0].rate))}`.toUpperCase(),
          );
          setJobTemplates([
            {
              id: "all-pricing-rules",
              label: "All Active Pricing Rules",
              lines: rules.map((r) => ({
                item: r.serviceItem,
                qty: 1,
                rate: Number(r.rate) || 0,
              })),
            },
            ...rules.map((r) => ({
              id: r.id,
              label: r.serviceItem,
              lines: [
                {
                  item: r.serviceItem,
                  qty: 1,
                  rate: Number(r.rate) || 0,
                },
              ],
            })),
          ]);
        } else {
          setPricingHint(
            "No active pricing rules for this customer — add line items manually.".toUpperCase(),
          );
          setJobTemplates([]);
        }
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
  const taxable = Math.max(0, subtotal - discount);
  const tax = React.useMemo(() => {
    const pct = Number(taxPct) || 0;
    return taxable * (pct / 100);
  }, [taxPct, taxable]);
  const total = taxable + tax;

  function updateLine(key: string, patch: Partial<LineItem>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function applyTemplate(templateId: string) {
    const template = jobTemplates.find((t) => t.id === templateId);
    if (!template) return;
    setLines(
      template.lines.map((line) =>
        newLine({
          item: line.item,
          qty: String(line.qty),
          rate: String(line.rate),
        }),
      ),
    );
    toastSuccess(`Applied ${template.label}`);
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
      .filter((line) => line.item.trim())
      .map((line) => ({
        item: line.item.trim(),
        quantity: Number(line.qty) || 1,
        rate: parseMoney(line.rate) ?? 0,
      }));
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
          attachmentIds: attachmentIds.length ? attachmentIds : undefined,
        });
        toastSuccess("Quote sent");
        router.push(`/crm/quotes/${id}`);
        return;
      }

      toastSuccess(isEdit ? "Quote updated" : "Quote saved");
      if (opts?.addAnother) {
        setContactId("");
        setLocationId("");
        setCustomerNotes("");
        setInternalNotes("");
        setDiscountPct("0");
        setTaxPct("0");
        setLines([newLine()]);
        setPendingFiles([]);
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

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell p-6">
        <BrandLoader label="Loading quote" />
      </div>
    );
  }

  const cancelHref =
    isEdit && quoteId ? `/crm/quotes/${quoteId}` : "/crm/quotes";

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="font-sans text-[18px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">
            {isEdit ? "Edit Quote" : "Create Quote"}
          </h1>
          <DashboardBadge variant="error" pill>
            {status === "DRAFT" ? "Draft" : status}
          </DashboardBadge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={cancelHref}>
            <DashboardToolbarButton>Discard</DashboardToolbarButton>
          </Link>
          <DashboardToolbarButton
            onClick={() => {
              if (jobTemplates.length === 0) {
                toastApiError(
                  new Error(
                    customerId
                      ? "No active pricing rules for this customer"
                      : "Select a customer first",
                  ),
                );
                return;
              }
              setTemplateOpen(true);
            }}
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
            <DashboardSelectField
              label="Location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              options={[
                { value: "", label: "Select location" },
                ...locations,
              ]}
            />
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
          </DashboardFormGrid>

          <div className="space-y-2">
            <p className="font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
              Line Items*
            </p>
            {pricingHint ? (
              <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                {pricingHint}
              </p>
            ) : null}
            <div className="overflow-hidden rounded-lg border border-[#2D2D30] bg-[#161618]">
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_64px_72px_88px] gap-2 border-b border-[#2D2D30] px-3 py-2 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                <span>Service</span>
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Rate</span>
                <span className="text-right">Total</span>
              </div>
              {(lines[0] ? [lines[0]] : []).map((line) => {
                const qty = Number(line.qty) || 0;
                const rate = parseMoney(line.rate) ?? 0;
                return (
                  <div
                    key={`preview-${line.key}`}
                    className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_64px_72px_88px] gap-2 px-3 py-2.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]"
                  >
                    <span className="truncate">{line.item || "—"}</span>
                    <span className="truncate text-[#959597]">
                      From pricing / template
                    </span>
                    <span className="text-right tabular-nums">{qty || "—"}</span>
                    <span className="text-right tabular-nums">
                      {rate ? money(rate) : "—"}
                    </span>
                    <span className="text-right tabular-nums">
                      {rate ? money(qty * rate) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <DashboardFormGrid className="gap-x-4 gap-y-5">
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
            <DashboardField label="Notes to Customer" className="md:col-span-1">
              <textarea
                className={textareaClass}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Visible on the customer quote"
              />
            </DashboardField>
            <DashboardField label="Internal Notes" className="md:col-span-1">
              <textarea
                className={textareaClass}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Internal only"
              />
            </DashboardField>
          </DashboardFormGrid>

          <div>
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
            <DashboardToolbarButton
              leftIcon={<PaperclipIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              Attachments
              {pendingFiles.length ? ` (${pendingFiles.length})` : ""}
            </DashboardToolbarButton>
            {pendingFiles.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {pendingFiles.map((f) => (
                  <li
                    key={`${f.name}-${f.size}`}
                    className="font-sans text-[11px] uppercase text-[#959597]"
                  >
                    {f.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
          <DashboardPanelTitle icon="document" title="Line Items" />
          <DashboardToolbarButton
            onClick={() => setLines((prev) => [...prev, newLine()])}
          >
            + Add Line Item
          </DashboardToolbarButton>
        </div>
        <div className="divider-line-full w-full" aria-hidden />
        <div className="overflow-x-auto p-4 sm:p-5">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-divider">
                {["Item", "Qty", "Rate", "Amount", ""].map((h) => (
                  <th
                    key={h || "rm"}
                    className={cn(
                      "pb-3 font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597]",
                      h === "Qty" || h === "Rate" || h === "Amount"
                        ? "text-right"
                        : "text-left",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const qty = Number(line.qty) || 0;
                const rate = parseMoney(line.rate) ?? 0;
                return (
                  <tr key={line.key} className="border-b border-divider">
                    <td className="py-3 pr-3">
                      <input
                        value={line.item}
                        onChange={(e) =>
                          updateLine(line.key, { item: e.target.value })
                        }
                        placeholder="Service item"
                        className="h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#959597]"
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <input
                        value={line.qty}
                        onChange={(e) =>
                          updateLine(line.key, { qty: e.target.value })
                        }
                        className="h-10 w-24 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 text-right font-sans text-[12px] uppercase tabular-nums tracking-[-0.02em] text-[#FDFDFF] outline-none"
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <input
                        value={line.rate}
                        onChange={(e) =>
                          updateLine(line.key, { rate: e.target.value })
                        }
                        placeholder="0.00"
                        className="h-10 w-28 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 text-right font-sans text-[12px] uppercase tabular-nums tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#959597]"
                      />
                    </td>
                    <td className="py-3 pr-3 text-right font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                      {money(qty * rate)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        className="font-sans text-[11px] uppercase text-[#959597] hover:text-[#FF4D4D]"
                        onClick={() =>
                          setLines((prev) =>
                            prev.length <= 1
                              ? [newLine()]
                              : prev.filter((l) => l.key !== line.key),
                          )
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end">
            <dl className="w-full max-w-[260px] space-y-2">
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
                  Tax ({Number(taxPct) || 0}%)
                </dt>
                <dd className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                  {money(tax)}
                </dd>
              </div>
              {Number(discountPct) > 0 ? (
                <div className="flex items-center justify-between gap-6">
                  <dt className="font-sans text-[11px] uppercase text-[#959597]">
                    Discount ({Number(discountPct) || 0}%)
                  </dt>
                  <dd className="font-sans text-[12px] uppercase tabular-nums text-[#FDFDFF]">
                    -{money(discount)}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-6 border-t border-divider pt-2">
                <dt className="font-sans text-[12px] font-[510] uppercase text-[#FDFDFF]">
                  Total
                </dt>
                <dd className="font-sans text-[13px] font-[590] uppercase tabular-nums text-[#FDFDFF]">
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

      <CrmPickModal
        open={templateOpen}
        title="Pick Job Template"
        label="Template"
        confirmLabel="Apply"
        options={jobTemplates.map((t) => ({
          value: t.id,
          label: t.label,
          hint: `${t.lines.length} lines`,
        }))}
        onClose={() => setTemplateOpen(false)}
        onConfirm={(value) => {
          applyTemplate(value);
        }}
      />

      <SendQuoteModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        defaultRecipient={contactEmail}
        defaultSubject={`Quote — ${customers.find((c) => c.value === customerId)?.label ?? "Customer"}`}
        onConfirm={(payload) => handleSave({ sendPayload: payload })}
      />
    </div>
  );
}
