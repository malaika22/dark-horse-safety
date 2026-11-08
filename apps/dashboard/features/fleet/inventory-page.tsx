"use client";

import * as React from "react";
import {
  DashboardBadge,
  DashboardDataTable,
  DashboardExportMenu,
  DashboardListToolbar,
  DashboardMenuPopover,
  DashboardModal,
  DashboardRowActionMenu,
  DashboardSearchInput,
  DashboardSortMenu,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  DashboardToolbarIcons,
  type DashboardDataTableColumn,
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import { fleetApi, type FleetInventoryLine } from "@/lib/fleet-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { fleetBadgeTone } from "./fleet-ui";
import { BrandLoader } from "@/features/loading/brand-loader";

const field =
  "h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none";

const SORTS = [
  { id: "status", label: "Status (critical first)" },
  { id: "item", label: "Item" },
  { id: "location", label: "Location" },
  { id: "updated", label: "Last updated" },
  { id: "qty", label: "Qty on hand" },
];

type Line = FleetInventoryLine & { locations: number };

function rank(status: string) {
  if (status === "CRITICAL") return 0;
  if (status === "LOW") return 1;
  return 2;
}

export function InventoryPage() {
  const addRef = React.useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = React.useState(true);
  const [lines, setLines] = React.useState<FleetInventoryLine[]>([]);
  const [places, setPlaces] = React.useState<Array<{ id: string; name: string; kind: string }>>([]);
  const [q, setQ] = React.useState("");
  const [view, setView] = React.useState<"item" | "location">("item");
  const [sortField, setSortField] = React.useState("status");
  const [sortDirection, setSortDirection] = React.useState<DashboardSortDirection>("asc");
  const [status, setStatus] = React.useState("");
  const [place, setPlace] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [adjust, setAdjust] = React.useState<FleetInventoryLine | null>(null);
  const [qty, setQty] = React.useState("");
  const [draft, setDraft] = React.useState({ placeId: "", item: "", sku: "", qty: "1", minimum: "1", unit: "EA", vendor: "" });

  const load = React.useCallback(async () => {
    const res = await fleetApi.listInventory();
    setLines(res.data.items);
    setPlaces(res.data.places);
  }, []);

  React.useEffect(() => {
    void load()
      .catch(toastApiError)
      .finally(() => setLoading(false));
  }, [load]);

  const filtered = lines.filter((line) => {
    const blob = `${line.item} ${line.sku} ${line.place}`.toLowerCase();
    if (q.trim() && !blob.includes(q.trim().toLowerCase())) return false;
    if (status && line.status !== status) return false;
    if (place && line.place !== place) return false;
    return true;
  });

  const grouped: Line[] =
    view === "location"
      ? filtered.map((line) => ({ ...line, locations: 1 }))
      : Object.values(
          filtered.reduce<Record<string, Line>>((acc, line) => {
            const key = (line.sku || line.item).toUpperCase();
            const current = acc[key];
            if (!current) {
              acc[key] = { ...line, locations: 1 };
              return acc;
            }
            current.qty += line.qty;
            current.minimum += line.minimum;
            current.docs += line.docs;
            current.locations += 1;
            current.place = `${current.locations} LOCATIONS`;
            const ratio = current.minimum > 0 ? current.qty / current.minimum : 1;
            current.status =
              current.qty <= 0 || ratio <= 0.3 ? "CRITICAL" : current.qty < current.minimum ? "LOW" : "STOCKED";
            current.statusTone =
              current.status === "CRITICAL" ? "danger" : current.status === "LOW" ? "warning" : "success";
            return acc;
          }, {}),
        );

  grouped.sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;
    if (sortField === "status") return (rank(a.status) - rank(b.status)) * dir;
    if (sortField === "location") return a.place.localeCompare(b.place) * dir;
    if (sortField === "updated") return String(a.countedAt).localeCompare(String(b.countedAt)) * dir;
    if (sortField === "qty") return (a.qty - b.qty) * dir;
    return a.item.localeCompare(b.item) * dir;
  });

  const low = new Set(lines.filter((line) => line.status !== "STOCKED").map((line) => line.sku || line.item));
  const critical = new Set(lines.filter((line) => line.status === "CRITICAL").map((line) => line.sku || line.item));
  const inTrucks = lines.filter((line) => line.kind === "TRUCK").length;
  const inYard = lines.filter((line) => line.kind !== "TRUCK").length;

  const columns: DashboardDataTableColumn<Line>[] = [
    {
      id: "item",
      header: "Item",
      cell: (row) => (
        <div>
          <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">{row.item}</p>
          <p className="font-sans text-[10px] uppercase text-[#959597]">
            {[row.unit, row.vendor].filter(Boolean).join(" · ")}
          </p>
        </div>
      ),
    },
    { id: "sku", header: "SKU", cell: (row) => row.sku || "—" },
    {
      id: "location",
      header: "Location",
      cell: (row) => (row.locations > 1 ? `${row.locations} LOCATIONS` : row.place),
    },
    { id: "qty", header: "On hand", cell: (row) => String(row.qty) },
    { id: "min", header: "Minimum", cell: (row) => `MIN ${row.minimum}` },
    {
      id: "status",
      header: "Status",
      cell: (row) => <DashboardBadge variant={fleetBadgeTone(row.statusTone)}>{row.status}</DashboardBadge>,
    },
    {
      id: "counted",
      header: "Last counted",
      cell: (row) => (row.countedAt ? new Date(row.countedAt).toLocaleDateString() : "—"),
    },
    { id: "docs", header: "Docs", cell: (row) => (row.docs ? `${row.docs} DOCS` : "—") },
    {
      id: "actions",
      header: "",
      cell: (row) => row.locations > 1 ? null : (
        <DashboardRowActionMenu
          items={[
            {
              id: "adjust",
              label: "Adjust count",
              onSelect: () => {
                setAdjust(row);
                setQty(String(row.qty));
              },
            },
            {
              id: "stop",
              label: "Stop tracking",
              destructive: true,
              onSelect: () =>
                void fleetApi
                  .updateTruckInventory(row.placeId, row.id, { tracked: false })
                  .then(load)
                  .then(() => toastSuccess(`${row.item} stopped`))
                  .catch(toastApiError),
            },
          ]}
        />
      ),
    },
  ];

  async function addItem() {
    if (!draft.placeId || !draft.item.trim()) return;
    try {
      await fleetApi.addTruckInventory(draft.placeId, {
        item: draft.item,
        sku: draft.sku || undefined,
        qty: Number(draft.qty) || 0,
        minimum: Number(draft.minimum) || 0,
        unit: draft.unit || undefined,
        preferredVendor: draft.vendor || undefined,
      });
      setAddOpen(false);
      toastSuccess("Item added");
      await load();
    } catch (error) {
      toastApiError(error);
    }
  }

  if (loading) return <BrandLoader />;

  const locationGroups =
    view === "location"
      ? Object.entries(
          grouped.reduce<Record<string, Line[]>>((acc, line) => {
            (acc[line.place] ??= []).push(line);
            return acc;
          }, {}),
        )
      : [];

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-sans text-[18px] font-semibold uppercase tracking-wide text-[#FDFDFF]">
            Inventory / consumables
          </h1>
          <p className="font-sans text-[10px] uppercase text-[#959597]">
            {new Set(lines.map((line) => (line.sku || line.item).toUpperCase())).size} item types · {lines.length} stock lines
          </p>
        </div>
        <DashboardToolbarButton ref={addRef} onClick={() => setMenuOpen((open) => !open)}>
          Add item
        </DashboardToolbarButton>
        <DashboardMenuPopover
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchorRef={addRef}
          items={[
            { id: "single", label: "Add single item", onSelect: () => setAddOpen(true) },
            {
              id: "csv",
              label: "Import items (CSV)",
              hint: "Columns: place, item, sku, qty, minimum",
              onSelect: () => document.getElementById("inventory-csv")?.click(),
            },
          ]}
        />
        <input
          id="inventory-csv"
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void file.text().then(async (text) => {
              const rows = text.split(/\r?\n/).slice(1).filter(Boolean);
              for (const row of rows) {
                const [placeName, item, sku, qtyValue, minimum] = row.split(",").map((part) => part.trim());
                const match = places.find((entry) => entry.name.toUpperCase() === placeName.toUpperCase());
                if (!match || !item) continue;
                await fleetApi.addTruckInventory(match.id, {
                  item,
                  sku,
                  qty: Number(qtyValue) || 0,
                  minimum: Number(minimum) || 0,
                });
              }
              toastSuccess("CSV import finished");
              await load();
            }).catch(toastApiError);
          }}
        />
      </div>

      <DashboardStatGrid>
        <DashboardStatRow columns={5}>
          <DashboardStatCell title="Total items" value={String(new Set(lines.map((line) => line.sku || line.item)).size)} meta={`${lines.length} STOCK LINES`} />
          <DashboardStatCell title="Low stock" value={String(low.size)} meta={[...low].slice(0, 2).join(" · ") || "NONE"} />
          <DashboardStatCell title="In trucks" value={String(inTrucks)} meta="LINES ON TRUCKS" />
          <DashboardStatCell title="In yard" value={String(inYard)} meta="LINES AT LOCATIONS" />
          <DashboardStatCell title="Critical" value={String(critical.size)} meta={[...critical].slice(0, 2).join(" · ") || "NONE"} />
        </DashboardStatRow>
      </DashboardStatGrid>

      <DashboardListToolbar
        search={
          <DashboardSearchInput
            placeholder="Search item, SKU, location…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        }
        filters={
          <>
            <DashboardToolbarButton
              leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}
              onClick={() => setFiltersOpen(true)}
            >
              Filter
            </DashboardToolbarButton>
            <DashboardToolbarButton onClick={() => setView("item")}>By item</DashboardToolbarButton>
            <DashboardToolbarButton onClick={() => setView("location")}>By location</DashboardToolbarButton>
          </>
        }
        actions={
          <>
            <DashboardSortMenu
              options={SORTS}
              field={sortField}
              direction={sortDirection}
              onFieldChange={setSortField}
              onDirectionChange={setSortDirection}
              showDirectionInTrigger={false}
            />
            <DashboardExportMenu
              items={[
                {
                  id: "csv",
                  label: "Export current view · CSV",
                  onSelect: () => {
                    const csv = ["item,sku,location,qty,minimum,status", ...grouped.map((row) =>
                      [row.item, row.sku, row.place, row.qty, row.minimum, row.status].join(","),
                    )].join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "inventory.csv";
                    link.click();
                    URL.revokeObjectURL(url);
                  },
                },
              ]}
            />
          </>
        }
      />

      {view === "item" ? (
        <DashboardDataTable columns={columns} rows={grouped} getRowId={(row) => `${row.placeId}-${row.id}`} />
      ) : (
        <div className="space-y-4">
          {locationGroups.map(([name, rows]) => (
            <section key={name} className="space-y-2">
              <h2 className="font-sans text-[11px] uppercase text-[#959597]">
                {name} · {rows.length} {rows.length === 1 ? "LINE" : "LINES"}
              </h2>
              <DashboardDataTable columns={columns} rows={rows} getRowId={(row) => `${row.placeId}-${row.id}`} />
            </section>
          ))}
        </div>
      )}

      <DashboardModal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Status</span>
            <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">ANY</option>
              <option>CRITICAL</option>
              <option>LOW</option>
              <option>STOCKED</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Location</span>
            <select className={field} value={place} onChange={(e) => setPlace(e.target.value)}>
              <option value="">ANY</option>
              {[...new Set(lines.map((line) => line.place))].map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>
      </DashboardModal>

      <DashboardModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add item"
        footer={<DashboardToolbarButton onClick={() => void addItem()}>Save item</DashboardToolbarButton>}
      >
        <div className="grid gap-3">
          <select className={field} value={draft.placeId} onChange={(e) => setDraft({ ...draft, placeId: e.target.value })}>
            <option value="">SELECT LOCATION</option>
            {places.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          <input className={field} placeholder="ITEM" value={draft.item} onChange={(e) => setDraft({ ...draft, item: e.target.value })} />
          <input className={field} placeholder="SKU" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
          <input className={field} placeholder="QTY" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} />
          <input className={field} placeholder="MINIMUM" value={draft.minimum} onChange={(e) => setDraft({ ...draft, minimum: e.target.value })} />
          <input className={field} placeholder="UNIT" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
          <input className={field} placeholder="PREFERRED VENDOR" value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} />
        </div>
      </DashboardModal>

      <DashboardModal
        open={Boolean(adjust)}
        onClose={() => setAdjust(null)}
        title="Adjust count"
        footer={
          <DashboardToolbarButton
            onClick={() => {
              if (!adjust) return;
              void fleetApi
                .updateTruckInventory(adjust.placeId, adjust.id, { qty: Number(qty) || 0 })
                .then(load)
                .then(() => {
                  setAdjust(null);
                  toastSuccess("Count updated");
                })
                .catch(toastApiError);
            }}
          >
            Save count
          </DashboardToolbarButton>
        }
      >
        <input className={field} value={qty} onChange={(e) => setQty(e.target.value)} />
      </DashboardModal>
    </div>
  );
}
