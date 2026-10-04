"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardSelectField,
  DashboardTextField,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import { operationsApi } from "@/lib/operations-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { OpsDetailStateGate } from "@/features/operations/operations-states";

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex items-center gap-2"
    >
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition",
          value ? "bg-[#52B788]" : "bg-[#3E3E3E]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition",
            value ? "left-4" : "left-0.5",
          )}
        />
      </span>
      {label ? (
        <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
          {label}
        </span>
      ) : null}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[#959597]">⚡</span>
        <h2 className="font-sans text-[13px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

type Line = { item: string; qty: number; unitPrice: number };

export function PurchaseOrderFormPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [vendors, setVendors] = React.useState<string[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [locations, setLocations] = React.useState<string[]>([]);
  const [receivers, setReceivers] = React.useState<string[]>([]);
  const [markupOptions, setMarkupOptions] = React.useState<number[]>([15]);
  const [workOrders, setWorkOrders] = React.useState<
    Array<{ id: string; code: string; customerName: string }>
  >([]);
  const [tickets, setTickets] = React.useState<
    Array<{ id: string; code: string }>
  >([]);
  const [poCode, setPoCode] = React.useState("PO-7741 - AUTO");

  const [vendor, setVendor] = React.useState("AIRGAS");
  const [vendorContact, setVendorContact] = React.useState("");
  const [orderDate, setOrderDate] = React.useState("JUN 12, 2026");
  const [expectedDelivery, setExpectedDelivery] =
    React.useState("JUN 14, 2026");
  const [workOrderId, setWorkOrderId] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [category, setCategory] = React.useState("CONSUMABLES");
  const [description, setDescription] = React.useState(
    "CALIBRATION GAS CYLINDERS",
  );
  const [lines, setLines] = React.useState<Line[]>([
    { item: "CALIBRATION GAS CYLINDERS", qty: 4, unitPrice: 310 },
  ]);
  const [deliveryLocation, setDeliveryLocation] = React.useState("YARD");
  const [receivedDate, setReceivedDate] = React.useState("JUN 13, 2026");
  const [received, setReceived] = React.useState(true);
  const [receivedBy, setReceivedBy] = React.useState("J. MARTINEZ");
  const [notes, setNotes] = React.useState(
    "DELIVER TO YARD; VERIFY CYLINDER LABELS AT RECEIPT.",
  );
  const [billBack, setBillBack] = React.useState(true);
  const [markupPct, setMarkupPct] = React.useState(15);
  const [ticketId, setTicketId] = React.useState("");
  const [blocksPayroll, setBlocksPayroll] = React.useState(true);

  useSetHeaderBreadcrumb(
    "Jobs / Operations / Purchase Orders / Add Purchase Order",
  );
  useSetHeaderActions(null, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await operationsApi.purchaseOrderOptions();
        if (cancelled) return;
        setVendors(res.data.vendors);
        setCategories(res.data.categories);
        setLocations(res.data.deliveryLocations);
        setReceivers(res.data.receivers);
        setMarkupOptions(res.data.markupOptions);
        setWorkOrders(res.data.workOrders);
        setTickets(res.data.salesTickets);
        setPoCode(res.data.nextPoCode);
        setVendor(res.data.vendors[0] ?? "AIRGAS");
        setCategory(res.data.categories[0] ?? "CONSUMABLES");
        if (res.data.workOrders[0]) {
          setWorkOrderId(res.data.workOrders[0].id);
          setCustomerName(res.data.workOrders[0].customerName);
        }
        if (res.data.salesTickets[0]) {
          setTicketId(res.data.salesTickets[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load form options");
          toastApiError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal = lines.reduce(
    (s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0),
    0,
  );
  const billable = Math.round(subtotal * (1 + markupPct / 100) * 100) / 100;
  const overThreshold = subtotal >= 1000;

  function money(n: number) {
    return `$${n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  async function submit() {
    if (!vendor.trim() || !description.trim()) {
      toastApiError(new Error("Vendor and description are required"));
      return;
    }
    setSaving(true);
    try {
      const res = await operationsApi.createPurchaseOrder({
        vendor,
        vendorContact: vendorContact || undefined,
        orderDate,
        expectedDelivery,
        workOrderId: workOrderId || undefined,
        ticketId: ticketId || undefined,
        category,
        description,
        lineItems: lines,
        deliveryLocation,
        received,
        receivedBy,
        receivedDate,
        notes,
        billBack,
        markupPct,
        blocksPayroll,
      });
      toastSuccess(`Created ${res.data.code}`);
      router.push("/operations/purchase-orders");
    } catch (err) {
      toastApiError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <OpsDetailStateGate
      loading={loading}
      error={error}
      onRetry={() => window.location.reload()}
    >
      <div className="space-y-4 bg-shell p-3 sm:p-6">
        <Section title="Order Details">
          <div className="grid gap-3 sm:grid-cols-2">
            <DashboardTextField
              label="PO Number *"
              value={poCode}
              onChange={() => undefined}
              disabled
            />
            <DashboardSelectField
              label="Vendor *"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              options={vendors.map((v) => ({ value: v, label: v }))}
            />
            <DashboardTextField
              label="Vendor Contact"
              value={vendorContact}
              onChange={(e) => setVendorContact(e.target.value)}
              placeholder="Select or enter contact..."
            />
            <DashboardTextField
              label="Order Date *"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
            <DashboardTextField
              label="Expected Delivery"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
            />
            <DashboardSelectField
              label="Work Order"
              value={workOrderId}
              onChange={(e) => { const id = e.target.value;
                setWorkOrderId(id);
                const wo = workOrders.find((w) => w.id === id);
                setCustomerName(wo?.customerName ?? "");
              }}
              options={workOrders.map((w) => ({
                value: w.id,
                label: w.code,
              }))}
            />
            <DashboardTextField
              label="Customer - From WO"
              value={customerName}
              onChange={() => undefined}
              disabled
            />
            <DashboardSelectField
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categories.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div className="mt-3">
            <DashboardTextField
              label="Description *"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-sans text-[11px] uppercase text-[#959597]">
                Line Items
              </p>
              <button
                type="button"
                onClick={() =>
                  setLines((prev) => [
                    ...prev,
                    { item: "NEW ITEM", qty: 1, unitPrice: 0 },
                  ])
                }
                className="font-sans text-[11px] uppercase text-[#3B82F6]"
              >
                + Add Line Item
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[#2A2A2A]">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="border-b border-[#2A2A2A] text-[10px] uppercase text-[#6F6F72]">
                    <th className="px-3 py-2">Item *</th>
                    <th className="px-3 py-2">Qty *</th>
                    <th className="px-3 py-2">Unit Price *</th>
                    <th className="px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="border-b border-[#2A2A2A]">
                      <td className="px-2 py-2">
                        <input
                          className="h-9 w-full rounded border border-[#3E3E3E] bg-[#1F1F1F] px-2 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none"
                          value={line.item}
                          onChange={(e) => {
                            const next = lines.slice();
                            next[idx] = { ...line, item: e.target.value };
                            setLines(next);
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          className="h-9 w-20 rounded border border-[#3E3E3E] bg-[#1F1F1F] px-2 font-sans text-[12px] text-[#FDFDFF] outline-none"
                          value={line.qty}
                          onChange={(e) => {
                            const next = lines.slice();
                            next[idx] = {
                              ...line,
                              qty: Number(e.target.value),
                            };
                            setLines(next);
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          className="h-9 w-28 rounded border border-[#3E3E3E] bg-[#1F1F1F] px-2 font-sans text-[12px] text-[#FDFDFF] outline-none"
                          value={line.unitPrice}
                          onChange={(e) => {
                            const next = lines.slice();
                            next[idx] = {
                              ...line,
                              unitPrice: Number(e.target.value),
                            };
                            setLines(next);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]">
                        {money(line.qty * line.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-1 text-right font-sans text-[12px] uppercase text-[#C8C8C8]">
              <p>Subtotal: {money(subtotal)}</p>
              <p>Tax: $0.00</p>
              <p className="text-[#FDFDFF]">Total *: {money(subtotal)}</p>
            </div>
          </div>

          {overThreshold ? (
            <div className="mt-4 rounded-lg border border-[#6B4E1E] bg-[#2A2418] px-4 py-3 font-sans text-[12px] uppercase text-[#E8C547]">
              ⚠ Over Approval Threshold - Approval Required Before Ordering
            </div>
          ) : null}
        </Section>

        <Section title="Fulfillment">
          <div className="grid gap-3 sm:grid-cols-2">
            <DashboardSelectField
              label="Delivery Location"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              options={locations.map((l) => ({ value: l, label: l }))}
            />
            <DashboardTextField
              label="Received Date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
            />
            <div className="space-y-1">
              <p className="font-sans text-[10px] uppercase text-[#959597]">
                Received
              </p>
              <Toggle
                value={received}
                onChange={setReceived}
                label={received ? "Yes" : "No"}
              />
            </div>
            <DashboardSelectField
              label="Received By"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              options={receivers.map((r) => ({ value: r, label: r }))}
            />
            <div className="sm:col-span-2">
              <DashboardTextField
                label="Receipt Attachment"
                value={`RECEIPT_${poCode.replace(/\s+/g, "")}.PDF - ATTACHED`}
                onChange={() => undefined}
                disabled
              />
            </div>
            <div className="sm:col-span-2">
              <DashboardTextField
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </Section>

        <Section title="Billing">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <p className="font-sans text-[10px] uppercase text-[#959597]">
                Bill Back To Customer *
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Toggle
                  value={billBack}
                  onChange={setBillBack}
                  label={billBack ? "Yes" : "No"}
                />
                <span className="font-sans text-[11px] uppercase text-[#959597]">
                  PO Total {money(subtotal)} - Markup {markupPct}%
                </span>
              </div>
            </div>
            <DashboardSelectField
              label="Markup %"
              value={String(markupPct)}
              onChange={(e) => setMarkupPct(Number(e.target.value))}
              options={markupOptions.map((m) => ({
                value: String(m),
                label: `${m}%`,
              }))}
            />
            <DashboardTextField
              label="Billable Amount"
              value={money(billable)}
              onChange={() => undefined}
              disabled
            />
            <DashboardSelectField
              label="Linked Sales Ticket"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              options={[
                { value: "", label: "Search or link sales ticket..." },
                ...tickets.map((t) => ({ value: t.id, label: t.code })),
              ]}
            />
            <DashboardTextField
              label="Billing Customer"
              value={customerName}
              onChange={() => undefined}
              disabled
            />
            <div className="space-y-1 sm:col-span-2">
              <p className="font-sans text-[10px] uppercase text-[#959597]">
                Blocks Payroll If Unresolved
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Toggle
                  value={blocksPayroll}
                  onChange={setBlocksPayroll}
                  label={blocksPayroll ? "Yes" : "No"}
                />
                <span className="font-sans text-[11px] uppercase text-[#959597]">
                  Until Required Receipt And Billing Link Are Complete
                </span>
              </div>
            </div>
          </div>
        </Section>

        <div className="flex flex-wrap justify-end gap-2">
          <Link href="/operations/purchase-orders">
            <DashboardToolbarButton>Cancel</DashboardToolbarButton>
          </Link>
          <DashboardToolbarButton
            variant="primary"
            disabled={saving}
            onClick={() => void submit()}
          >
            {saving ? "Saving…" : "Add Purchase Order"}
          </DashboardToolbarButton>
        </div>
      </div>
    </OpsDetailStateGate>
  );
}
