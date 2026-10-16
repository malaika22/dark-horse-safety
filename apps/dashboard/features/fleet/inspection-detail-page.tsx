"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardModal,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  fleetApi,
  type FleetInspectionDetail,
} from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { useSetHeaderActions } from "@/features/app-shell/header-actions-context";
import { fleetBadgeTone } from "./fleet-ui";

function KebabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function InspectionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<FleetInspectionDetail | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [reinspectOpen, setReinspectOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [createdId, setCreatedId] = React.useState<string | null>(null);

  const [recheck, setRecheck] = React.useState<string[]>([]);
  const [includeAll, setIncludeAll] = React.useState(false);
  const [inspector, setInspector] = React.useState("");
  const [dueAt, setDueAt] = React.useState("");
  const [source, setSource] = React.useState("MOBILE_APP");
  const [notes, setNotes] = React.useState("");

  const reload = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fleetApi.getInspection(id);
      setData(res.data);
      const fails = (res.data.checklistItems ?? [])
        .filter((c) => c.result === "FAIL")
        .map((c) => c.label);
      setRecheck(fails);
      setInspector(res.data.inspectorName);
      setIncludeAll(false);
      setNotes("");
      setSource(res.data.source ?? "MOBILE_APP");
      const d = new Date(Date.now() + 7 * 86400000);
      setDueAt(d.toISOString().slice(0, 16));
    } catch (err) {
      toastApiError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  useSetHeaderActions(null, []);

  async function createRepair() {
    if (!data) return;
    setBusy(true);
    try {
      const res = await fleetApi.createRepairFromInspection(data.id);
      toastSuccess(res.data.message);
      setMenuOpen(false);
      void reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function submitReinspect() {
    if (!data) return;
    setBusy(true);
    setErrorBanner(null);
    try {
      const res = await fleetApi.reinspect(data.id, {
        recheckLabels: includeAll ? undefined : recheck,
        includeAll,
        inspectorName: inspector,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        source,
        notes: notes.trim() || undefined,
      });
      setCreatedId(res.data.id);
      setSuccessMsg(res.data.message);
      setConfirmOpen(false);
      setReinspectOpen(false);
      toastSuccess(res.data.message);
      void reload();
    } catch (err) {
      setErrorBanner("COULDN'T CREATE THE RE-INSPECTION. YOUR ENTRIES ARE SAVED.");
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader label="Loading inspection" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-shell p-5">
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          Inspection not found.
        </p>
        <DashboardToolbarButton
          className="mt-3"
          onClick={() => router.push("/fleet/inspections")}
        >
          Back to Inspections
        </DashboardToolbarButton>
      </div>
    );
  }

  const checklist = data.checklistItems ?? [];
  const passed = data.itemsPassed ?? checklist.filter((c) => c.result === "PASS").length;
  const failed = data.itemsFailed ?? checklist.filter((c) => c.result === "FAIL").length;
  const totalItems = data.checklistTotal ?? (checklist.length || 5);
  const failItems = checklist.filter((c) => c.result === "FAIL");

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-sans text-[18px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">
              {data.code} · {data.assetLabel}
            </h1>
            <DashboardBadge variant={fleetBadgeTone(data.resultTone)}>
              {data.resultLabel}
            </DashboardBadge>
          </div>
          <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
            {data.parentTruck ?? "—"} · {data.inspectorName} ·{" "}
            {data.dateLabel ?? "—"}
          </p>
          {data.nav ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 font-sans text-[10px] uppercase text-[#959597]">
              <button
                type="button"
                disabled={!data.nav.prevId}
                className="disabled:opacity-40"
                onClick={() =>
                  data.nav.prevId &&
                  router.push(`/fleet/inspections/${data.nav.prevId}`)
                }
              >
                ←
              </button>
              <span>
                {data.nav.index} OF {data.nav.total}
              </span>
              <button
                type="button"
                disabled={!data.nav.nextId}
                className="disabled:opacity-40"
                onClick={() =>
                  data.nav.nextId &&
                  router.push(`/fleet/inspections/${data.nav.nextId}`)
                }
              >
                →
              </button>
              <span className="text-[#6B6B6D]">{data.nav.orderLabel}</span>
            </div>
          ) : null}
        </div>

        <div className="relative flex flex-wrap items-center gap-2">
          <div className="relative">
            <DashboardToolbarButton
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="More actions"
            >
              <KebabIcon />
            </DashboardToolbarButton>
            {menuOpen ? (
              <div className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-[#2A2A2A] bg-[#121212] py-2 shadow-xl">
                {[
                  {
                    label: "Create Repair Request",
                    onClick: () => void createRepair(),
                  },
                  {
                    label: "Create Corrective Action",
                    onClick: () => {
                      setMenuOpen(false);
                      router.push(
                        `/fleet/inspections/${data.id}?action=corrective`,
                      );
                      toastSuccess("Open list page corrective flow from row menu");
                    },
                  },
                  {
                    label: "Download PDF",
                    onClick: () => {
                      setMenuOpen(false);
                      toastSuccess("PDF export queued");
                    },
                  },
                  {
                    label: "View Asset",
                    onClick: () => {
                      setMenuOpen(false);
                      router.push("/fleet/assets");
                    },
                  },
                  ...(data.linkedRepair
                    ? [
                        {
                          label: "View Linked Repair",
                          onClick: () => {
                            setMenuOpen(false);
                            router.push("/fleet/repair-requests");
                          },
                        },
                      ]
                    : []),
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="block w-full px-4 py-2.5 text-left font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-[#1A1A1A]"
                    onClick={item.onClick}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="my-2 border-t border-[#2A2A2A]" />
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#E8C547] hover:bg-[#1A1A1A]"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(`/fleet/inspections/${data.id}/edit`);
                  }}
                >
                  Edit Inspection
                  <span className="mt-1 block text-[9px] text-[#959597]">
                    Admin only · Reason required · Logged
                  </span>
                </button>
              </div>
            ) : null}
          </div>
          <DashboardToolbarButton onClick={() => toastSuccess("Print queued")}>
            Print Report
          </DashboardToolbarButton>
          <DashboardToolbarButton onClick={() => toastSuccess("Note added")}>
            Add Note
          </DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            disabled={data.result !== "FAILED"}
            onClick={() => {
              setErrorBanner(null);
              setReinspectOpen(true);
            }}
          >
            Re-Inspect
          </DashboardToolbarButton>
        </div>
      </div>

      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          <DashboardStatCell
            title="Result"
            value={data.resultLabel}
            meta={`${data.type ?? "INSPECTION"} · ${data.dateLabel ?? "—"}`}
          />
          <DashboardStatCell
            title="Items Passed"
            value={`${passed}/${totalItems}`}
            meta={`OF ${totalItems} CHECKLIST ITEMS`}
          />
          <DashboardStatCell
            title="Items Failed"
            value={String(failed)}
            meta={`OF ${totalItems} · SEE CHECKLIST`}
          />
          <DashboardStatCell
            title="Re-Inspection"
            value={
              data.reInspection?.code ??
              (data.reInspectionDueLabel ? "PENDING" : "—")
            }
            meta={
              data.reInspection
                ? `${data.reInspection.dueLabel ?? ""} · ${data.reInspection.inspectorName}`
                : data.reInspectionDueLabel
                  ? `DUE ${data.reInspectionDueLabel}`
                  : data.linkedRepair
                    ? `AFTER ${data.linkedRepair.code} CLOSES`
                    : "NOT SCHEDULED"
            }
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <DashboardPanel className="p-4 sm:p-5 lg:col-span-2">
          <DashboardPanelTitle icon="clipboard" title="Checklist Results" />
          <ul className="mt-4 list-none space-y-0">
            {checklist.map((item) => {
              const fail = item.result === "FAIL";
              return (
                <li
                  key={item.label}
                  className="border-b border-[#2A2A2A] py-3 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">
                        {item.label}
                      </p>
                      <p
                        className={cn(
                          "mt-1 font-sans text-[11px] uppercase leading-relaxed",
                          fail ? "text-[#FF6B6B]" : "text-[#959597]",
                        )}
                      >
                        {item.detail}
                      </p>
                    </div>
                    <DashboardBadge variant={fail ? "error" : "success"}>
                      {item.result}
                    </DashboardBadge>
                  </div>
                </li>
              );
            })}
          </ul>
        </DashboardPanel>

        <div className="space-y-4">
          <DashboardPanel className="p-4 sm:p-5">
            <DashboardPanelTitle icon="document" title="Inspection Info" />
            <dl className="mt-4 space-y-3 font-sans text-[11px] uppercase">
              <div>
                <dt className="text-[#959597]">Asset</dt>
                <dd className="mt-0.5 text-[#FDFDFF]">
                  {data.assetLabel} - {data.assetCode}
                </dd>
              </div>
              <div>
                <dt className="text-[#959597]">Serial</dt>
                <dd className="mt-0.5 text-[#FDFDFF]">{data.serial ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[#959597]">Source</dt>
                <dd className="mt-0.5 text-[#FDFDFF]">
                  {data.sourceLabel ?? data.source ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[#959597]">Inspection Type</dt>
                <dd className="mt-0.5 text-[#FDFDFF]">{data.type ?? "—"}</dd>
              </div>
            </dl>
          </DashboardPanel>

          <DashboardPanel className="p-4 sm:p-5">
            <DashboardPanelTitle icon="activity" title="Findings & Linked Records" />
            <p className="mt-4 font-sans text-[11px] uppercase leading-relaxed text-[#FF6B6B]">
              {data.findingsSummary ??
                (failItems.map((f) => f.detail).join(" ") ||
                  "No findings recorded.")}
            </p>
            {data.actionsTaken?.length ? (
              <ul className="mt-3 list-none space-y-1 font-sans text-[10px] uppercase text-[#959597]">
                {data.actionsTaken.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-4 space-y-2 font-sans text-[11px] uppercase">
              {data.linkedRepair ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left text-[#8B9BB4]"
                  onClick={() => router.push("/fleet/repair-requests")}
                >
                  <span>
                    {data.linkedRepair.code}: {data.linkedRepair.issue}
                  </span>
                  <span>→</span>
                </button>
              ) : null}
              {data.reInspection ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left text-[#8B9BB4]"
                  onClick={() =>
                    router.push(`/fleet/inspections/${data.reInspection!.id}`)
                  }
                >
                  <span>
                    {data.reInspection.code} · {data.reInspection.dueLabel}
                  </span>
                  <span>→</span>
                </button>
              ) : null}
              <div className="flex items-center justify-between text-[#E8C547]">
                <span>
                  Corrective Action:{" "}
                  {data.correctiveActionRaised
                    ? data.correctiveActions[0]?.code
                    : "NOT RAISED"}
                </span>
              </div>
            </div>
          </DashboardPanel>
        </div>
      </div>

      {successMsg ? (
        <div className="fixed bottom-6 right-6 z-50 max-w-md rounded-xl border border-[#22C55E]/40 bg-[#14201A] p-4 shadow-xl">
          <p className="font-sans text-[11px] uppercase text-[#ACEBCE]">
            {successMsg}
          </p>
          <div className="mt-3 flex gap-2">
            {createdId ? (
              <DashboardToolbarButton
                variant="primary"
                onClick={() => router.push(`/fleet/inspections/${createdId}`)}
              >
                View {data.reInspection?.code ?? "New"}
              </DashboardToolbarButton>
            ) : null}
            <DashboardToolbarButton onClick={() => setSuccessMsg(null)}>
              Stay Here
            </DashboardToolbarButton>
          </div>
        </div>
      ) : null}

      <DashboardModal
        open={reinspectOpen}
        onClose={() => setReinspectOpen(false)}
        title="Re-Inspect"
        footer={
          <>
            <DashboardToolbarButton onClick={() => setReinspectOpen(false)}>
              Cancel
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              disabled={busy || (!includeAll && recheck.length === 0)}
              onClick={() => {
                setConfirmOpen(true);
                setReinspectOpen(false);
              }}
            >
              Create Re-Inspection
            </DashboardToolbarButton>
          </>
        }
      >
        <div className="space-y-4">
          <p className="font-sans text-[11px] uppercase text-[#959597]">
            Creating a new inspection for: {data.assetLabel} · {data.assetCode}{" "}
            · SN {data.serial ?? "—"} · {data.parentTruck ?? "—"}
          </p>
          <p className="font-sans text-[11px] uppercase text-[#C8C8C8]">
            Based on {data.code}{" "}
            <DashboardBadge variant="error">{data.resultLabel}</DashboardBadge>{" "}
            {data.dateLabel}
          </p>

          <div>
            <p className="mb-2 font-sans text-[10px] uppercase text-[#959597]">
              Failed Items Being Re-Checked
            </p>
            <div className="space-y-2">
              {failItems.map((item) => (
                <label key={item.label} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={includeAll || recheck.includes(item.label)}
                    disabled={includeAll}
                    onChange={(e) => {
                      setRecheck((prev) =>
                        e.target.checked
                          ? [...prev, item.label]
                          : prev.filter((x) => x !== item.label),
                      );
                    }}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    <span className="block font-sans text-[11px] uppercase text-[#FDFDFF]">
                      {item.label}
                    </span>
                    <span className="block font-sans text-[10px] uppercase text-[#959597]">
                      From failed item
                    </span>
                  </span>
                </label>
              ))}
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={includeAll}
                  onChange={(e) => setIncludeAll(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  <span className="block font-sans text-[11px] uppercase text-[#FDFDFF]">
                    Include All {totalItems} Items
                  </span>
                  <span className="block font-sans text-[10px] uppercase text-[#959597]">
                    Optional
                  </span>
                </span>
              </label>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
              Inspector *
            </span>
            <input
              value={inspector}
              onChange={(e) => setInspector(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            />
            <span className="mt-1 block font-sans text-[10px] uppercase text-[#6B6B6D]">
              Same as {data.code}
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
              Date & Time *
            </span>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] text-[#FDFDFF] outline-none"
            />
          </label>

          <div>
            <p className="mb-1.5 font-sans text-[10px] uppercase text-[#959597]">
              Source
            </p>
            <div className="inline-flex rounded-lg border border-[#2D2D30] p-0.5">
              {["MOBILE_APP", "WEB"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-sans text-[10px] uppercase",
                    source === s
                      ? "bg-[#FDFDFF] text-[#111]"
                      : "text-[#959597]",
                  )}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional note for the inspector"
              className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
            />
          </label>

          {errorBanner ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[#FF4D4D]/50 bg-[#3A1515] px-3 py-2">
              <p className="font-sans text-[10px] uppercase text-[#FFBBCA]">
                {errorBanner}
              </p>
              <DashboardToolbarButton
                disabled={busy}
                onClick={() => void submitReinspect()}
              >
                Retry
              </DashboardToolbarButton>
            </div>
          ) : null}
        </div>
      </DashboardModal>

      <DashboardModal
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setReinspectOpen(true);
        }}
        title="Confirm Re-Inspection"
        footer={
          <>
            <DashboardToolbarButton
              onClick={() => {
                setConfirmOpen(false);
                setReinspectOpen(true);
              }}
            >
              Back
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              disabled={busy}
              onClick={() => void submitReinspect()}
            >
              Confirm & Create
            </DashboardToolbarButton>
          </>
        }
      >
        <div className="space-y-2 rounded-lg border border-[#2A2A2A] bg-[#141820] p-4 font-sans text-[11px] uppercase text-[#C8C8C8]">
          <p>
            <span className="text-[#959597]">Asset:</span> {data.assetLabel} ·{" "}
            {data.assetCode} · {data.parentTruck}
          </p>
          <p>
            <span className="text-[#959597]">Type:</span> RE-INSPECTION
          </p>
          <p>
            <span className="text-[#959597]">Based on:</span> {data.code} ·{" "}
            {data.resultLabel} {data.dateLabel}
          </p>
          <p>
            <span className="text-[#959597]">Re-checks:</span>{" "}
            {(includeAll ? checklist.map((c) => c.label) : recheck).join(" · ")}
          </p>
          <p>
            <span className="text-[#959597]">Inspector:</span> {inspector}
          </p>
          <p>
            <span className="text-[#959597]">Source:</span>{" "}
            {source.replace("_", " ")}
          </p>
          <p className="pt-2 text-[10px] text-[#6B6B6D]">
            Draft opens on the mobile app for {inspector}, or complete it here
            on web.
          </p>
        </div>
      </DashboardModal>
    </div>
  );
}
