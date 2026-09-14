"use client";

import * as React from "react";
import {
  DashboardDataTable,
  DashboardPanel,
  DashboardPanelTitle,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { toastApiError } from "@/lib/toast";

type CycleRow = {
  id: string;
  code: string;
  label: string;
  startDate: string;
};

export default function PayCyclePage() {
  const [rows, setRows] = React.useState<CycleRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.lookups();
        if (cancelled) return;
        setRows(
          (res.data.payCycles ?? []).map((o) => ({
            id: o.value,
            code: o.value,
            label: o.label,
            startDate: o.value,
          })),
        );
      } catch (err) {
        toastApiError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns: DashboardDataTableColumn<CycleRow>[] = [
    {
      id: "label",
      header: "Pay Cycle",
      className: "min-w-[280px]",
      cell: (row) => row.label,
    },
    {
      id: "start",
      header: "Start (ISO)",
      className: "min-w-[120px]",
      cell: (row) => row.startDate,
    },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="font-sans text-[18px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          Pay Cycle Setting
        </h1>
        <p className="mt-1 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597]">
          Biweekly cycles used by CRM pricing effective dates (read-only from
          PayCycle table).
        </p>
      </div>
      <DashboardPanel>
        <DashboardPanelTitle title="Active cycles" />
        {loading ? (
          <p className="px-4 py-6 font-sans text-[12px] uppercase text-[#959597]">
            Loading…
          </p>
        ) : (
          <DashboardDataTable
            columns={columns}
            rows={rows}
            emptyMessage="No pay cycles found — run API seed"
            getRowId={(r) => r.id}
          />
        )}
      </DashboardPanel>
    </div>
  );
}
