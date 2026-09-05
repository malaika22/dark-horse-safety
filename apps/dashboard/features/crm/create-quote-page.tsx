"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  DashboardBadge,
  DashboardFormGrid,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardTextField,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { SendQuoteModal } from "./send-quote-modal";
import { DocumentPlusIcon } from "./crm-list-page-shell";
import { QUOTE_DETAIL } from "./data/quotes.mock";

function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
      {children}
    </h2>
  );
}

export function CreateQuotePage() {
  const searchParams = useSearchParams();
  const customerName =
    searchParams.get("customer")?.trim() || "Permian Basin Energy";
  const [sendOpen, setSendOpen] = React.useState(false);
  const d = QUOTE_DETAIL;

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
          <DashboardToolbarButton>Save Draft</DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            leftIcon={<DocumentPlusIcon className="shrink-0" />}
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
          <div className="divider-line-full w-full" aria-hidden />
          <div className="p-4">
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="Customer"
                defaultValue={customerName}
                containerClassName="md:col-span-2"
              />
              <DashboardTextField
                label="Contact"
                defaultValue="J. Whitfield · Operations Manager"
                containerClassName="md:col-span-2"
              />
              <DashboardTextField
                label="Email"
                defaultValue="jwhitfield@permianbasin.com"
                containerClassName="md:col-span-2"
              />
              <DashboardTextField
                label="Billing Address"
                defaultValue="1200 Energy Plaza, Midland, TX"
                containerClassName="md:col-span-2"
              />
            </DashboardFormGrid>
          </div>
        </DashboardPanel>

        <DashboardPanel>
          <div className="px-4 pt-4 pb-3">
            <DashboardPanelTitle icon="lightning" title="Quote Details" />
          </div>
          <div className="divider-line-full w-full" aria-hidden />
          <div className="p-4">
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="Quote #"
                defaultValue="Q-1042 (Draft)"
                containerClassName="md:col-span-2"
              />
              <DashboardTextField label="Created" defaultValue="Jun 12, 2026" />
              <DashboardTextField label="Valid Until" defaultValue="Jul 12, 2026" />
              <DashboardTextField
                label="Owner"
                defaultValue="R. Crawford"
                containerClassName="md:col-span-2"
              />
            </DashboardFormGrid>
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel>
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
          <PanelHeading>Line Items</PanelHeading>
          <DashboardToolbarButton>+ Add Line Item</DashboardToolbarButton>
        </div>
        <div className="divider-line-full w-full" aria-hidden />
        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-divider text-left">
                {["Item", "Qty", "Rate", "Amount"].map((h) => (
                  <th
                    key={h}
                    className="pb-3 font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.lineItems.map((line) => (
                <tr key={line.id} className="border-b border-divider/60">
                  <td className="py-3 font-sans text-[12px] uppercase text-[#FDFDFF]">{line.item}</td>
                  <td className="py-3 font-sans text-[12px] uppercase text-[#C8C8C8]">{line.qty}</td>
                  <td className="py-3 font-sans text-[12px] uppercase text-[#C8C8C8]">{line.rate}</td>
                  <td className="py-3 font-sans text-[12px] uppercase text-[#FDFDFF]">{line.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 ml-auto w-full max-w-xs space-y-2">
            {d.totals.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="font-sans text-[11px] uppercase text-[#959597]">{item.label}</span>
                <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel>
        <div className="px-4 pt-4 pb-3">
          <DashboardPanelTitle icon="lightning" title="Quote Terms" />
        </div>
        <div className="divider-line-full w-full" aria-hidden />
        <div className="p-4">
          <DashboardFormGrid className="gap-x-4 gap-y-5">
            <DashboardTextField label="Payment Terms" defaultValue="Net 30" />
            <DashboardTextField label="Discount" defaultValue="0%" />
            <DashboardTextField
              label="Notes to Customer"
              defaultValue="Quote valid for 30 days from creation."
              containerClassName="md:col-span-2"
            />
          </DashboardFormGrid>
        </div>
      </DashboardPanel>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/crm/quotes">
          <DashboardToolbarButton>Cancel</DashboardToolbarButton>
        </Link>
        <DashboardToolbarButton>Save & Add Another</DashboardToolbarButton>
        <DashboardToolbarButton variant="primary">Save</DashboardToolbarButton>
      </div>

      <SendQuoteModal open={sendOpen} onClose={() => setSendOpen(false)} />
    </div>
  );
}
