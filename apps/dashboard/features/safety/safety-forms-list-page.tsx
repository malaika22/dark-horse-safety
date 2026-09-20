"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import { safetyApi, type SafetyFormListItem } from "@/lib/safety-api";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import {
  OpsLoadFailedState,
  OpsLoadingListState,
} from "@/features/operations/operations-states";

const columns: DashboardDataTableColumn<SafetyFormListItem>[] = [
  {
    id: "code",
    header: "Code",
    cell: (row) => (
      <span className="font-sans text-[12px] uppercase text-[#959597]">
        {row.code}
      </span>
    ),
  },
  {
    id: "title",
    header: "Form",
    cell: (row) => (
      <Link
        href={`/safety/forms/${row.id}`}
        className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:text-[#3B82F6]"
      >
        {row.title}
      </Link>
    ),
  },
  {
    id: "version",
    header: "Version",
    cell: (row) => (
      <span className="font-sans text-[12px] uppercase text-[#959597]">
        {row.version}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => (
      <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
        {row.status}
      </span>
    ),
  },
  {
    id: "subs",
    header: "Submissions",
    cell: (row) => (
      <span className="font-sans text-[12px] uppercase text-[#959597]">
        {row.submissionCount}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: (row) => (
      <div className="flex justify-end gap-2">
        <Link
          href={`/safety/forms/${row.id}`}
          className="rounded-md border border-[#3E3E3E] px-2.5 py-1 font-sans text-[10px] uppercase text-[#FDFDFF] hover:bg-[#2A2A2A]"
        >
          Edit
        </Link>
        <Link
          href={`/safety/forms/${row.id}/preview`}
          className="rounded-md border border-[#3E3E3E] px-2.5 py-1 font-sans text-[10px] uppercase text-[#FDFDFF] hover:bg-[#2A2A2A]"
        >
          Preview
        </Link>
      </div>
    ),
  },
];

export function SafetyFormsListPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<SafetyFormListItem[]>([]);

  useSetHeaderBreadcrumb("Safety & Compliance / Forms");
  useSetHeaderActions(null, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await safetyApi.listForms();
      setItems(res.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load forms");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <OpsLoadingListState />;
  if (error)
    return <OpsLoadFailedState description={error} onRetry={load} />;

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-5">
      <DashboardDataTable
        columns={columns}
        rows={items}
        getRowId={(r) => r.id}
      />
    </div>
  );
}
