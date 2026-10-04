"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardDataTable,
  DashboardListToolbar,
  DashboardModal,
  DashboardPagination,
  DashboardSearchInput,
  DashboardSelectField,
  DashboardTextField,
  DashboardToolbarButton,
  cn,
  type DashboardDataTableColumn,
} from "@dark-horse-safety/ui";
import {
  operationsApi,
  type RecurringSeriesOptions,
  type RecurringWorkOrderSeries,
} from "@/lib/operations-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
} from "@/features/app-shell/header-actions-context";
import {
  OpsLoadFailedState,
  OpsLoadingListState,
} from "@/features/operations/operations-states";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";

type StatusFilter = "ALL" | "ACTIVE" | "ENDED";

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NewSeriesModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [options, setOptions] = React.useState<RecurringSeriesOptions | null>(
    null,
  );
  const [customerId, setCustomerId] = React.useState("");
  const [jobType, setJobType] = React.useState("FIRE WATCH");
  const [frequency, setFrequency] = React.useState<
    "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY"
  >("MONTHLY");
  const [remaining, setRemaining] = React.useState("12");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setCustomerId("");
    setJobType("FIRE WATCH");
    setFrequency("MONTHLY");
    setRemaining("12");
    void (async () => {
      try {
        const res = await operationsApi.recurringSeriesOptions();
        setOptions(res.data);
        if (res.data.customers[0]) setCustomerId(res.data.customers[0].value);
      } catch (err) {
        toastApiError(err);
      }
    })();
  }, [open]);

  async function submit() {
    if (!customerId) {
      toastApiError(new Error("Customer is required"));
      return;
    }
    setBusy(true);
    try {
      await operationsApi.createRecurringSeries({
        customerId,
        jobType,
        frequency,
        remainingCount: Number(remaining) || 0,
        nextOccurrence: new Date().toISOString(),
      });
      toastSuccess("Series created");
      onCreated();
      onClose();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="New Series"
      widthClassName="max-w-[480px]"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF] disabled:opacity-50"
          >
            Cancel
          </button>
          <PayrollPrimaryButton disabled={busy} onClick={() => void submit()}>
            Create Series
          </PayrollPrimaryButton>
        </div>
      }
    >
      <div className="space-y-4 px-1">
        <DashboardSelectField
          label="Customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          options={[
            { value: "", label: "Select customer…" },
            ...(options?.customers ?? []),
          ]}
        />
        <DashboardSelectField
          label="Job Type"
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
          options={options?.jobTypes ?? []}
        />
        <DashboardSelectField
          label="Frequency"
          value={frequency}
          onChange={(e) =>
            setFrequency(
              e.target.value as
                | "WEEKLY"
                | "FORTNIGHTLY"
                | "MONTHLY"
                | "QUARTERLY"
                | "ANNUALLY",
            )
          }
          options={options?.frequencies ?? []}
        />
        <DashboardTextField
          label="Remaining Occurrences"
          type="number"
          min={0}
          value={remaining}
          onChange={(e) => setRemaining(e.target.value)}
        />
      </div>
    </DashboardModal>
  );
}

export function RecurringSeriesPage() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [rows, setRows] = React.useState<RecurringWorkOrderSeries[]>([]);
  const [total, setTotal] = React.useState(0);
  const [summaryLabel, setSummaryLabel] = React.useState("0 SERIES · 0 ACTIVE");
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [createOpen, setCreateOpen] = React.useState(false);

  useSetHeaderActions(null, []);

  const refresh = React.useCallback(() => setReloadKey((k) => k + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const res = await operationsApi.listRecurringSeries({
          q: q || undefined,
          status: status === "ALL" ? undefined : status,
          page,
          pageSize,
        });
        if (cancelled) return;
        setRows(res.data.items);
        setTotal(res.data.total);
        setSummaryLabel(
          res.summary?.label ??
            `${res.data.total} SERIES · ${res.summary?.active ?? 0} ACTIVE`,
        );
      } catch (err) {
        if (!cancelled) {
          setLoadError("Couldn't load recurring series.");
          setRows([]);
          setTotal(0);
          toastApiError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, status, page, pageSize, reloadKey]);

  const columns = React.useMemo<
    DashboardDataTableColumn<RecurringWorkOrderSeries>[]
  >(
    () => [
      {
        id: "code",
        header: "Series",
        className: "min-w-[100px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {row.code}
          </span>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        className: "min-w-[180px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {row.customerName}
          </span>
        ),
      },
      {
        id: "jobType",
        header: "Job Type",
        className: "min-w-[180px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
            {row.jobType}
          </span>
        ),
      },
      {
        id: "frequency",
        header: "Frequency",
        className: "min-w-[110px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
            {row.frequency}
          </span>
        ),
      },
      {
        id: "next",
        header: "Next Occurrence",
        className: "min-w-[130px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
            {row.status === "ENDED" ? "—" : (row.nextOccurrenceLabel ?? "—")}
          </span>
        ),
      },
      {
        id: "generated",
        header: "Generated",
        className: "min-w-[90px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
            {row.generatedCount}
          </span>
        ),
      },
      {
        id: "remaining",
        header: "Remaining",
        className: "min-w-[90px]",
        cell: (row) => (
          <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
            {row.status === "ENDED" ? 0 : row.remainingCount}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[90px]",
        cell: (row) => {
          const active = row.status === "ACTIVE";
          return (
            <span
              className={cn(
                "font-sans text-[12px] uppercase tracking-[-0.02em]",
                active ? "text-[#22C55E]" : "text-[#6F6F72]",
              )}
            >
              {row.status}
            </span>
          );
        },
      },
    ],
    [],
  );

  const filters: StatusFilter[] = ["ALL", "ACTIVE", "ENDED"];
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-sans text-[22px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          Recurring Work Order Series
        </h1>
        <DashboardToolbarButton
          variant="primary"
          leftIcon={<PlusIcon />}
          onClick={() => setCreateOpen(true)}
        >
          New Series
        </DashboardToolbarButton>
      </div>

      <DashboardListToolbar
        search={
          <DashboardSearchInput
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search series or customer…"
          />
        }
        filters={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setStatus(f);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] transition-colors",
                    status === f
                      ? "bg-[#2A2A2A] text-[#FDFDFF]"
                      : "border border-[#3E3E3E] bg-transparent text-[#959597] hover:text-[#FDFDFF]",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#6F6F72]">
              {summaryLabel}
            </p>
          </div>
        }
      />

      {loading ? (
        <OpsLoadingListState />
      ) : loadError ? (
        <OpsLoadFailedState description={loadError} onRetry={refresh} />
      ) : (
        <>
          <DashboardDataTable
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            onRowClick={(row) =>
              router.push(`/operations/recurring-series/${row.id}`)
            }
            emptyMessage="No recurring series match this filter."
          />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#6F6F72]">
              Showing {from}–{to} of {total} series
            </p>
            <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#6F6F72]">
              Select a series to view settings and occurrences ›
            </p>
          </div>
          {total > pageSize ? (
            <DashboardPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          ) : null}
        </>
      )}

      <NewSeriesModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refresh}
      />
    </div>
  );
}
