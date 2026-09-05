"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardBadge,
  DashboardFormGrid,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardSelectField,
  DashboardTextField,
  DashboardToolbarButton,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { parseMoney } from "@/lib/crm-ui";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { SendQuoteModal, type SendQuotePayload } from "./send-quote-modal";
import { DocumentPlusIcon } from "./crm-list-page-shell";

const STATUS_OPTIONS: DashboardSelectOption[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "ARCHIVED", label: "Archived" },
];

/**
 * Shared Create / Edit Quote screen — same UI for both modes.
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
  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);
  const [customers, setCustomers] = React.useState<DashboardSelectOption[]>([]);
  const [customerId, setCustomerId] = React.useState(
    searchParams.get("customerId") ?? "",
  );
  const [contactId, setContactId] = React.useState(
    searchParams.get("contactId") ?? "",
  );
  const [contactName, setContactName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [terms, setTerms] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [status, setStatus] = React.useState("DRAFT");

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
                setContactName(contactRes.data.fullName ?? "");
                setEmail(contactRes.data.email ?? "");
                if (contactRes.data.primaryCustomerId) {
                  setCustomerId(contactRes.data.primaryCustomerId);
                }
              }
            } catch {
              /* ignore missing contact */
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
  }, [searchParams, customerId, isEdit]);

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
        setContactName(q.contact?.fullName ?? "");
        setAmount(q.amount != null ? String(q.amount) : "");
        setTerms(q.terms ?? "");
        setNotes(q.notes ?? "");
        setStatus(q.status || "DRAFT");
        if (q.contact?.id) {
          try {
            const contactRes = await crmApi.getContact(q.contact.id);
            if (!cancelled && contactRes.data) {
              setEmail(contactRes.data.email ?? "");
              if (contactRes.data.fullName) {
                setContactName(contactRes.data.fullName);
              }
            }
          } catch {
            /* contact email optional */
          }
        }
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

  async function resolveContactId(): Promise<string | undefined> {
    if (contactId) return contactId;
    if (!email.trim() || !customerId) return undefined;
    try {
      const list = await crmApi.listContacts({
        q: email.trim(),
        customerId,
        pageSize: 5,
      });
      const match = (list.data.items ?? []).find(
        (c) => c.email?.toLowerCase() === email.trim().toLowerCase(),
      );
      if (match) {
        setContactId(match.id);
        return match.id;
      }
    } catch {
      /* fall through */
    }
    return undefined;
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

  async function handleSave(sendPayload?: SendQuotePayload) {
    if (!customerId) {
      toastApiError(new Error("Customer is required"));
      return;
    }
    setSubmitting(true);
    try {
      const resolvedContactId = await resolveContactId();
      let noteText = notes || undefined;
      if (!resolvedContactId && (email.trim() || contactName.trim())) {
        const contactNote = [
          contactName.trim() ? `Contact: ${contactName.trim()}` : null,
          email.trim() ? `Email: ${email.trim()}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        noteText = noteText ? `${noteText}\n${contactNote}` : contactNote;
      }

      const body = {
        customerId,
        contactId: resolvedContactId,
        amount: parseMoney(amount) ?? 0,
        terms: terms || undefined,
        notes: noteText,
        status: sendPayload ? "SENT" : status || "DRAFT",
      };

      let id = quoteId;
      if (isEdit && quoteId) {
        await crmApi.updateQuote(quoteId, body);
        id = quoteId;
      } else {
        const res = await crmApi.createQuote(body);
        id = res.data.id;
      }

      if (sendPayload && id) {
        const attachmentIds = await uploadSendAttachments(id, sendPayload.files);
        await crmApi.sendQuote(id, {
          to: sendPayload.recipient,
          subject: sendPayload.subject,
          message: sendPayload.message,
          schedule: sendPayload.schedule,
          attachmentIds: attachmentIds.length ? attachmentIds : undefined,
        });
        toastSuccess("Quote sent");
      } else {
        toastSuccess(isEdit ? "Quote updated" : "Quote saved");
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
      <div className="bg-shell p-6 font-sans text-sm text-[#959597]">
        Loading quote…
      </div>
    );
  }

  const cancelHref = isEdit && quoteId ? `/crm/quotes/${quoteId}` : "/crm/quotes";
  const statusLabel =
    STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
            {isEdit ? "Edit Quote" : "Create Quote"}
          </h1>
          <DashboardBadge variant="error" pill>
            {statusLabel}
          </DashboardBadge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={cancelHref}>
            <DashboardToolbarButton>Discard</DashboardToolbarButton>
          </Link>
          <DashboardToolbarButton
            disabled={submitting}
            onClick={() => void handleSave()}
          >
            {isEdit ? "Save" : "Save Draft"}
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardPanel>
          <div className="px-4 pt-4 pb-3">
            <DashboardPanelTitle icon="lightning" title="Customer & Contact" />
          </div>
          <div className="p-4">
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardSelectField
                label="Customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                options={customers}
                containerClassName="md:col-span-2"
              />
              <DashboardTextField
                label="Contact"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                containerClassName="md:col-span-2"
              />
              <DashboardTextField
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                containerClassName="md:col-span-2"
              />
            </DashboardFormGrid>
          </div>
        </DashboardPanel>

        <DashboardPanel>
          <div className="px-4 pt-4 pb-3">
            <DashboardPanelTitle icon="lightning" title="Quote Details" />
          </div>
          <div className="p-4">
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="$0.00"
              />
              <DashboardTextField
                label="Terms"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Net 30"
              />
              {isEdit ? (
                <DashboardSelectField
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={STATUS_OPTIONS}
                />
              ) : null}
              <DashboardTextField
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                containerClassName="md:col-span-2"
              />
            </DashboardFormGrid>
          </div>
        </DashboardPanel>
      </div>

      <SendQuoteModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        defaultRecipient={email}
        defaultSubject="Quote"
        onConfirm={(payload) => handleSave(payload)}
      />
    </div>
  );
}
