"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardExportMenu,
  DashboardSearchInput,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import { fleetApi, type FleetPlaceCard } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { downloadCsv } from "./fleet-ui";

type Tab = "TRUCKS" | "LOCATIONS" | "ALL";

const FILTERS = [
  { id: "NEEDS_REVIEW", label: "Needs review" },
  { id: "REPAIRS", label: "Has open repairs" },
  { id: "CALIB", label: "Expired calib" },
  { id: "BAY", label: "In repair bay" },
] as const;

function matches(card: FleetPlaceCard, filter: string) {
  if (filter === "NEEDS_REVIEW") return card.status === "NEED_REVIEW";
  if (filter === "REPAIRS") return card.repairs > 0;
  if (filter === "CALIB") return card.calibExpired > 0;
  if (filter === "BAY") return /BAY|REPAIR/i.test(card.name) || card.status === "IN_REPAIR";
  return true;
}

function barColor(readiness: number) {
  if (readiness < 75) return "bg-[#E06A7A]";
  if (readiness < 90) return "bg-[#C9A227]";
  return "bg-[#3DDC97]";
}

export function TrucksPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<Tab>("ALL");
  const [q, setQ] = React.useState("");
  const [filters, setFilters] = React.useState<string[]>([]);
  const [cards, setCards] = React.useState<FleetPlaceCard[]>([]);
  const [cells, setCells] = React.useState<Array<{ title: string; value: string; meta?: string; filterKey?: string }>>([]);
  const [employees, setEmployees] = React.useState<Array<{ id: string; name: string; assignedTruck: string | null }>>([]);
  const [limit, setLimit] = React.useState(6);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [truckName, setTruckName] = React.useState("");
  const [employeeId, setEmployeeId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sort, setSort] = React.useState<"READINESS" | "NAME" | "TECH">("READINESS");
  const [sortOpen, setSortOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fleetApi.trucksOverview();
      setCards(res.data.cards);
      setCells(res.data.cells);
      setEmployees(res.data.employees);
      setEmployeeId(res.data.employees[0]?.id ?? "");
    } catch (err) {
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const visible = cards.filter((card) => {
    if (tab === "TRUCKS" && card.kind !== "TRUCK") return false;
    if (tab === "LOCATIONS" && card.kind !== "LOCATION") return false;
    if (filters.length && !filters.every((filter) => matches(card, filter))) return false;
    const query = q.trim().toLowerCase();
    if (!query) return true;
    return [card.name, card.driver, card.unit, card.site]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
  const shown = visible.slice(0, limit);

  async function assign() {
    if (!employeeId || !truckName.trim()) {
      toastApiError(new Error("Choose a driver and a truck name"));
      return;
    }
    setBusy(true);
    try {
      const res = await fleetApi.assignTruck(employeeId, truckName.trim());
      toastSuccess(res.data.message);
      setAssignOpen(false);
      setTruckName("");
      await load();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading && cards.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader label="Loading trucks" />
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-sans text-[18px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">
          Trucks & Locations
        </h1>
        <div className="flex gap-2">
          <DashboardExportMenu
            items={[{ id: "csv", label: "Export current view · CSV", onSelect: () => downloadCsv("trucks.csv", ["Name", "Unit", "Driver", "Readiness", "Assets", "Repairs", "Status"], cards.map((card) => [card.name, card.unit, card.driver, card.readiness, card.assets, card.repairs, card.statusLabel])) }]}
          />
          <div className="relative">
            <DashboardToolbarButton variant="primary" onClick={() => setMenuOpen((open) => !open)}>
              Add Truck / Location
            </DashboardToolbarButton>
            {menuOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-[#2D2D30] bg-[#161616] p-1 shadow-xl">
                <button
                  type="button"
                  className="block w-full rounded px-3 py-2 text-left font-sans text-[11px] uppercase text-[#FDFDFF] hover:bg-[#2A2A2A]"
                  onClick={() => {
                    setMenuOpen(false);
                    setAssignOpen(true);
                  }}
                >
                  Add Truck
                </button>
                <button
                  type="button"
                  className="block w-full rounded px-3 py-2 text-left font-sans text-[11px] uppercase text-[#C8C8C8] hover:bg-[#2A2A2A]"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/fleet/trucks/locations/new");
                  }}
                >
                  Add Location
                </button>
                <button
                  type="button"
                  className="block w-full rounded px-3 py-2 text-left font-sans text-[11px] uppercase text-[#C8C8C8] hover:bg-[#2A2A2A]"
                  onClick={() => {
                    setMenuOpen(false);
                    fileRef.current?.click();
                  }}
                >
                  Import trucks from CSV
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <DashboardStatGrid>
        <DashboardStatRow columns={5} className="xl:grid-cols-6">
          {cells.map((cell) => (
            <button
              key={cell.title}
              type="button"
              className="text-left"
              onClick={() => {
                const key = cell.filterKey;
                if (!key) return;
                setTab("TRUCKS");
                setFilters((current) =>
                  current.includes(key) ? current.filter((item) => item !== key) : [key],
                );
              }}
            >
              <DashboardStatCell title={cell.title} value={cell.value} meta={cell.meta} />
            </button>
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-[#2D2D30] p-0.5">
          {(["TRUCKS", "LOCATIONS", "ALL"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setTab(item);
                setLimit(6);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 font-sans text-[10px] uppercase",
                tab === item ? "bg-[#FDFDFF] text-[#111]" : "text-[#959597]",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="font-sans text-[10px] uppercase text-[#8EB4FF]"
            onClick={() => router.push("/fleet/trucks/locations")}
          >
            Location register
          </button>
          <div className="relative">
            <button type="button" className="font-sans text-[10px] uppercase text-[#959597]" onClick={() => setSortOpen((open) => !open)}>
              Sort · {sort === "READINESS" ? "readiness lowest first" : sort === "NAME" ? "truck number" : "technician"}
            </button>
            {sortOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-[#2D2D30] bg-[#161616] p-1">
                {(
                  [
                    ["READINESS", "Readiness lowest first"],
                    ["NAME", "Truck number"],
                    ["TECH", "Technician"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="block w-full rounded px-3 py-2 text-left font-sans text-[11px] uppercase text-[#FDFDFF] hover:bg-[#2A2A2A]"
                    onClick={() => {
                      setSort(key);
                      setSortOpen(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DashboardSearchInput
          placeholder="Search truck #, unit # or tech"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {FILTERS.map((filter) => {
          const on = filters.includes(filter.id);
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() =>
                setFilters((current) =>
                  on ? current.filter((item) => item !== filter.id) : [...current, filter.id],
                )
              }
              className={cn(
                "rounded-full border px-3 py-1 font-sans text-[10px] uppercase",
                on ? "border-[#FDFDFF] text-[#FDFDFF]" : "border-[#2D2D30] text-[#959597]",
              )}
            >
              {filter.label}
              {on ? " ×" : ""}
            </button>
          );
        })}
        {filters.length ? (
          <button
            type="button"
            className="font-sans text-[10px] uppercase text-[#8EB4FF]"
            onClick={() => setFilters([])}
          >
            Clear all
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown
          .slice()
          .sort((a, b) => {
            if (sort === "NAME") return a.name.localeCompare(b.name);
            if (sort === "TECH") return (a.driver ?? "").localeCompare(b.driver ?? "");
            return (a.readiness ?? 101) - (b.readiness ?? 101);
          })
          .map((card) => (
            <article key={card.id} className="rounded-xl border border-[#2D2D30] bg-[#141414] p-4">
              <div className="relative mb-3 flex h-28 items-center justify-center rounded-lg border border-dashed border-[#2D2D30] bg-[#101010]">
                <span className="font-sans text-[11px] uppercase text-[#6B6B6D]">
                  {card.kind === "TRUCK" ? "Truck" : "Location"}
                </span>
                <span
                  className={cn(
                    "absolute right-3 top-3 rounded-full px-2 py-0.5 font-sans text-[9px] uppercase",
                    card.status === "NEED_REVIEW" && "bg-[#3A3418] text-[#E8C547]",
                    card.status === "READY" && "bg-[#143024] text-[#7DCEA0]",
                    card.status === "ACTIVE" && "bg-[#143024] text-[#7DCEA0]",
                    card.status === "IN_REPAIR" && "bg-[#3A1820] text-[#FF8A9A]",
                    card.status === "AT_CAPACITY" && "bg-[#3A3418] text-[#E8C547]",
                  )}
                >
                  {card.statusLabel}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-sans text-[14px] font-[590] uppercase text-[#FDFDFF]">{card.name}</p>
                  <p className="font-sans text-[11px] uppercase text-[#959597]">
                    {card.driver ?? card.site ?? "Unassigned"}
                  </p>
                </div>
                <p className="font-sans text-[10px] uppercase text-[#6B6B6D]">{card.unit}</p>
              </div>
              {card.readiness != null ? (
                <div className="mt-3">
                  <div className="mb-1 flex justify-between font-sans text-[10px] uppercase text-[#959597]">
                    <span>Readiness</span>
                    <span>{card.readiness}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
                    <div className={cn("h-full", barColor(card.readiness))} style={{ width: `${card.readiness}%` }} />
                  </div>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2 font-sans text-[10px] uppercase text-[#C8C8C8]">
                <span>{card.assets} assets</span>
                <span>{card.repairs} repairs</span>
                <span>{card.calibExpired} calib exp</span>
                <span>{card.inspFailed} insp fail</span>
                {card.lastAudit ? <span>{card.lastAudit} last audit</span> : null}
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-lg border border-[#2D2D30] py-2 font-sans text-[11px] uppercase text-[#FDFDFF]"
                onClick={() =>
                  router.push(
                    card.kind === "TRUCK"
                      ? `/fleet/trucks/${card.id}`
                      : `/fleet/trucks/locations/${card.id}`,
                  )
                }
              >
                {card.kind === "TRUCK" ? "View Truck" : "View Location"}
              </button>
            </article>
          ))}
      </div>

      <div className="flex items-center justify-between font-sans text-[10px] uppercase text-[#959597]">
        <span>
          Showing {Math.min(limit, visible.length)} of {visible.length}
          {filters.includes("NEEDS_REVIEW") ? " needing review" : ""}
        </span>
        {visible.length > limit ? (
          <button type="button" className="text-[#8EB4FF]" onClick={() => setLimit(visible.length)}>
            Load all {visible.length}
          </button>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void (async () => {
            const text = await file.text();
            const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
            let assigned = 0;
            for (const line of lines) {
              const [truck, person] = line.split(",").map((part) => part.trim());
              if (!truck || !person || /truck/i.test(truck) && /tech|driver|employee/i.test(person)) continue;
              const employee = employees.find((row) => row.name.toLowerCase().includes(person.toLowerCase()));
              if (!employee) continue;
              await fleetApi.assignTruck(employee.id, truck);
              assigned += 1;
            }
            toastSuccess(`${assigned} truck assignment${assigned === 1 ? "" : "s"} imported`);
            await load();
          })().catch(toastApiError);
          event.target.value = "";
        }}
      />
      {assignOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#2D2D30] bg-[#121212] p-5">
            <h2 className="font-sans text-[14px] uppercase text-[#FDFDFF]">Add Truck</h2>
            <p className="mt-1 font-sans text-[11px] uppercase text-[#959597]">
              Assigns the truck on the employee record.
            </p>
            <label className="mt-4 block">
              <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Truck name</span>
              <input
                value={truckName}
                onChange={(e) => setTruckName(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
                placeholder="TRUCK 16"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block font-sans text-[10px] uppercase text-[#959597]">Driver</span>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase text-[#FDFDFF] outline-none"
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                    {employee.assignedTruck ? ` · ${employee.assignedTruck}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <DashboardToolbarButton onClick={() => setAssignOpen(false)}>Cancel</DashboardToolbarButton>
              <DashboardToolbarButton variant="primary" disabled={busy} onClick={() => void assign()}>
                Assign Truck
              </DashboardToolbarButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
