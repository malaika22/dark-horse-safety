"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardToolbarButton,
  cn,
  type DashboardBadgeVariant,
} from "@dark-horse-safety/ui";
import {
  crmApi,
  type CrmJobPacket,
  type CrmJobPacketExport,
} from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { OpsDetailStateGate } from "@/features/operations/operations-states";
import {
  CloseRuleModal,
  ExportJobPacketModal,
  JobPacketPrintPreview,
  RequestDocumentModal,
} from "@/features/operations/work-order-modals";

function formVariant(status: string): DashboardBadgeVariant {
  const s = status.toUpperCase();
  if (s.includes("SUBMIT") || s === "APPROVED") return "success";
  if (s.includes("WARN") || s.includes("PENDING")) return "warning";
  if (s.includes("MISS") || s.includes("NOT")) return "error";
  return "operations";
}

function relative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs < 1) return "Just now";
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function WorkOrderDetailPage({ workOrderId }: { workOrderId: string }) {
  const router = useRouter();
  const [packet, setPacket] = React.useState<CrmJobPacket | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [preview, setPreview] = React.useState<CrmJobPacketExport | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [closeOpen, setCloseOpen] = React.useState(false);
  const [docOpen, setDocOpen] = React.useState(false);
  const [docName, setDocName] = React.useState("BBS Stop Card");

  useSetHeaderBreadcrumb(
    packet?.code ? `Operations / Work Order / ${packet.code}` : "Operations / Work Order",
  );
  useSetHeaderActions(
    <div className="flex flex-wrap gap-2">
      <DashboardToolbarButton onClick={() => setExportOpen(true)}>
        Export Packet
      </DashboardToolbarButton>
      <DashboardToolbarButton onClick={() => setCloseOpen(true)}>
        Hold / Cancel
      </DashboardToolbarButton>
      <DashboardToolbarButton
        variant="primary"
        onClick={() => void approve()}
      >
        Approve
      </DashboardToolbarButton>
    </div>,
    [packet?.id],
  );

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await crmApi.getWorkOrderPacket(workOrderId);
      setPacket(res.data);
    } catch (err) {
      toastApiError(err);
      setPacket(null);
      setError(
        err instanceof Error ? err.message : "Failed to load job packet",
      );
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function approve() {
    try {
      await crmApi.updateWorkOrder(workOrderId, {
        status: "COMPLETE",
        crewAssigned: true,
        equipmentAssigned: true,
        formsCompleted: true,
        eligibilityVerified: true,
      });
      toastSuccess("Work order approved");
      void reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function syncNetsuite() {
    toastSuccess("NetSuite sync queued");
  }

  return (
    <OpsDetailStateGate
      loading={loading}
      error={error}
      cancelled={
        packet?.status === "ARCHIVED" || packet?.status === "CANCELLED"
      }
      onRetry={() => void reload()}
    >
      {packet ? (
        <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-sans text-[22px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  Job Packet
                </h1>
                <DashboardBadge
                  variant={
                    packet.status === "IN_PROGRESS"
                      ? "offline"
                      : packet.status === "COMPLETE"
                        ? "success"
                        : "warning"
                  }
                  pill
                >
                  {packet.status.replace(/_/g, " ")}
                </DashboardBadge>
              </div>
              <p className="mt-2 font-sans text-[12px] uppercase text-[#8B9BB4]">
                {packet.code}
              </p>
              <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
                {packet.customer.name}
                {packet.locationLabel ? ` · ${packet.locationLabel}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {packet.tags.map((t) => (
                  <DashboardBadge
                    key={t}
                    variant={t.includes("PENDING") ? "error" : "review"}
                    pill
                  >
                    {t}
                  </DashboardBadge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <DashboardToolbarButton onClick={() => void syncNetsuite()}>
                Sync NetSuite
              </DashboardToolbarButton>
              <DashboardToolbarButton onClick={() => void reload()}>
                Sync Work Order
              </DashboardToolbarButton>
              {packet.salesTickets[0] ? (
                <DashboardToolbarButton
                  onClick={() => router.push("/operations/sales-tickets")}
                >
                  View Linked Ticket
                </DashboardToolbarButton>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#2D2D30] bg-panel p-3">
            <div className="flex min-w-[640px] items-center gap-1">
              {packet.lifecycle.map((step, i) => {
                const active = i === packet.lifecycleIndex;
                const done = i < packet.lifecycleIndex;
                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center gap-1 px-1">
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          active
                            ? "bg-[#FDFDFF]"
                            : done
                              ? "bg-[#3D8B6E]"
                              : "bg-[#3E3E3E]",
                        )}
                      />
                      <span
                        className={cn(
                          "whitespace-nowrap font-sans text-[9px] uppercase",
                          active ? "text-[#FDFDFF]" : "text-[#6F6F72]",
                        )}
                      >
                        {step.replace(/_/g, " ")}
                      </span>
                    </div>
                    {i < packet.lifecycle.length - 1 ? (
                      <div
                        className={cn(
                          "mb-4 h-px flex-1",
                          done ? "bg-[#3D8B6E]" : "bg-[#2A2A2A]",
                        )}
                      />
                    ) : null}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <DashboardPanel className="p-4">
                <DashboardPanelTitle icon="lightning" title="Job Information" />
                <dl className="mt-3 space-y-2 font-sans text-[11px] uppercase">
                  <Row label="Job Type" value={packet.jobInfo.jobType} />
                  <Row label="Subcategory" value={packet.jobInfo.subcategory} />
                  <Row
                    label="Schedule"
                    value={`${packet.scheduledStart ?? "—"} – ${packet.scheduledEnd ?? "—"}`}
                  />
                  <Row
                    label="Contact"
                    value={`${packet.jobInfo.contact}${packet.jobInfo.phone ? ` · ${packet.jobInfo.phone}` : ""}`}
                  />
                </dl>
              </DashboardPanel>

              <DashboardPanel className="p-4">
                <DashboardPanelTitle
                  icon="document"
                  title="Compliance Documents"
                />
                <ul className="mt-3 space-y-2">
                  {packet.complianceForms.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <button
                        type="button"
                        className="font-sans text-[11px] uppercase text-[#FDFDFF] underline-offset-2 hover:underline"
                        onClick={() => {
                          if (
                            f.status.includes("NOT") ||
                            f.status.includes("MISS")
                          ) {
                            setDocName(f.name);
                            setDocOpen(true);
                          }
                        }}
                      >
                        {f.name}
                      </button>
                      <DashboardBadge variant={formVariant(f.status)} pill>
                        {f.status}
                      </DashboardBadge>
                    </li>
                  ))}
                </ul>
              </DashboardPanel>

              <DashboardPanel className="p-4">
                <DashboardPanelTitle icon="chart" title="Billing Status" />
                <p className="mt-3 font-sans text-[22px] font-[590] uppercase text-[#FDFDFF]">
                  {packet.billing.totalHours.toFixed(1)} H
                </p>
                <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
                  Total hours · billed {packet.billing.billedHours.toFixed(1)} h
                  on invoice
                </p>
                {packet.billing.exception ? (
                  <p className="mt-3 inline-flex rounded-md bg-[#3A1515] px-2 py-1 font-sans text-[10px] uppercase text-[#FF6B6B]">
                    {packet.billing.exception}
                  </p>
                ) : null}
              </DashboardPanel>

              <DashboardPanel className="p-4">
                <DashboardPanelTitle icon="cycle" title="Time Summary" />
                <p className="mt-3 font-sans text-[11px] uppercase text-[#C8C8C8]">
                  Total {packet.timeSummary.total.toFixed(1)} h · Billable{" "}
                  {packet.timeSummary.billable.toFixed(1)} h · Non-billable{" "}
                  {packet.timeSummary.nonBillable.toFixed(1)} h
                </p>
                <p className="mt-2 font-sans text-[11px] uppercase text-[#959597]">
                  {packet.timeSummary.technicians}
                </p>
              </DashboardPanel>

              <DashboardPanel className="p-4">
                <DashboardPanelTitle icon="activity" title="Photos & Signatures" />
                <p className="mt-3 font-sans text-[11px] uppercase text-[#C8C8C8]">
                  {packet.photos.label}
                </p>
                <p className="mt-2 font-sans text-[11px] uppercase text-[#959597]">
                  Tech {packet.signatures.technician} · Customer{" "}
                  {packet.signatures.customer}
                  {packet.signatures.captured ? " · both captured" : ""}
                </p>
              </DashboardPanel>

              {packet.hoursByPayCycle?.cycles?.length ? (
                <DashboardPanel className="p-4">
                  <DashboardPanelTitle
                    icon="cycle"
                    title="Pay Cycle Breakdown"
                  />
                  <div className="mt-3 space-y-3">
                    {packet.hoursByPayCycle.cycles.map((c) => (
                      <div key={c.id}>
                        <div className="flex justify-between gap-2">
                          <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">
                            {c.label}
                          </span>
                          <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                            {c.totalHours.toFixed(1)} HRS
                          </span>
                        </div>
                        <ul className="mt-1 space-y-0.5">
                          {c.days.map((d) => (
                            <li
                              key={`${c.id}-${d.date}`}
                              className="font-sans text-[10px] uppercase text-[#6F6F72]"
                            >
                              {d.date} — {d.hours.toFixed(1)} hrs
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </DashboardPanel>
              ) : null}
            </div>

            <div className="space-y-4">
              <DashboardPanel className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <DashboardPanelTitle
                    icon="lightning"
                    title="Assigned Technicians"
                  />
                  <DashboardToolbarButton
                    onClick={() => router.push("/operations/dispatch")}
                  >
                    Assign Technicians
                  </DashboardToolbarButton>
                </div>
                <ul className="mt-3 space-y-2">
                  {packet.technicians.length === 0 ? (
                    <li className="font-sans text-[11px] uppercase text-[#959597]">
                      No technicians assigned
                    </li>
                  ) : (
                    packet.technicians.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                            {t.name}
                          </p>
                          <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                            {t.role}
                            {t.rate != null ? ` · $${t.rate}/hr` : ""}
                          </p>
                        </div>
                        <DashboardBadge variant="success" pill>
                          {t.status.replace(/_/g, " ")}
                        </DashboardBadge>
                      </li>
                    ))
                  )}
                </ul>
              </DashboardPanel>

              <DashboardPanel className="p-4">
                <DashboardPanelTitle icon="document" title="Linked Sales Tickets" />
                <ul className="mt-3 space-y-2">
                  {packet.salesTickets.length === 0 ? (
                    <li className="font-sans text-[11px] uppercase text-[#959597]">
                      No sales tickets linked
                    </li>
                  ) : (
                    packet.salesTickets.map((st) => (
                      <li
                        key={st.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="font-sans text-[11px] uppercase text-[#8B9BB4]">
                          {st.code} · {st.hours.toFixed(1)}h · $
                          {st.value.toLocaleString()}
                        </span>
                        <DashboardBadge variant="operations" pill>
                          {st.status.replace(/_/g, " ")}
                        </DashboardBadge>
                      </li>
                    ))
                  )}
                </ul>
              </DashboardPanel>

              <DashboardPanel className="p-4">
                <DashboardPanelTitle icon="activity" title="Activity · Audit Log" />
                <ul className="mt-3 space-y-2">
                  {packet.audit.map((a) => (
                    <li key={a.id}>
                      <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                        {a.label}
                      </p>
                      <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                        {relative(a.at)}
                      </p>
                    </li>
                  ))}
                </ul>
              </DashboardPanel>

              <DashboardPanel className="p-4">
                <DashboardPanelTitle icon="sync" title="NetSuite Status" />
                <p className="mt-3 font-sans text-[12px] uppercase text-[#C4A35A]">
                  {packet.netsuiteStatus}
                </p>
              </DashboardPanel>

              <DashboardPanel className="p-4">
                <DashboardPanelTitle icon="clipboard" title="Close Rule" />
                <p className="mt-3 font-sans text-[11px] uppercase leading-relaxed text-[#959597]">
                  {packet.closeRule}
                </p>
                <div className="mt-3">
                  <DashboardToolbarButton onClick={() => setCloseOpen(true)}>
                    Hold / Cancel…
                  </DashboardToolbarButton>
                </div>
              </DashboardPanel>
            </div>
          </div>
        </div>
      ) : null}

      <ExportJobPacketModal
        open={exportOpen}
        workOrderId={workOrderId}
        formCount={packet?.complianceForms.length ?? 6}
        photoCount={packet?.photos.count ?? 6}
        onClose={() => setExportOpen(false)}
        onPreview={(payload) => {
          setPreview(payload);
          setPreviewOpen(true);
        }}
      />
      <JobPacketPrintPreview
        open={previewOpen}
        payload={preview}
        onClose={() => setPreviewOpen(false)}
      />
      <CloseRuleModal
        open={closeOpen}
        workOrderId={workOrderId}
        onClose={() => setCloseOpen(false)}
        onDone={() => void reload()}
      />
      <RequestDocumentModal
        open={docOpen}
        workOrderId={workOrderId}
        documentName={docName}
        onClose={() => setDocOpen(false)}
        onSent={() => void reload()}
      />
    </OpsDetailStateGate>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[#6F6F72]">{label}</dt>
      <dd className="text-right text-[#FDFDFF]">{value}</dd>
    </div>
  );
}
