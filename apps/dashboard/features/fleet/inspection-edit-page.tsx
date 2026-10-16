"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardPanel,
  DashboardPanelTitle,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import { fleetApi, type FleetInspectionDetail } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { fleetBadgeTone } from "./fleet-ui";

export function InspectionEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [data, setData] = React.useState<FleetInspectionDetail | null>(null);
  const [reason, setReason] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [findingsSummary, setFindingsSummary] = React.useState("");
  const [overrideResult, setOverrideResult] = React.useState("");
  const [edits, setEdits] = React.useState<
    Record<string, { result: string; note: string }>
  >({});

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fleetApi.getInspection(id);
        if (cancelled) return;
        setData(res.data);
        setFindingsSummary(res.data.findingsSummary ?? "");
        const map: Record<string, { result: string; note: string }> = {};
        for (const item of res.data.checklistItems ?? []) {
          map[item.label] = { result: item.result, note: item.note ?? "" };
        }
        setEdits(map);
      } catch (err) {
        if (!cancelled) toastApiError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function save() {
    if (!data) return;
    if (!reason.trim() || !details.trim()) {
      toastApiError(new Error("Reason and details are required"));
      return;
    }
    setBusy(true);
    try {
      const checklistItems = Object.entries(edits).map(([label, v]) => ({
        label,
        result: v.result,
        note: v.note || undefined,
      }));
      const res = await fleetApi.editInspection(data.id, {
        reason: reason.trim(),
        details: details.trim(),
        findingsSummary: findingsSummary.trim() || undefined,
        result: overrideResult || undefined,
        checklistItems,
        editedBy: "R. CRAWFORD",
      });
      toastSuccess(res.data.message);
      router.push(`/fleet/inspections/${data.id}`);
    } catch (err) {
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
        <p className="mb-3 font-sans text-[12px] uppercase text-[#959597]">
          Inspection not found.
        </p>
        <DashboardToolbarButton onClick={() => router.push("/fleet/inspections")}>
          Back
        </DashboardToolbarButton>
      </div>
    );
  }

  const canSave = Boolean(reason.trim() && details.trim());

  return (
    <div className="space-y-4 bg-shell p-3 sm:space-y-5 sm:p-6">
      <div className="rounded-xl border border-[#E68A00]/40 bg-[#352E1B] px-4 py-3 font-sans text-[11px] uppercase leading-relaxed text-[#CAC897]">
        You are editing a submitted inspection. A reason is required. Every
        change will be logged against your name, with the time and original
        value.
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <div className="space-y-4 lg:col-span-2">
          <DashboardPanel className="p-4 sm:p-5">
            <DashboardPanelTitle icon="document" title="Asset Info (Read-Only)" />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["Asset ID / Serial", `${data.assetCode} · ${data.serial ?? "—"}`],
                ["Parent Truck", data.parentTruck ?? "—"],
                ["Inspector", data.inspectorName],
                ["Date", data.dateLabel ?? "—"],
                ["Source", data.sourceLabel ?? data.source ?? "—"],
                ["Inspection Type", data.type ?? "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="font-sans text-[10px] uppercase text-[#959597]">
                    {label}
                  </p>
                  <p className="mt-1 font-sans text-[11px] uppercase text-[#6B6B6D]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel className="p-4 sm:p-5">
            <DashboardPanelTitle icon="clipboard" title="Checklist Results" />
            <ul className="mt-4 list-none space-y-4">
              {(data.checklistItems ?? []).map((item) => {
                const edit = edits[item.label] ?? {
                  result: item.result,
                  note: "",
                };
                return (
                  <li
                    key={item.label}
                    className="rounded-lg border border-[#2A2A2A] p-3"
                  >
                    <p className="font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">
                      {item.label}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="font-sans text-[10px] uppercase text-[#959597]">
                        Original
                      </span>
                      <DashboardBadge
                        variant={fleetBadgeTone(
                          item.result === "FAIL" ? "error" : "success",
                        )}
                      >
                        {item.result}
                      </DashboardBadge>
                    </div>
                    <p className="mt-1 font-sans text-[10px] uppercase text-[#6B6B6D]">
                      {item.detail}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block font-sans text-[10px] uppercase text-[#959597]">
                          Edit Result
                        </span>
                        <select
                          value={edit.result}
                          onChange={(e) =>
                            setEdits((prev) => ({
                              ...prev,
                              [item.label]: {
                                ...edit,
                                result: e.target.value,
                              },
                            }))
                          }
                          className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF]"
                        >
                          <option value="PASS">PASS</option>
                          <option value="FAIL">FAIL</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-sans text-[10px] uppercase text-[#959597]">
                          Edit Note
                        </span>
                        <input
                          value={edit.note}
                          onChange={(e) =>
                            setEdits((prev) => ({
                              ...prev,
                              [item.label]: {
                                ...edit,
                                note: e.target.value,
                              },
                            }))
                          }
                          className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF]"
                        />
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
          </DashboardPanel>

          <DashboardPanel className="p-4 sm:p-5">
            <DashboardPanelTitle icon="activity" title="Findings" />
            <p className="mt-3 font-sans text-[10px] uppercase text-[#959597]">
              Original Findings
            </p>
            <p className="mt-1 font-sans text-[11px] uppercase text-[#6B6B6D]">
              {data.findingsSummary ?? "—"}
            </p>
            <label className="mt-4 block">
              <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
                Edit Findings
              </span>
              <textarea
                value={findingsSummary}
                onChange={(e) => setFindingsSummary(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]"
              />
            </label>
          </DashboardPanel>

          <DashboardPanel className="p-4 sm:p-5">
            <DashboardPanelTitle icon="cycle" title="Overall Result" />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="font-sans text-[11px] uppercase text-[#959597]">
                Original
              </span>
              <DashboardBadge variant={fleetBadgeTone(data.resultTone)}>
                {data.resultLabel}
              </DashboardBadge>
              <select
                value={overrideResult}
                onChange={(e) => setOverrideResult(e.target.value)}
                className="h-10 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF]"
              >
                <option value="">Computed from checklist</option>
                <option value="PASS">PASS</option>
                <option value="FAILED">FAILED</option>
                <option value="PASS_WITH_FINDINGS">PASS WITH FINDINGS</option>
              </select>
            </div>
            <p className="mt-2 font-sans text-[10px] uppercase text-[#6B6B6D]">
              Overrides require the reason below for the audit log.
            </p>
          </DashboardPanel>

          <DashboardPanel className="p-4 sm:p-5">
            <DashboardPanelTitle icon="lightning" title="Reason for Edit" />
            <label className="mt-3 block">
              <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
                Reason *
              </span>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF]"
              >
                <option value="">Select reason</option>
                {(data.editReasons ?? []).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">
                Details *
              </span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                placeholder="Explain what changed and why"
                className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]"
              />
            </label>
          </DashboardPanel>
        </div>

        <div className="space-y-4">
          <DashboardPanel className="p-4 sm:p-5">
            <DashboardPanelTitle icon="document" title="Original Submission" />
            <p className="mt-3 font-sans text-[12px] uppercase text-[#FDFDFF]">
              {data.code} · V{data.version ?? 1}
            </p>
            <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">
              {data.dateLabel} · {data.inspectorName}
            </p>
            <ul className="mt-3 list-none space-y-1">
              {(data.checklistItems ?? [])
                .filter((c) => c.result === "FAIL")
                .map((c) => (
                  <li
                    key={c.label}
                    className="font-sans text-[10px] uppercase text-[#FF6B6B]"
                  >
                    {c.label}: FAIL
                  </li>
                ))}
            </ul>
          </DashboardPanel>

          <DashboardPanel className="p-4 sm:p-5">
            <DashboardPanelTitle icon="sync" title="After Save" />
            <p className="mt-3 font-sans text-[12px] uppercase text-[#FDFDFF]">
              {data.code} · V{(data.version ?? 1) + 1}
            </p>
            <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">
              Edited by R. Crawford
              {reason ? ` · ${reason}` : ""}
            </p>
          </DashboardPanel>

          <DashboardPanel className="p-4 sm:p-5">
            <DashboardPanelTitle icon="chart" title="Always Locked" />
            <ul className="mt-3 list-none space-y-1 font-sans text-[10px] uppercase text-[#959597]">
              {(data.lockedFields ?? []).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </DashboardPanel>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#2A2A2A] pt-4">
        <DashboardToolbarButton
          onClick={() => router.push(`/fleet/inspections/${data.id}`)}
        >
          Cancel
        </DashboardToolbarButton>
        <DashboardToolbarButton
          onClick={() => {
            setReason("");
            setDetails("");
            setFindingsSummary(data.findingsSummary ?? "");
            const map: Record<string, { result: string; note: string }> = {};
            for (const item of data.checklistItems ?? []) {
              map[item.label] = { result: item.result, note: item.note ?? "" };
            }
            setEdits(map);
            setOverrideResult("");
          }}
        >
          Discard Changes
        </DashboardToolbarButton>
        <DashboardToolbarButton
          variant="primary"
          disabled={!canSave || busy}
          className={cn(!canSave && "opacity-50")}
          onClick={() => void save()}
        >
          Save Edits
        </DashboardToolbarButton>
      </div>
    </div>
  );
}
