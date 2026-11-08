"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardModal,
  DashboardRowActionMenu,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { fleetApi, type FleetAsset, type FleetRepair, type FleetTruckDetail } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { fleetBadgeTone } from "./fleet-ui";

const TABS = [
  "OVERVIEW",
  "CHILD ASSETS",
  "INVENTORY",
  "INSPECTIONS",
  "CALIBRATION",
  "REPAIR REQUESTS",
  "MOVEMENT",
  "DOCUMENTS",
  "AUDIT LOG",
] as const;

type Tab = (typeof TABS)[number];

function barColor(value: number) {
  if (value < 70) return "bg-[#E06A7A]";
  if (value < 85) return "bg-[#C9A227]";
  return "bg-[#3DDC97]";
}

function Gauge({ value }: { value: number }) {
  const angle = Math.max(0, Math.min(180, (value / 100) * 180));
  return (
    <div className="relative h-24 w-40">
      <svg viewBox="0 0 120 70" className="h-full w-full">
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#2A2A2A" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M10 60 A50 50 0 0 1 110 60"
          fill="none"
          stroke={value < 70 ? "#E06A7A" : value < 85 ? "#C9A227" : "#3DDC97"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 157} 157`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center font-sans text-[22px] text-[#FDFDFF]">{value}%</div>
    </div>
  );
}

export function TruckDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [detail, setDetail] = React.useState<FleetTruckDetail | null>(null);
  const [repairs, setRepairs] = React.useState<FleetRepair[]>([]);
  const [tab, setTab] = React.useState<Tab>("OVERVIEW");
  const [childView, setChildView] = React.useState<"CARDS" | "LIST">("LIST");
  const [switcher, setSwitcher] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [employeeId, setEmployeeId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [formula, setFormula] = React.useState(false);
  const [stock, setStock] = React.useState({ item: "", qty: "1", minimum: "1", sku: "", vendor: "" });
  const [invAction, setInvAction] = React.useState<null | { kind: "count" | "min" | "po" | "move" | "docs"; itemId: string }>(null);
  const [invValue, setInvValue] = React.useState("");
  const [invExtra, setInvExtra] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fleetApi.truckDetail(id);
      setDetail(res.data);
      setEmployeeId(res.data.employees[0]?.id ?? "");
      const repairRes = await fleetApi.listRepairs({ parentTruck: res.data.card.name, pageSize: 20 }).catch(() => null);
      setRepairs(repairRes?.data.items ?? []);
    } catch (err) {
      toastApiError(err);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading && !detail) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader label="Loading truck" />
      </div>
    );
  }
  if (!detail) {
    return <p className="p-6 font-sans text-[12px] uppercase text-[#959597]">Truck not found.</p>;
  }

  const card = detail.card;
  const needsReview = detail.children.filter((row) => row.status !== "READY").length;
  const filteredTrucks = detail.trucks.filter((truck) => {
    const text = query.trim().toLowerCase();
    if (!text) return true;
    return truck.name.toLowerCase().includes(text) || truck.unit.toLowerCase().includes(text);
  });

  function exportChildren() {
    const header = ["Asset", "Code", "Type", "Status", "Readiness"];
    const body = detail!.children.map((row) =>
      [row.assetLabel, row.assetCode, row.equipmentType, row.statusLabel, row.readiness ?? ""]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${card.name.replace(/\s+/g, "-").toLowerCase()}-assets.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function assign() {
    setBusy(true);
    try {
      const res = await fleetApi.assignTruck(employeeId, card.name);
      toastSuccess(res.data.message);
      setAssignOpen(false);
      await load();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function missing(row: FleetAsset) {
    try {
      const res = await fleetApi.markTruckAssetMissing(id, {
        assetCode: row.assetCode,
        assetLabel: row.assetLabel,
        holder: detail?.technician ?? undefined,
      });
      toastSuccess(res.data.message);
      await load();
    } catch (err) {
      toastApiError(err);
    }
  }

  function openMove(row: FleetAsset) {
    router.push(`/fleet/assets/${encodeURIComponent(row.assetCode)}/move`);
  }

  async function deactivate() {
    setBusy(true);
    try {
      const res = await fleetApi.unassignTruck(card.name);
      toastSuccess(res.data.message);
      await load();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const bars = [
    ["Required equipment ready", detail.breakdown.equipment],
    ["Calibration", detail.breakdown.calibration],
    ["Inspections", detail.breakdown.inspections],
    ["Repair status", detail.breakdown.repair],
    ["Inventory / consumables", detail.breakdown.inventory],
  ] as const;

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setSwitcher((open) => !open)}
            className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
          >
            {card.name} · {card.unit}
          </button>
          {switcher ? (
            <div className="absolute left-0 z-30 mt-2 w-72 rounded-xl border border-[#2D2D30] bg-[#161616] p-2 shadow-2xl">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search filtered trucks"
                className="mb-2 w-full rounded-lg border border-[#2D2D30] bg-[#101010] px-3 py-2 font-sans text-[12px] text-[#FDFDFF]"
              />
              <p className="px-2 pb-1 font-sans text-[10px] uppercase text-[#959597]">
                {detail.trucks.length} trucks
              </p>
              {filteredTrucks.map((truck) => (
                <button
                  key={truck.id}
                  type="button"
                  onClick={() => {
                    setSwitcher(false);
                    router.push(`/fleet/trucks/${truck.id}`);
                  }}
                  className="flex w-full items-center justify-between rounded px-2 py-2 text-left font-sans text-[12px] uppercase text-[#FDFDFF] hover:bg-[#2A2A2A]"
                >
                  <span>{truck.name} · {truck.unit}</span>
                  {truck.id === card.id ? <span className="text-[10px] text-[#7DCEA0]">Current</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <DashboardToolbarButton disabled={!detail.prevId} onClick={() => detail.prevId && router.push(`/fleet/trucks/${detail.prevId}`)}>
            Previous
          </DashboardToolbarButton>
          <span className="self-center font-sans text-[11px] uppercase text-[#959597]">
            {detail.index >= 0 ? `${detail.index + 1} of ${detail.total}` : card.kind}
          </span>
          <DashboardToolbarButton disabled={!detail.nextId} onClick={() => detail.nextId && router.push(`/fleet/trucks/${detail.nextId}`)}>
            Next
          </DashboardToolbarButton>
        </div>
      </div>

      <section className="grid gap-4 rounded-xl border border-[#2D2D30] bg-[#141414] p-4 lg:grid-cols-[1fr_auto]">
        <div className="flex gap-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-[#2D2D30] font-sans text-[10px] uppercase text-[#959597]">
            No photo
          </div>
          <div>
            <h1 className="font-sans text-[20px] uppercase text-[#FDFDFF]">{card.name} · {card.unit}</h1>
            <p className="mt-1 font-sans text-[12px] uppercase text-[#C8C8C8]">
              {[detail.technician, detail.baseLocation].filter(Boolean).join(" · ") || "No technician assigned"}
            </p>
            <p className="font-sans text-[11px] uppercase text-[#959597]">
              Last inspection {detail.lastInspection ?? "—"} · {detail.openIssues}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Gauge value={detail.breakdown.weighted} />
          <div className="relative">
            <button type="button" className="font-sans text-[10px] uppercase text-[#959597]" onClick={() => setFormula((open) => !open)}>
              Readiness
            </button>
            {formula ? (
              <div className="absolute right-4 z-20 mt-1 w-64 rounded-lg border border-[#2D2D30] bg-[#161616] p-3 text-left shadow-xl">
                <p className="mb-2 font-sans text-[11px] uppercase text-[#FDFDFF]">Readiness formula · {card.name}</p>
                {[
                  ["Equipment ready", "30%"],
                  ["Calibration", "25%"],
                  ["Inspections", "20%"],
                  ["Repair status", "15%"],
                  ["Inventory", "10%"],
                ].map(([label, weight]) => (
                  <div key={label} className="flex justify-between font-sans text-[11px] uppercase text-[#C8C8C8]">
                    <span>{label}</span>
                    <span>× {weight}</span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-[#2D2D30] pt-2 font-sans text-[12px] uppercase text-[#FDFDFF]">
                  <span>Weighted score</span>
                  <span>{detail.breakdown.weighted}%</span>
                </div>
              </div>
            ) : null}
            <DashboardBadge variant={card.status === "READY" ? "success" : "warning"}>{card.statusLabel}</DashboardBadge>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`rounded-lg px-3 py-1.5 font-sans text-[10px] uppercase ${tab === item ? "bg-[#FDFDFF] text-[#121212]" : "bg-[#2A2A2A] text-[#C8C8C8]"}`}
              >
                {item}
                {item === "CHILD ASSETS" ? ` ${detail.children.length}` : ""}
              </button>
            ))}
          </div>
          {tab === "OVERVIEW" ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Panel title="Truck identity">
                  <Fact label="Unit" value={card.unit} />
                  <Fact label="Fleet no." value={detail.fleetNo} />
                  <Fact label="Model" value={detail.model ?? "Not on file"} />
                  <Fact label="Assigned technician" value={detail.technician ?? "—"} />
                  <Fact label="Base location" value={detail.baseLocation ?? "—"} />
                </Panel>
                <Panel title="Active work order">
                  {detail.workOrder ? (
                    <>
                      <p className="font-sans text-[13px] uppercase text-[#FDFDFF]">{detail.workOrder.code}</p>
                      <p className="mt-1 font-sans text-[12px] uppercase text-[#C8C8C8]">{detail.workOrder.customer ?? "—"}</p>
                      <p className="font-sans text-[12px] text-[#959597]">{detail.workOrder.title ?? detail.workOrder.status ?? ""}</p>
                    </>
                  ) : (
                    <p className="font-sans text-[12px] uppercase text-[#959597]">No work order is linked to this truck.</p>
                  )}
                </Panel>
              </div>
              <Panel title="Truck health breakdown">
                <div className="space-y-3">
                  {bars.map(([label, value]) => (
                    <div key={label}>
                      <div className="mb-1 flex justify-between font-sans text-[10px] uppercase text-[#C8C8C8]">
                        <span>{label}</span>
                        <span>{value}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
                        <div className={`h-full ${barColor(value)}`} style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="font-sans text-[10px] uppercase text-[#959597]">
                    Weighted 30 / 25 / 20 / 15 / 10. Inventory stays at {detail.children.length ? "100" : "0"} because consumable counts are not stored.
                  </p>
                </div>
              </Panel>
              <div className="grid gap-3 md:grid-cols-2">
                <Panel title="Next service due">
                  {detail.services.length === 0 ? (
                    <p className="font-sans text-[12px] uppercase text-[#959597]">No calibration due dates on this truck.</p>
                  ) : (
                    detail.services.map((service) => (
                      <div key={service.label} className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">{service.label}</span>
                        <span className="font-sans text-[11px] text-[#C8C8C8]">{service.due ?? "—"}</span>
                        {service.days != null ? (
                          <DashboardBadge variant={fleetBadgeTone(service.tone)}>{service.days} days</DashboardBadge>
                        ) : null}
                      </div>
                    ))
                  )}
                </Panel>
                <Panel title="Recent activity · last 3">
                  {detail.activity.length === 0 ? (
                    <p className="font-sans text-[12px] uppercase text-[#959597]">No inspections recorded on this truck.</p>
                  ) : (
                    detail.activity.map((row) => (
                      <div key={`${row.asset}-${row.when}`} className="mb-2 grid grid-cols-3 gap-2 font-sans text-[11px] uppercase">
                        <span className="text-[#FDFDFF]">{row.asset}</span>
                        <span className="text-[#C8C8C8]">{row.event}</span>
                        <span className="text-[#959597]">{row.when ?? "—"}</span>
                      </div>
                    ))
                  )}
                </Panel>
              </div>
            </div>
          ) : null}
          {tab === "CHILD ASSETS" ? (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="font-sans text-[12px] uppercase text-[#C8C8C8]">
                  Child assets · {detail.children.length}
                  {needsReview ? ` · ${needsReview} need review` : ""}
                </p>
                <div className="flex gap-2">
                  <DashboardToolbarButton variant={childView === "CARDS" ? "primary" : "glass"} onClick={() => setChildView("CARDS")}>Cards</DashboardToolbarButton>
                  <DashboardToolbarButton variant={childView === "LIST" ? "primary" : "glass"} onClick={() => setChildView("LIST")}>List</DashboardToolbarButton>
                </div>
              </div>
              {detail.children.length === 0 ? (
                <p className="font-sans text-[12px] uppercase text-[#959597]">No assets are assigned to this truck.</p>
              ) : childView === "LIST" ? (
                <div className="overflow-hidden rounded-xl border border-[#2D2D30]">
                  {detail.children.map((row) => (
                    <ChildRow key={row.id} row={row} onMove={() => openMove(row)} onMissing={() => void missing(row)} />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {detail.children.map((row) => (
                    <article key={row.id} className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-sans text-[13px] uppercase text-[#FDFDFF]">{row.assetLabel}</p>
                          <p className="font-sans text-[10px] uppercase text-[#959597]">{row.equipmentType} · {row.assetCode}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <DashboardBadge variant={fleetBadgeTone(row.statusTone)}>{row.statusLabel}</DashboardBadge>
                          <AssetMenu row={row} onMove={() => openMove(row)} onMissing={() => void missing(row)} />
                        </div>
                      </div>
                      <p className="mt-3 font-sans text-[11px] uppercase text-[#C8C8C8]">
                        Calib {row.calibration} · Repair {row.repair}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : null}
          {tab === "INSPECTIONS" ? <SimpleList rows={detail.children.filter((row) => row.inspectionId)} empty="No inspections are tied to these assets." /> : null}
          {tab === "CALIBRATION" ? (
            <Panel title={`Calibration status · ${detail.children.filter((row) => row.calibration !== "N/A").length}`}>
              <div className="mb-3 flex justify-end">
                <DashboardToolbarButton variant="primary" onClick={() => router.push("/fleet/calibration")}>Add calibration</DashboardToolbarButton>
              </div>
              {detail.children.filter((row) => row.calibration !== "N/A").length === 0 ? (
                <p className="font-sans text-[12px] uppercase text-[#959597]">No calibration records on this truck.</p>
              ) : (
                <div className="space-y-2">
                  {detail.children.filter((row) => row.calibration !== "N/A").map((row) => (
                    <div key={row.id} className="grid grid-cols-[1.4fr_auto_auto_auto] items-center gap-3 border-b border-[#2D2D30] py-2">
                      <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">{row.assetCode} · {row.assetLabel}</span>
                      <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">{row.lastCalibration ?? "—"}</span>
                      <span className="font-sans text-[11px] uppercase text-[#C8C8C8]">{row.nextDue ?? "—"}</span>
                      <DashboardBadge variant={row.calibration === "EXPIRED" ? "warning" : "success"}>
                        {row.dueDays != null && row.dueDays >= 0 && row.dueDays <= 14 ? `DUE IN ${row.dueDays} DAYS` : row.calibration}
                      </DashboardBadge>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 font-sans text-[11px] uppercase text-[#959597]">
                Gas monitors require current calibration. Expired assets block dispatch when the job requires them.
              </p>
            </Panel>
          ) : null}
          {tab === "REPAIR REQUESTS" ? (
            <Panel title={`Repair requests · ${detail.card.name}`}>
              <div className="mb-3 flex justify-end">
                <DashboardToolbarButton variant="primary" onClick={() => router.push(`/fleet/repair-requests/new?truck=${encodeURIComponent(detail.card.name)}`)}>Create repair</DashboardToolbarButton>
              </div>
              {repairs.length === 0 ? (
                <p className="font-sans text-[12px] uppercase text-[#959597]">No repair requests are filed against this truck.</p>
              ) : (
                <div className="space-y-2">
                  {repairs.map((row) => (
                    <button key={row.id} type="button" onClick={() => router.push(`/fleet/repair-requests/${row.code}`)} className="grid w-full grid-cols-[auto_1.2fr_1fr_auto] items-center gap-3 border-b border-[#2D2D30] py-2 text-left">
                      <span className="font-sans text-[12px] uppercase text-[#8EB4FF]">{row.code}</span>
                      <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">{row.assetLabel}</span>
                      <span className="truncate font-sans text-[11px] uppercase text-[#C8C8C8]">{row.issue}</span>
                      <DashboardBadge variant={fleetBadgeTone(row.statusTone)}>{row.statusLabel}</DashboardBadge>
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-4 font-sans text-[11px] uppercase text-[#959597]">
                Open {repairs.filter((row) => row.status !== "CLOSED" && row.status !== "CANCELLED").length} · On this truck {repairs.length}
              </p>
            </Panel>
          ) : null}
          {tab === "MOVEMENT" ? (
            <Panel title={`Movement log · ${(detail.movements?.length ?? 0) + detail.activity.length}`}>
              {(detail.movements?.length ?? 0) + detail.activity.length === 0 ? (
                <p className="font-sans text-[12px] uppercase text-[#959597]">No movement is recorded for this truck.</p>
              ) : (
                <>
                  <div className="mb-2 grid grid-cols-5 gap-2 font-sans text-[10px] uppercase text-[#959597]">
                    <span>What moved</span><span>From</span><span>To</span><span>Who</span><span>When / why</span>
                  </div>
                  {(detail.movements ?? []).map((row) => (
                    <div key={row.id} className="grid grid-cols-5 gap-2 border-b border-[#2D2D30] py-2 font-sans text-[11px] uppercase">
                      <span className="text-[#FDFDFF]">{row.asset}</span>
                      <span className="text-[#C8C8C8]">{row.from}</span>
                      <span className="text-[#C8C8C8]">{row.to}</span>
                      <span className="text-[#C8C8C8]">{row.who}</span>
                      <span className="text-[#959597]">{row.when.slice(0, 10)} · {row.why}</span>
                    </div>
                  ))}
                  {detail.activity.map((row) => (
                    <div key={`${row.asset}-${row.when}-${row.event}`} className="grid grid-cols-5 gap-2 border-b border-[#2D2D30] py-2 font-sans text-[11px] uppercase">
                      <span className="text-[#FDFDFF]">{row.asset}</span>
                      <span className="text-[#C8C8C8]">{row.place ?? "—"}</span>
                      <span className="text-[#C8C8C8]">{card.name}</span>
                      <span className="text-[#C8C8C8]">{row.who ?? "—"}</span>
                      <span className="text-[#959597]">{row.when ?? "—"} · {row.event}</span>
                    </div>
                  ))}
                </>
              )}
            </Panel>
          ) : null}
          {tab === "INVENTORY" ? (
            <Panel title={`Inventory · ${detail.inventory?.length ?? 0}`}>
              <form
                className="mb-4 grid gap-2 md:grid-cols-[1fr_120px_1fr_80px_80px_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  void (async () => {
                    try {
                      await fleetApi.addTruckInventory(id, {
                        item: stock.item,
                        qty: Number(stock.qty),
                        minimum: Number(stock.minimum),
                        sku: stock.sku || undefined,
                        preferredVendor: stock.vendor || undefined,
                      });
                      setStock({ item: "", qty: "1", minimum: "1", sku: "", vendor: "" });
                      toastSuccess("Inventory item saved");
                      await load();
                    } catch (err) {
                      toastApiError(err);
                    }
                  })();
                }}
              >
                <input value={stock.item} onChange={(e) => setStock((s) => ({ ...s, item: e.target.value }))} placeholder="Item" className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]" />
                <input value={stock.sku} onChange={(e) => setStock((s) => ({ ...s, sku: e.target.value }))} placeholder="SKU" className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]" />
                <input value={stock.vendor} onChange={(e) => setStock((s) => ({ ...s, vendor: e.target.value }))} placeholder="Preferred vendor" className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]" />
                <input value={stock.qty} onChange={(e) => setStock((s) => ({ ...s, qty: e.target.value }))} placeholder="Qty" className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] text-[#FDFDFF]" />
                <input value={stock.minimum} onChange={(e) => setStock((s) => ({ ...s, minimum: e.target.value }))} placeholder="Min" className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] text-[#FDFDFF]" />
                <DashboardToolbarButton variant="primary" type="submit">Add item</DashboardToolbarButton>
              </form>
              {(detail.inventory ?? []).length === 0 ? (
                <p className="font-sans text-[12px] uppercase text-[#959597]">No consumables are recorded on this truck.</p>
              ) : (
                (detail.inventory ?? []).filter((item) => item.tracked !== false).map((item) => {
                  const needed = Math.max(item.minimum - item.qty, item.minimum || 1);
                  const sku = item.sku || item.item;
                  return (
                    <div key={item.id} className="grid grid-cols-[1.4fr_auto_auto_auto] items-center gap-3 border-b border-[#2D2D30] py-2">
                      <div>
                        <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">{item.item}</span>
                        {item.sku ? <span className="ml-2 font-sans text-[10px] uppercase text-[#959597]">{item.sku}</span> : null}
                      </div>
                      <span className="font-sans text-[12px] text-[#C8C8C8]">{item.qty}</span>
                      <span className={item.qty < item.minimum ? "font-sans text-[12px] text-[#FF8A9A]" : "font-sans text-[12px] text-[#959597]"}>min {item.minimum}</span>
                      <DashboardRowActionMenu
                        items={[
                          { id: "open", label: "Open", onSelect: () => { setInvAction({ kind: "docs", itemId: item.id }); setInvValue(""); } },
                          { id: "count", label: "Adjust count", onSelect: () => { setInvAction({ kind: "count", itemId: item.id }); setInvValue(String(item.qty)); } },
                          { id: "min", label: "Set minimum", onSelect: () => { setInvAction({ kind: "min", itemId: item.id }); setInvValue(String(item.minimum)); } },
                          {
                            id: "po",
                            label: "Raise purchase order",
                            hint: `Opens add purchase order · ${sku} x${needed}${item.preferredVendor ? ` · ${item.preferredVendor}` : " · preferred vendor"}`,
                            onSelect: () => { setInvAction({ kind: "po", itemId: item.id }); setInvValue(String(needed)); setInvExtra(item.preferredVendor ?? ""); },
                          },
                          { id: "move", label: "Move stock", onSelect: () => { setInvAction({ kind: "move", itemId: item.id }); setInvValue("1"); setInvExtra(""); } },
                          { id: "stop", label: "Stop tracking", destructive: true, onSelect: () => void fleetApi.updateTruckInventory(id, item.id, { tracked: false }).then(() => { toastSuccess(`${item.item} is no longer tracked`); return load(); }).catch(toastApiError) },
                        ]}
                      />
                    </div>
                  );
                })
              )}
            </Panel>
          ) : null}
          {tab === "DOCUMENTS" ? (
            <Panel title={`Documents · ${detail.documents?.length ?? 0}`}>
              {(detail.documents ?? []).length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-[#2D2D30] text-center">
                  <p className="font-sans text-[13px] uppercase text-[#FDFDFF]">No documents attached</p>
                  <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">Upload a truck document to see it here.</p>
                </div>
              ) : (
                <ul className="mb-3 space-y-2">
                  {(detail.documents ?? []).map((doc) => (
                    <li key={doc.id}>
                      <a href={doc.url} className="font-sans text-[12px] uppercase text-[#8EB4FF]" target="_blank" rel="noreferrer">{doc.name}</a>
                    </li>
                  ))}
                </ul>
              )}
              <label className="mt-3 inline-flex cursor-pointer rounded-lg border border-[#2D2D30] px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]">
                Upload document
                <input
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void (async () => {
                      try {
                        const contentBase64 = await fileToBase64(file);
                        const uploaded = await crmApi.uploadFile({
                          folder: "fleet-trucks",
                          fileName: file.name,
                          mimeType: file.type || "application/octet-stream",
                          contentBase64,
                        });
                        await fleetApi.addTruckDocument(id, { name: file.name, url: uploaded.data.url });
                        toastSuccess("Document saved");
                        await load();
                      } catch (err) {
                        toastApiError(err);
                      }
                    })();
                  }}
                />
              </label>
              <ul className="mt-4 space-y-2 font-sans text-[12px] uppercase text-[#C8C8C8]">
                {["Registration", "Insurance certificate", "DOT inspection record", "Driver qualification file", "Title"].map((item) => (
                  <li key={item}>○ {item}</li>
                ))}
              </ul>
            </Panel>
          ) : null}
          {tab === "AUDIT LOG" ? (
            <Panel title={`Audit log · ${detail.audit?.length ?? 0}`}>
              {(detail.audit ?? []).length === 0 ? (
                <p className="font-sans text-[12px] uppercase text-[#959597]">No truck changes have been recorded yet.</p>
              ) : (
                (detail.audit ?? []).map((row) => (
                  <div key={row.id} className="grid grid-cols-4 gap-2 border-b border-[#2D2D30] py-2 font-sans text-[11px] uppercase">
                    <span className="text-[#FDFDFF]">{row.field}</span>
                    <span className="text-[#C8C8C8]">{row.from} → {row.to}</span>
                    <span className="text-[#C8C8C8]">{row.who}</span>
                    <span className="text-[#959597]">{row.when.slice(0, 16).replace("T", " ")}</span>
                  </div>
                ))
              )}
              <p className="mt-3 font-sans text-[11px] uppercase text-[#959597]">
                Changes are kept with the acting user, timestamp, and before / after values.
              </p>
            </Panel>
          ) : null}
        </div>
        <aside className="h-fit rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
          <p className="mb-3 font-sans text-[12px] uppercase text-[#FDFDFF]">Actions</p>
          <div className="space-y-2">
            <button type="button" onClick={() => setAssignOpen(true)} className="w-full rounded-lg bg-[#FDFDFF] py-2 font-sans text-[11px] uppercase text-[#121212]">
              Reassign technician
            </button>
            <Action onClick={() => setAssignOpen(true)}>Edit truck</Action>
            <Action onClick={() => router.push("/fleet/repair-requests")}>Send to shop</Action>
            <Action onClick={() => window.print()}>Print manifest</Action>
            <Action onClick={exportChildren}>Export asset list</Action>
            <Action disabled>View on map</Action>
            <button
              type="button"
              disabled={busy || card.kind !== "TRUCK"}
              onClick={() => void deactivate()}
              className="w-full rounded-lg border border-[#5C1F1F] py-2 font-sans text-[11px] uppercase text-[#FF8A9A] disabled:opacity-40"
            >
              Deactivate truck
            </button>
          </div>
        </aside>
      </div>

      <DashboardModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Reassign technician"
        footer={
          <button type="button" disabled={busy || !employeeId} onClick={() => void assign()} className="rounded-lg bg-[#FDFDFF] px-4 py-2 font-sans text-[11px] uppercase text-[#121212] disabled:opacity-40">
            Assign
          </button>
        }
      >
        <select
          value={employeeId}
          onChange={(event) => setEmployeeId(event.target.value)}
          className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]"
        >
          {detail.employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}{employee.assignedTruck ? ` · ${employee.assignedTruck}` : ""}
            </option>
          ))}
        </select>
      </DashboardModal>
      <InventoryActionModal
        truckId={id}
        item={(detail.inventory ?? []).find((row) => row.id === invAction?.itemId) ?? null}
        action={invAction?.kind ?? null}
        value={invValue}
        extra={invExtra}
        onValue={setInvValue}
        onExtra={setInvExtra}
        onClose={() => setInvAction(null)}
        onDone={async () => {
          setInvAction(null);
          await load();
        }}
      />
    </div>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      resolve(raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function AssetMenu({ row, onMove, onMissing }: { row: FleetAsset; onMove: () => void; onMissing: () => void }) {
  return (
    <DashboardRowActionMenu
      items={[
        { id: "open", label: "Open asset", onSelect: () => (window.location.href = `/fleet/assets/${encodeURIComponent(row.assetCode)}/edit`) },
        { id: "move", label: "Move", onSelect: onMove },
        { id: "cal", label: "Add calibration", onSelect: () => (window.location.href = "/fleet/calibration") },
        { id: "insp", label: "Add inspection", onSelect: () => (window.location.href = "/fleet/inspections/new") },
        { id: "repair", label: "Create repair", onSelect: () => (window.location.href = "/fleet/repair-requests") },
        {
          id: "oos",
          label: "Mark out of service",
          onSelect: () => {
            if (!row.calibrationId) return;
            void fleetApi.markCalibrationOutOfService(row.calibrationId).then(() => window.location.reload());
          },
        },
        { id: "missing", label: "Mark missing", destructive: true, onSelect: onMissing },
      ]}
    />
  );
}

function InventoryActionModal({
  truckId, item, action, value, extra, onValue, onExtra, onClose, onDone,
}: {
  truckId: string;
  item: FleetTruckDetail["inventory"] extends Array<infer T> | undefined ? T | null : null;
  action: "count" | "min" | "po" | "move" | "docs" | null;
  value: string;
  extra: string;
  onValue: (value: string) => void;
  onExtra: (value: string) => void;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  if (!item || !action) return null;
  const current = item;
  const needed = Math.max(current.minimum - current.qty, current.minimum || 1);
  async function save() {
    try {
      if (action === "count") await fleetApi.updateTruckInventory(truckId, current.id, { qty: Number(value) });
      if (action === "min") await fleetApi.updateTruckInventory(truckId, current.id, { minimum: Number(value) });
      if (action === "po") {
        if (extra.trim()) await fleetApi.updateTruckInventory(truckId, current.id, { preferredVendor: extra.trim() });
        await fleetApi.updateTruckInventory(truckId, current.id, { purchaseQty: Number(value) || needed });
        toastSuccess(`Purchase request saved for ${current.item}`);
      }
      if (action === "move") {
        await fleetApi.moveTruckInventory(truckId, current.id, { to: extra.trim(), qty: Number(value) || 1 });
        toastSuccess(`${current.item} moved to ${extra.trim()}`);
      }
      if (action !== "po" && action !== "move" && action !== "docs") toastSuccess(`${current.item} updated`);
      await onDone();
    } catch (err) {
      toastApiError(err);
    }
  }
  async function upload(file: File) {
    const contentBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const uploaded = await crmApi.uploadFile({ folder: "fleet-inventory", fileName: file.name, mimeType: file.type, contentBase64 });
    await fleetApi.addTruckInventoryDocument(truckId, current.id, { type: "DOCUMENT", name: file.name, url: uploaded.data.url });
    toastSuccess("Document uploaded");
    await onDone();
  }
  const title = action === "count" ? "Adjust count" : action === "min" ? "Set minimum" : action === "po" ? "Raise purchase order" : action === "move" ? "Move stock" : `Documents · ${current.sku || current.item}`;
  return (
    <DashboardModal open onClose={onClose} title={title} widthClassName="max-w-md" footer={action === "docs" ? undefined : (
      <div className="flex justify-end gap-2">
        <DashboardToolbarButton onClick={onClose}>Cancel</DashboardToolbarButton>
        <DashboardToolbarButton variant="primary" onClick={() => void save()}>Save</DashboardToolbarButton>
      </div>
    )}>
      {action === "docs" ? (
        <div className="space-y-3">
          {(current.documents ?? []).length === 0 ? <p className="font-sans text-[12px] uppercase text-[#959597]">No documents on this item.</p> : null}
          {(current.documents ?? []).map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 border-b border-[#2D2D30] py-2">
              <div>
                <p className="font-sans text-[11px] uppercase text-[#959597]">{doc.type}</p>
                <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">{doc.name}</p>
              </div>
              {doc.url ? <a href={doc.url} target="_blank" rel="noreferrer" className="font-sans text-[11px] uppercase text-[#8EB4FF]">Open</a> : null}
            </div>
          ))}
          <label className="inline-flex cursor-pointer font-sans text-[12px] uppercase text-[#8EB4FF]">
            + Upload document
            <input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file).catch(toastApiError); }} />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          {action === "po" ? (
            <p className="font-sans text-[11px] uppercase text-[#959597]">
              {current.sku || current.item} x{value || needed}{extra ? ` · ${extra}` : current.preferredVendor ? ` · ${current.preferredVendor}` : ""}
            </p>
          ) : null}
          <input value={value} onChange={(e) => onValue(e.target.value)} placeholder={action === "move" ? "Quantity" : "Quantity"} className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] text-[#FDFDFF]" />
          {action === "po" || action === "move" ? (
            <input value={extra} onChange={(e) => onExtra(e.target.value)} placeholder={action === "move" ? "Destination truck or location" : "Preferred vendor"} className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF]" />
          ) : null}
        </div>
      )}
    </DashboardModal>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
      <h2 className="mb-3 font-sans text-[12px] uppercase tracking-[0.06em] text-[#FDFDFF]">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex justify-between gap-3 font-sans text-[12px] uppercase">
      <span className="text-[#959597]">{label}</span>
      <span className="text-[#FDFDFF]">{value}</span>
    </div>
  );
}

function Action({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="w-full rounded-lg border border-[#2D2D30] py-2 font-sans text-[11px] uppercase text-[#FDFDFF] disabled:opacity-40">
      {children}
    </button>
  );
}

function ChildRow({ row, onMove, onMissing }: { row: FleetAsset; onMove?: () => void; onMissing?: () => void }) {
  return (
    <div className="grid grid-cols-[1.4fr_1fr_auto_auto] items-center gap-3 border-b border-[#2D2D30] px-4 py-3 last:border-b-0">
      <div>
        <p className="font-sans text-[13px] uppercase text-[#FDFDFF]">{row.assetLabel}</p>
        <p className="font-sans text-[10px] uppercase text-[#959597]">{row.assetCode}</p>
      </div>
      <p className="font-sans text-[12px] uppercase text-[#C8C8C8]">{row.equipmentType}</p>
      <DashboardBadge variant={fleetBadgeTone(row.statusTone)}>{row.statusLabel}</DashboardBadge>
      {onMove && onMissing ? <AssetMenu row={row} onMove={onMove} onMissing={onMissing} /> : null}
    </div>
  );
}

function SimpleList({ rows, empty }: { rows: FleetAsset[]; empty: string }) {
  if (rows.length === 0) return <p className="font-sans text-[12px] uppercase text-[#959597]">{empty}</p>;
  return (
    <div className="overflow-hidden rounded-xl border border-[#2D2D30]">
      {rows.map((row) => (
        <ChildRow key={row.id} row={row} />
      ))}
    </div>
  );
}
