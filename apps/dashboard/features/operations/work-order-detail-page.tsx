"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmWorkOrder } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmDetailStateGate } from "@/features/crm/crm-states";
import {
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";

function money(n?: string | number | null) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortRep(wo: CrmWorkOrder) {
  const r = wo.assignedRep;
  if (!r) return "—";
  const initial = r.firstName?.trim()?.[0];
  const last = r.lastName?.trim();
  if (initial && last) return `${initial}. ${last}`;
  return [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email || "—";
}

export function WorkOrderDetailPage({ workOrderId }: { workOrderId: string }) {
  const router = useRouter();
  const [wo, setWo] = React.useState<CrmWorkOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  useSetHeaderBreadcrumb(
    wo?.code ? `Work Order · ${wo.code}` : "Work Order",
  );

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await crmApi.getWorkOrder(workOrderId);
      setWo(res.data);
    } catch (err) {
      toastApiError(err);
      setWo(null);
      setError(err instanceof Error ? err.message : "Failed to load work order");
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function markComplete() {
    if (!wo) return;
    setSaving(true);
    try {
      const res = await crmApi.updateWorkOrder(wo.id, {
        status: "COMPLETE",
        crewAssigned: true,
        equipmentAssigned: true,
        formsCompleted: true,
        eligibilityVerified: true,
      });
      setWo(res.data);
      toastSuccess("Work order marked complete");
    } catch (err) {
      toastApiError(err);
    } finally {
      setSaving(false);
    }
  }

  async function assignDispatchItem(
    key:
      | "crewAssigned"
      | "equipmentAssigned"
      | "formsCompleted"
      | "eligibilityVerified",
  ) {
    if (!wo) return;
    setSaving(true);
    try {
      const res = await crmApi.updateWorkOrder(wo.id, { [key]: true });
      setWo(res.data);
      toastSuccess("Updated");
    } catch (err) {
      toastApiError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <CrmDetailStateGate loading={loading} error={error} onRetry={() => void reload()}>
      {wo ? (
        <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h1 className="font-sans text-[18px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">
                Work Order · {wo.code ?? "—"}
              </h1>
              <DashboardBadge variant="operations" pill>
                {(wo.status ?? "DRAFT").replace(/_/g, " ")}
              </DashboardBadge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DashboardToolbarButton onClick={() => router.push("/operations/work-orders")}>
                Back to list
              </DashboardToolbarButton>
              <DashboardToolbarButton
                variant="primary"
                disabled={saving || wo.status?.toUpperCase() === "COMPLETE"}
                onClick={() => void markComplete()}
              >
                {saving ? "Saving…" : "Complete Work Order"}
              </DashboardToolbarButton>
            </div>
          </div>

          {(wo.stillRequiredBeforeDispatch?.length ?? 0) > 0 ? (
            <div className="rounded-lg border border-[#8B6914]/50 bg-[#1C160C] px-3.5 py-3">
              <p className="mb-2 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#E8C07A]">
                Still Required Before Dispatch
              </p>
              <p className="mb-3 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#C8C8CA]">
                {wo.stillRequiredBeforeDispatch!.join(" · ")}
              </p>
              <div className="flex flex-wrap gap-2">
                {!wo.crewAssignedAt ? (
                  <DashboardToolbarButton
                    disabled={saving}
                    onClick={() => void assignDispatchItem("crewAssigned")}
                  >
                    Mark crew assigned
                  </DashboardToolbarButton>
                ) : null}
                {!wo.equipmentAssignedAt ? (
                  <DashboardToolbarButton
                    disabled={saving}
                    onClick={() => void assignDispatchItem("equipmentAssigned")}
                  >
                    Mark equipment assigned
                  </DashboardToolbarButton>
                ) : null}
                {!wo.formsCompletedAt ? (
                  <DashboardToolbarButton
                    disabled={saving}
                    onClick={() => void assignDispatchItem("formsCompleted")}
                  >
                    Mark forms complete
                  </DashboardToolbarButton>
                ) : null}
                {!wo.eligibilityVerifiedAt ? (
                  <DashboardToolbarButton
                    disabled={saving}
                    onClick={() =>
                      void assignDispatchItem("eligibilityVerified")
                    }
                  >
                    Mark eligibility verified
                  </DashboardToolbarButton>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-[#22C55E]/40 bg-[#203B2C]/40 px-3.5 py-3 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#ACEBCE]">
              Ready for dispatch — crew, equipment, forms, and eligibility are
              complete.
            </div>
          )}

          <div className="grid gap-3 rounded-xl border border-[#2D2D30] bg-[#121212] p-4 sm:grid-cols-2">
            {(
              [
                ["Work Order #", wo.code ?? "—"],
                ["Customer", wo.customer?.name ?? "—"],
                [
                  "Location",
                  wo.locationLabel ?? wo.location?.name ?? "—",
                ],
                ["Job Type", wo.category ?? "—"],
                ["Service Date", fmtDate(wo.serviceDate)],
                ["Assigned Rep", shortRep(wo)],
                [
                  "Source Quote",
                  wo.quote?.id ? (
                    <Link
                      key="q"
                      href={`/crm/quotes/${wo.quote.id}`}
                      className="text-[#7EB6FF] hover:underline"
                    >
                      {wo.quote.quoteNumber ?? "Quote"}
                    </Link>
                  ) : (
                    "—"
                  ),
                ],
                [
                  "Line Items & Pricing",
                  wo.lineItemsSummary ??
                    (wo.amount != null ? money(wo.amount) : "—"),
                ],
                ["Status", (wo.status ?? "DRAFT").replace(/_/g, " ")],
                ["Notes", wo.notes?.trim() || "—"],
              ] as [string, React.ReactNode][]
            ).map(([label, value]) => (
              <div key={label} className="space-y-1">
                <div className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                  {label}
                </div>
                <div className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {value}
                </div>
              </div>
            ))}
          </div>

          {Array.isArray(wo.lineItemsSnapshot) &&
          wo.lineItemsSnapshot.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-[#2D2D30]">
              <table className="min-w-full text-left">
                <thead className="bg-[#1A1A1A]">
                  <tr>
                    {["Item", "Qty", "Rate", "Amount"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {wo.lineItemsSnapshot.map((line, idx) => (
                    <tr
                      key={`${line.item}-${idx}`}
                      className="border-t border-[#2D2D30]"
                    >
                      <td className="px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]">
                        {line.item}
                      </td>
                      <td className="px-3 py-2 font-sans text-[11px] text-[#C8C8CA]">
                        {line.quantity}
                      </td>
                      <td className="px-3 py-2 font-sans text-[11px] text-[#C8C8CA]">
                        {money(line.rate)}
                      </td>
                      <td className="px-3 py-2 font-sans text-[11px] text-[#FDFDFF]">
                        {money(line.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </CrmDetailStateGate>
  );
}
