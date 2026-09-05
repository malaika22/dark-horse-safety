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
import { SendQuoteModal } from "./send-quote-modal";
import { DocumentPlusIcon } from "./crm-list-page-shell";

export function CreateQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sendOpen, setSendOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [customers, setCustomers] = React.useState<DashboardSelectOption[]>([]);
  const [customerId, setCustomerId] = React.useState(
    searchParams.get("customerId") ?? "",
  );
  const [contactName, setContactName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [terms, setTerms] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.lookupCustomers(
          searchParams.get("customer") || undefined,
        );
        if (cancelled) return;
        const opts = res.data.map((c) => ({ value: c.id, label: c.name }));
        const qId = searchParams.get("customerId");
        const qName = searchParams.get("customer");
        if (qId && qName && !opts.some((o) => o.value === qId)) {
          opts.unshift({ value: qId, label: qName });
        }
        setCustomers(opts);
        if (!customerId && opts[0]) setCustomerId(opts[0].value);
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, customerId]);

  async function handleCreate(send = false) {
    if (!customerId) {
      toastApiError(new Error("Customer is required"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await crmApi.createQuote({
        customerId,
        amount: parseMoney(amount) ?? 0,
        terms: terms || undefined,
        notes: notes || undefined,
        status: send ? "SENT" : "DRAFT",
      });
      if (send) {
        await crmApi.sendQuote(res.data.id);
        toastSuccess("Quote sent");
      } else {
        toastSuccess("Quote saved");
      }
      router.push(`/crm/quotes/${res.data.id}`);
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
            Create Quote
          </h1>
          <DashboardBadge variant="error" pill>
            Draft
          </DashboardBadge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/crm/quotes">
            <DashboardToolbarButton>Discard</DashboardToolbarButton>
          </Link>
          <DashboardToolbarButton
            disabled={submitting}
            onClick={() => void handleCreate(false)}
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
        onConfirm={() => {
          setSendOpen(false);
          void handleCreate(true);
        }}
      />
    </div>
  );
}
