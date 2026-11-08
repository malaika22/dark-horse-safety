"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardModal,
  DashboardSearchInput,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { fleetApi, type FleetAsset } from "@/lib/fleet-api";
import { fleetBadgeTone } from "./fleet-ui";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";

const field =
  "h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none";

function lateDays(due?: string | null) {
  if (!due) return 0;
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

export function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<FleetAsset[]>([]);
  const [people, setPeople] = React.useState<string[]>([]);
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [target, setTarget] = React.useState<FleetAsset | null>(null);
  const [technician, setTechnician] = React.useState("");
  const [due, setDue] = React.useState("");
  const [reference, setReference] = React.useState("");

  const load = React.useCallback(async () => {
    const [assets, trucks] = await Promise.all([
      fleetApi.listAssets(),
      fleetApi.trucksOverview(),
    ]);
    setRows(assets.data.items);
    setPeople(trucks.data.employees.map((person) => person.name).filter(Boolean));
  }, []);

  React.useEffect(() => {
    void load()
      .catch(toastApiError)
      .finally(() => setLoading(false));
  }, [load]);

  const filtered = rows.filter((row) => {
    const blob = `${row.assetCode} ${row.assetLabel} ${row.holder ?? ""} ${row.parentTruck ?? ""} ${row.checkoutRef ?? ""}`.toLowerCase();
    return blob.includes(q.trim().toLowerCase());
  });
  const checkedOut = filtered.filter((row) => row.status === "CHECKED_OUT");
  const overdue = checkedOut.filter((row) => lateDays(row.checkoutDue) > 0);
  const out = checkedOut.filter((row) => lateDays(row.checkoutDue) <= 0);
  const returned = filtered
    .filter((row) => row.status !== "CHECKED_OUT" && row.lastCheckInAt)
    .sort((a, b) => String(b.lastCheckInAt).localeCompare(String(a.lastCheckInAt)));
  const returnedCodes = new Set(returned.map((row) => row.assetCode));
  const available = filtered.filter(
    (row) =>
      (row.status === "READY" || row.status === "NEEDS_REVIEW") &&
      !returnedCodes.has(row.assetCode),
  );

  async function checkIn(row: FleetAsset) {
    setBusy(row.assetCode);
    try {
      await fleetApi.checkInAsset(row.assetCode);
      toastSuccess(`${row.assetCode} checked in`);
      await load();
    } catch (error) {
      toastApiError(error);
    } finally {
      setBusy(null);
    }
  }

  async function confirmCheckout() {
    if (!target || !technician.trim()) return;
    setBusy(target.assetCode);
    try {
      await fleetApi.checkoutAsset(target.assetCode, {
        technician,
        due: due || undefined,
        reference: reference || undefined,
      });
      toastSuccess(`${target.assetCode} checked out to ${technician.trim().toUpperCase()}`);
      setTarget(null);
      await load();
    } catch (error) {
      toastApiError(error);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <BrandLoader />;

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-sans text-[18px] font-semibold uppercase tracking-wide text-[#FDFDFF]">
          Checkout & check-in
        </h1>
        <DashboardToolbarButton
          onClick={() => {
            const first = available[0];
            if (!first) return;
            setTarget(first);
            setTechnician("");
            setDue("");
            setReference("");
          }}
        >
          Check out equipment
        </DashboardToolbarButton>
      </div>

      <DashboardStatGrid>
        <DashboardStatRow columns={3}>
          <DashboardStatCell title="Available in yard" value={String(available.length)} meta="READY TO ISSUE" />
          <DashboardStatCell title="Checked out" value={String(out.length)} meta="ON A TECHNICIAN" />
          <DashboardStatCell
            title="Overdue return"
            value={String(overdue.length)}
            meta={overdue[0]?.checkoutDue ? `OLDEST ${overdue[0].checkoutDue}` : "NONE PAST DUE"}
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      <DashboardSearchInput
        placeholder="Search asset, serial, or technician…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="grid gap-3 xl:grid-cols-4">
        <Column title="Available assets" count={available.length}>
          {available.map((row) => (
            <Card key={row.assetCode} row={row}>
              <DashboardToolbarButton
                disabled={busy === row.assetCode}
                onClick={() => {
                  setTarget(row);
                  setTechnician(row.holder ?? "");
                  setDue("");
                  setReference("");
                }}
              >
                Check out
              </DashboardToolbarButton>
            </Card>
          ))}
        </Column>
        <Column title="Checked out" count={out.length}>
          {out.map((row) => (
            <Card key={row.assetCode} row={row}>
              <div className="flex gap-2">
                <DashboardToolbarButton disabled={busy === row.assetCode} onClick={() => void checkIn(row)}>
                  Check in
                </DashboardToolbarButton>
                <button
                  type="button"
                  className="font-sans text-[11px] uppercase text-[#8EB4FF]"
                  onClick={() => {
                    setTarget(row);
                    setTechnician(row.holder ?? "");
                    setDue(row.checkoutDue ?? "");
                    setReference(row.checkoutRef ?? "");
                  }}
                >
                  Extend
                </button>
              </div>
            </Card>
          ))}
        </Column>
        <Column title="Overdue return" count={overdue.length}>
          {overdue.map((row) => (
            <Card key={row.assetCode} row={row} late={lateDays(row.checkoutDue)}>
              <div className="flex gap-2">
                <DashboardToolbarButton disabled={busy === row.assetCode} onClick={() => void checkIn(row)}>
                  Check in
                </DashboardToolbarButton>
                <button
                  type="button"
                  className="font-sans text-[11px] uppercase text-[#FF8A9A]"
                  onClick={() =>
                    void fleetApi
                      .reportMissing({
                        assetCode: row.assetCode,
                        assetLabel: row.assetLabel,
                        replacementValue: row.replacementValue ?? 0,
                        lastTruck: row.parentTruck ?? undefined,
                        lastHolder: row.holder ?? undefined,
                      })
                      .then(() => toastSuccess(`${row.assetCode} reported missing`))
                      .catch(toastApiError)
                  }
                >
                  Mark missing
                </button>
              </div>
            </Card>
          ))}
        </Column>
        <Column title="Returned / checked in" count={returned.length}>
          {returned.map((row) => (
            <Card key={row.assetCode} row={row}>
              <div className="flex gap-2">
                <DashboardToolbarButton
                  onClick={() => {
                    setTarget(row);
                    setTechnician("");
                    setDue("");
                    setReference("");
                  }}
                >
                  Check out
                </DashboardToolbarButton>
                <button
                  type="button"
                  className="font-sans text-[11px] uppercase text-[#8EB4FF]"
                  onClick={() => router.push(`/fleet/assets/${row.assetCode}`)}
                >
                  View
                </button>
              </div>
            </Card>
          ))}
        </Column>
      </div>

      <DashboardModal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target?.status === "CHECKED_OUT" ? "Extend checkout" : "Check out equipment"}
        footer={
          <DashboardToolbarButton disabled={busy != null || !technician.trim()} onClick={() => void confirmCheckout()}>
            {target?.status === "CHECKED_OUT" ? "Save return date" : "Check out"}
          </DashboardToolbarButton>
        }
      >
        <div className="space-y-3">
          <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
            {target?.assetCode} · {target?.assetLabel}
          </p>
          <label className="block space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Technician</span>
            <input className={field} list="checkout-people" value={technician} onChange={(e) => setTechnician(e.target.value)} />
            <datalist id="checkout-people">
              {people.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label className="block space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Return due</span>
            <input className={field} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="font-sans text-[10px] uppercase text-[#959597]">Work order or reference</span>
            <input className={field} value={reference} onChange={(e) => setReference(e.target.value)} />
          </label>
        </div>
      </DashboardModal>
    </div>
  );
}

function Column({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-sans text-[11px] uppercase tracking-wide text-[#959597]">
        {title} · {count}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Card({ row, late, children }: { row: FleetAsset; late?: number; children: React.ReactNode }) {
  return (
    <article className="space-y-2 rounded-xl border border-[#2D2D30] bg-[#141416] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-sans text-[12px] font-semibold uppercase text-[#FDFDFF]">{row.assetLabel}</p>
          <p className="font-sans text-[10px] uppercase text-[#959597]">{row.assetCode}</p>
        </div>
        <DashboardBadge variant={fleetBadgeTone(late ? "danger" : row.status === "CHECKED_OUT" ? "warning" : "success")}>
          {late ? "OVERDUE" : row.statusLabel}
        </DashboardBadge>
      </div>
      <p className="font-sans text-[10px] uppercase text-[#959597]">
        {[row.parentTruck, row.holder, row.equipmentType].filter(Boolean).join(" · ")}
      </p>
      {row.checkoutRef ? (
        <p className="font-sans text-[10px] uppercase text-[#8EB4FF]">{row.checkoutRef}</p>
      ) : null}
      {row.dailyRate != null ? (
        <p className="font-sans text-[10px] uppercase text-[#E8C547]">
          {row.rentalVendor || "RENTAL"} · ${row.dailyRate}/DAY
        </p>
      ) : null}
      {late ? (
        <p className="font-sans text-[10px] uppercase text-[#FF8A9A]">
          DUE {row.checkoutDue} · {late} DAYS LATE
        </p>
      ) : null}
      {children}
    </article>
  );
}
