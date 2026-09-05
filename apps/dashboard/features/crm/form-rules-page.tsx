"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardBulkSelectBar,
  DashboardDataTable,
  DashboardExportMenu,
  DashboardListToolbar,
  DashboardModal,
  DashboardPagination,
  DashboardRowActionMenu,
  DashboardSaveNewViewModal,
  DashboardSaveViewsModal,
  DashboardSearchInput,
  DashboardSortMenu,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardTablePrimaryCell,
  DashboardToolbarButton,
  DashboardToolbarIcons,
  type DashboardDataTableColumn,
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import { crmApi, downloadCsv, downloadPdf, downloadXlsx } from "@/lib/crm-api";
import { mapFormRuleRow } from "@/lib/crm-mappers";
import { kpiCellsFromApi } from "@/lib/crm-ui";
import { useCrmList } from "@/lib/use-crm-list";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";
import { useCrmSavedViews } from "@/lib/use-crm-saved-views";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmListLoadGate } from "@/features/crm/crm-list-skeleton";
import { CrmHistoryModal, CrmPickModal } from "./crm-action-modals";
import { FORM_RULES_KPI_SHELL, FORM_RULES_SORT_OPTIONS } from "./crm-constants";
import type { FormRuleRow } from "./crm-types";

type FormRuleFilters = {
  customer: string;
  form: string;
  jobType: string;
  hardGate: boolean;
  payrollBlocking: boolean;
};

const DEFAULT_FILTERS: FormRuleFilters = {
  customer: "",
  form: "",
  jobType: "",
  hardGate: false,
  payrollBlocking: false,
};

function FilterCheckMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M9 5h6l1 2h3v13a1 1 0 01-1 1H6a1 1 0 01-1-1V7h3l1-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <rect
        x="9"
        y="3"
        width="6"
        height="3.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function FilterChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FilterSelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 shrink truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <div className="relative min-w-0 max-w-[200px] flex-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full appearance-none rounded-md border-0 bg-[#2A2A2A] py-0 pl-2.5 pr-8 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
        >
          <option value="" />
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#FDFDFF]">
          <FilterChevronIcon />
        </span>
      </div>
    </div>
  );
}

function FilterToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {label}
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]"
        }`}
      >
        <span
          className={`absolute h-3.5 w-3.5 rounded-full shadow transition-transform ${
            checked
              ? "translate-x-[18px] bg-[#1A1A1A]"
              : "translate-x-1 bg-[#FDFDFF]"
          }`}
        />
      </button>
    </div>
  );
}

function FormRulesFiltersDrawer({
  open,
  onClose,
  value,
  onChange,
  onApply,
  onClearAll,
  customerOptions,
  formOptions,
  jobTypeOptions,
}: {
  open: boolean;
  onClose: () => void;
  value: FormRuleFilters;
  onChange: (f: FormRuleFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
  customerOptions: { value: string; label: string }[];
  formOptions: { value: string; label: string }[];
  jobTypeOptions: { value: string; label: string }[];
}) {
  function patch(p: Partial<FormRuleFilters>) {
    onChange({ ...value, ...p });
  }

  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close filters backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="absolute inset-y-0 right-0 flex w-full max-w-[360px] flex-col border-l border-[#2D2D30] bg-[#0D0D0D] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2D2D30] px-5 py-4">
          <h2 className="font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
            Filters
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#FDFDFF] transition-colors hover:bg-white/5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <FilterSelectRow
            label="Customer"
            value={value.customer}
            options={customerOptions}
            onChange={(v) => patch({ customer: v })}
          />
          <FilterSelectRow
            label="Form"
            value={value.form}
            options={formOptions}
            onChange={(v) => patch({ form: v })}
          />
          <FilterSelectRow
            label="Job Type"
            value={value.jobType}
            options={jobTypeOptions}
            onChange={(v) => patch({ jobType: v })}
          />
          <FilterToggleRow
            label="Hard Gate"
            checked={value.hardGate}
            onChange={(v) => patch({ hardGate: v })}
          />
          <FilterToggleRow
            label="Payroll Blocking"
            checked={value.payrollBlocking}
            onChange={(v) => patch({ payrollBlocking: v })}
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#2D2D30] px-5 py-4">
          <DashboardToolbarButton onClick={onClose}>Close</DashboardToolbarButton>
          <div className="flex items-center gap-2">
            <DashboardToolbarButton onClick={onClearAll}>
              Clear All
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              onClick={() => {
                onApply();
                onClose();
              }}
            >
              Apply
            </DashboardToolbarButton>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}


export function FormRulesPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [sortField, setSortField] = React.useState("customer");
  const [sortDirection, setSortDirection] =
    React.useState<DashboardSortDirection>("asc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] =
    React.useState<FormRuleFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    React.useState<FormRuleFilters>(DEFAULT_FILTERS);
  const [filtersApplied, setFiltersApplied] = React.useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewViewOpen, setSaveNewViewOpen] = React.useState(false);
  const [copyPickOpen, setCopyPickOpen] = React.useState(false);
  const [copyRuleId, setCopyRuleId] = React.useState<string | null>(null);
  const [copyExcludeCustomerId, setCopyExcludeCustomerId] = React.useState<
    string | undefined
  >();
  const [testPickOpen, setTestPickOpen] = React.useState(false);
  const [testRuleId, setTestRuleId] = React.useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyTitle, setHistoryTitle] = React.useState("Form Rule History");
  const [historyEvents, setHistoryEvents] = React.useState<
    { id: string; at: string; label: string; detail?: string }[]
  >([]);
  const [templateOpen, setTemplateOpen] = React.useState(false);
  const [templateTitle, setTemplateTitle] = React.useState("Form Template");
  const [templateForm, setTemplateForm] = React.useState("");
  const [templateJobType, setTemplateJobType] = React.useState("");
  const {
    savedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
  } = useCrmSavedViews("FORM_RULES");

  const { lookups, customers } = useCrmLookups({ includeLocations: false });
  const formOptions = lookupOptions(lookups, "formTemplates");
  const jobTypeOptions = lookupOptions(lookups, "jobTypes");

  const extraParams = React.useMemo(() => {
    if (!filtersApplied) return undefined;
    const params: Record<string, string | boolean | undefined> = {};
    if (appliedFilters.customer) params.customerId = appliedFilters.customer;
    if (appliedFilters.form) params.formTemplate = appliedFilters.form;
    if (appliedFilters.jobType) params.jobType = appliedFilters.jobType;
    if (appliedFilters.hardGate) params.hardGate = true;
    return Object.keys(params).length ? params : undefined;
  }, [appliedFilters, filtersApplied]);

  const { rows, total, kpiData, loading, initialLoading, reload } = useCrmList({
    list: (p) => crmApi.listFormRules(p),
    mapRow: mapFormRuleRow,
    kpi: () => crmApi.formRulesKpi(),
    q: query,
    page,
    pageSize,
    sort: sortField,
    direction: sortDirection,
    extraParams,
  });

  const kpiCells = React.useMemo(
    () => kpiCellsFromApi(FORM_RULES_KPI_SHELL, kpiData),
    [kpiData],
  );

  const bulkOpen = selectedIds.length > 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  React.useEffect(() => { setPage(1); }, [query, sortField, sortDirection, pageSize, filtersApplied]);

  function currentViewPayload() {
    return {
      filters: appliedFilters,
      sortField,
      sortDirection,
      query,
      filtersApplied,
    };
  }

  function applySavedViewPayload(payload: unknown) {
    if (!payload || typeof payload !== "object") return;
    const p = payload as {
      filters?: FormRuleFilters;
      sortField?: string;
      sortDirection?: DashboardSortDirection;
      query?: string;
      filtersApplied?: boolean;
    };
    if (p.filters) {
      const nextFilters = { ...DEFAULT_FILTERS, ...p.filters };
      setAppliedFilters(nextFilters);
      setDraftFilters(nextFilters);
      setFiltersApplied(
        p.filtersApplied ??
          Object.values(nextFilters).some((v) =>
            typeof v === "boolean" ? v : Boolean(v),
          ),
      );
    } else if (typeof p.filtersApplied === "boolean") {
      setFiltersApplied(p.filtersApplied);
    }
    if (typeof p.sortField === "string") setSortField(p.sortField);
    if (p.sortDirection === "asc" || p.sortDirection === "desc") {
      setSortDirection(p.sortDirection);
    }
    if (typeof p.query === "string") setQuery(p.query);
  }

  async function runExport(opts?: {
    format?: "csv" | "pdf" | "xlsx";
    selectedOnly?: boolean;
  }) {
    try {
      if (opts?.selectedOnly && selectedIds.length === 0) {
        toastApiError(new Error("Select at least one form rule to export"));
        return;
      }
      const format = opts?.format ?? "csv";
      const res = await crmApi.exportFormRules({
        q: query || undefined,
        sort: sortField,
        direction: sortDirection,
        format: format === "csv" ? undefined : format,
        ids: opts?.selectedOnly ? selectedIds.join(",") : undefined,
        ...extraParams,
      });
      if (format === "pdf") {
        if (!res.data.pdf) throw new Error("No PDF");
        downloadPdf(res.data.pdf, res.data.filename);
        toastSuccess("PDF downloaded");
        return;
      }
      if (format === "xlsx") {
        if (!res.data.xlsx) throw new Error("No Excel file");
        downloadXlsx(res.data.xlsx, res.data.filename);
        toastSuccess("Excel downloaded");
        return;
      }
      if (!res.data.csv) throw new Error("No CSV");
      downloadCsv(res.data.csv, res.data.filename);
      toastSuccess("Export downloaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleArchive(id: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete this form rule?")
    ) {
      return;
    }
    try {
      await crmApi.archiveFormRule(id);
      toastSuccess("Form rule deleted");
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleBulkDelete() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete ${selectedIds.length} form rule(s)?`)
    ) {
      return;
    }
    try {
      await crmApi.bulkDeleteFormRules(selectedIds);
      toastSuccess("Form rules deleted");
      setSelectedIds([]);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  }

  function openCopyPicker(id: string, currentCustomerId?: string) {
    setCopyRuleId(id);
    setCopyExcludeCustomerId(currentCustomerId);
    setCopyPickOpen(true);
  }

  async function handleCopyConfirm(customerId: string) {
    if (!copyRuleId) return;
    try {
      await crmApi.copyFormRuleToCustomer(copyRuleId, customerId);
      const name =
        customers.find((c) => c.value === customerId)?.label ?? "customer";
      toastSuccess(`Copied to ${name}`);
      reload();
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  function openTestPicker(id: string) {
    setTestRuleId(id);
    setTestPickOpen(true);
  }

  async function handleTestConfirm(jobType: string) {
    if (!testRuleId) return;
    try {
      const res = await crmApi.testFormRule(testRuleId, jobType);
      const { matches, reason } = res.data;
      toastSuccess(
        matches
          ? `Match · ${reason}`
          : `No match · ${reason}`,
      );
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  async function handleViewHistory(id: string, label?: string) {
    try {
      const res = await crmApi.formRuleHistory(id);
      setHistoryTitle(label ? `History · ${label}` : "Form Rule History");
      setHistoryEvents(res.data.events ?? []);
      setHistoryOpen(true);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function handleViewTemplate(row: FormRuleRow) {
    try {
      let formTemplate = row.formTemplate;
      let jobType = row.jobType;
      if (!formTemplate || formTemplate === "—") {
        const res = await crmApi.getFormRule(row.id);
        formTemplate = res.data.formTemplate || "—";
        jobType = res.data.jobType ?? res.data.appliesTo ?? jobType;
      }
      setTemplateTitle(formTemplate);
      setTemplateForm(formTemplate);
      setTemplateJobType(jobType || "—");
      setTemplateOpen(true);
    } catch (err) {
      toastApiError(err);
    }
  }

  const copyOptions = React.useMemo(
    () =>
      customers
        .filter((c) => c.value !== copyExcludeCustomerId)
        .map((c) => ({ value: c.value, label: c.label })),
    [customers, copyExcludeCustomerId],
  );

  const testJobTypeOptions = React.useMemo(
    () => jobTypeOptions.map((o) => ({ value: o.value, label: o.label })),
    [jobTypeOptions],
  );

  const columns: DashboardDataTableColumn<FormRuleRow>[] = React.useMemo(
    () => [
      {
        id: "customer",
        header: "Customer",
        className: "min-w-[180px] max-w-[240px]",
        cell: (row) => (
          <DashboardTablePrimaryCell
            title={row.customer}
            subtitle={row.code}
            underline
          />
        ),
      },
      {
        id: "template",
        header: "Form Template",
        className: "min-w-[160px]",
        cell: (row) => row.formTemplate,
      },
      {
        id: "status",
        header: "Status",
        className: "min-w-[110px]",
        cell: (row) => (
          <DashboardBadge
            variant={row.status.variant}
            pill
            className="max-w-full"
          >
            {row.status.label}
          </DashboardBadge>
        ),
      },
      {
        id: "trigger",
        header: "Trigger",
        className: "min-w-[120px] hidden md:table-cell",
        cell: (row) => row.trigger,
      },
      {
        id: "hardGate",
        header: "Hard-Gate",
        className: "min-w-[90px] hidden lg:table-cell",
        cell: (row) => row.hardGate,
      },
      {
        id: "appliesTo",
        header: "Applies To",
        className: "min-w-[110px] hidden lg:table-cell",
        cell: (row) => row.appliesTo,
      },
      {
        id: "version",
        header: "Version",
        className: "min-w-[80px] hidden xl:table-cell",
        cell: (row) => row.version,
      },
      {
        id: "owner",
        header: "Owner",
        className: "min-w-[110px] hidden xl:table-cell",
        cell: (row) => row.owner,
      },
      {
        id: "actions",
        header: "",
        className: "w-12",
        cell: (row) => (
          <DashboardRowActionMenu
            items={[
              {
                id: "edit",
                label: "Edit Rule",
                onSelect: () =>
                  router.push(`/crm/form-rules/${row.id}/edit`),
              },
              {
                id: "view-tpl",
                label: "View Form Template",
                onSelect: () => void handleViewTemplate(row),
              },
              {
                id: "test",
                label: "Test Rule Against a Job Type",
                onSelect: () => openTestPicker(row.id),
              },
              {
                id: "copy",
                label: "Copy Rules to Another Customer",
                onSelect: () => openCopyPicker(row.id, row.customerId),
              },
              {
                id: "history",
                label: "View History",
                onSelect: () => void handleViewHistory(row.id, row.customer),
              },
              {
                id: "delete",
                label: "Delete Rule",
                destructive: true,
                onSelect: () => void handleArchive(row.id),
              },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  return (
    <CrmListLoadGate loading={loading} hasData={!initialLoading} kpiCount={4}>
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {kpiCells.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      {bulkOpen ? (
        <DashboardBulkSelectBar
          selectedCount={selectedIds.length}
          actions={
            <>
              <DashboardToolbarButton
                className="!border-[#4B212B] !bg-[#3D1F1F] !text-[#FFBBCA]"
                onClick={() => void handleBulkDelete()}
              >
                Delete
              </DashboardToolbarButton>
              <DashboardExportMenu
                triggerLabel="Export selected"
                items={[
                  { id: "selected-csv", label: "Export selected view • CSV", onSelect: () => void runExport({ selectedOnly: true }) },
                  { id: "all-csv", label: "Export all • CSV", onSelect: () => void runExport() },
                  {
                    id: "xlsx",
                    label: "Export as Excel",
                    onSelect: () => void runExport({ format: "xlsx", selectedOnly: true }),
                  },
                  {
                    id: "pdf",
                    label: "Export as PDF",
                    onSelect: () => void runExport({ format: "pdf", selectedOnly: true }),
                  },
                ]}
              />
            </>
          }
        />
      ) : (
        <DashboardListToolbar
          search={
            <DashboardSearchInput
              placeholder="Search Form Rules"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          }
          filters={
            <DashboardToolbarButton
              leftIcon={<DashboardToolbarIcons.Filter className="shrink-0" />}
              rightIcon={
                <FilterCheckMarkIcon className="shrink-0 text-[#959597]" />
              }
              onClick={() => {
                setDraftFilters(appliedFilters);
                setFiltersOpen(true);
              }}
            >
              Filter
            </DashboardToolbarButton>
          }
          actions={
            <>
              <DashboardSortMenu
                options={FORM_RULES_SORT_OPTIONS}
                field={sortField}
                direction={sortDirection}
                onFieldChange={setSortField}
                onDirectionChange={setSortDirection}
                showDirectionInTrigger={false}
              />
              <DashboardToolbarButton
                leftIcon={<ClipboardIcon className="shrink-0" />}
                onClick={() => setSavedViewsOpen(true)}
              >
                Payroll Review
              </DashboardToolbarButton>
              <DashboardExportMenu
                items={[
                  { id: "view-csv", label: "Export current view • CSV", onSelect: () => void runExport() },
                  { id: "all-csv", label: "Export all • CSV", onSelect: () => void runExport() },
                  {
                    id: "xlsx",
                    label: "Export as Excel",
                    onSelect: () => void runExport({ format: "xlsx" }),
                  },
                  {
                    id: "pdf",
                    label: "Export as PDF",
                    onSelect: () => void runExport({ format: "pdf" }),
                  },
                ]}
              />
            </>
          }
        />
      )}

      <DashboardDataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        emptyMessage="No form rules found"
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRowClick={(row) => router.push(`/crm/form-rules/${row.id}/edit`)}
      />

      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <FormRulesFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setFiltersApplied(true);
        }}
        onClearAll={() => {
          setDraftFilters(DEFAULT_FILTERS);
          setAppliedFilters(DEFAULT_FILTERS);
          setFiltersApplied(false);
        }}
        customerOptions={customers}
        formOptions={formOptions}
        jobTypeOptions={jobTypeOptions}
      />

      <DashboardSaveViewsModal
        open={savedViewsOpen}
        onClose={() => setSavedViewsOpen(false)}
        views={savedViews}
        activeViewId={activeViewId}
        onSelectView={(viewId) => {
          setActiveViewId(viewId);
          const view = savedViews.find((v) => v.id === viewId);
          if (view?.payload != null) applySavedViewPayload(view.payload);
        }}
        onSaveNewView={() => setSaveNewViewOpen(true)}
        onViewAction={(viewId, action) => {
          if (action === "delete") void deleteView(viewId);
          if (action === "duplicate") {
            const source = savedViews.find((v) => v.id === viewId);
            if (source) {
              void createView(
                `${source.label} copy`,
                (source.payload as Record<string, unknown> | undefined) ??
                  currentViewPayload(),
              );
            }
          }
        }}
      />

      <DashboardSaveNewViewModal
        open={saveNewViewOpen}
        onClose={() => setSaveNewViewOpen(false)}
        onConfirm={({ name }) => {
          void createView(name, currentViewPayload());
        }}
      />

      <CrmPickModal
        open={copyPickOpen}
        title="Copy Rule to Customer"
        label="Customer"
        options={copyOptions}
        confirmLabel="Copy"
        onClose={() => {
          setCopyPickOpen(false);
          setCopyRuleId(null);
        }}
        onConfirm={handleCopyConfirm}
      />

      <CrmPickModal
        open={testPickOpen}
        title="Test Rule Against Job Type"
        label="Job Type"
        options={testJobTypeOptions}
        confirmLabel="Run test"
        onClose={() => {
          setTestPickOpen(false);
          setTestRuleId(null);
        }}
        onConfirm={handleTestConfirm}
      />

      <CrmHistoryModal
        open={historyOpen}
        title={historyTitle}
        events={historyEvents}
        onClose={() => setHistoryOpen(false)}
      />

      <DashboardModal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        title="Form Template"
        widthClassName="max-w-lg"
        footer={
          <DashboardToolbarButton onClick={() => setTemplateOpen(false)}>
            Close
          </DashboardToolbarButton>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">Template</p>
            <p className="mt-1 font-sans text-[13px] uppercase text-[#FDFDFF]">
              {templateForm || templateTitle || "—"}
            </p>
          </div>
          <div>
            <p className="font-sans text-[10px] uppercase text-[#959597]">Job Type</p>
            <p className="mt-1 font-sans text-[13px] uppercase text-[#FDFDFF]">
              {templateJobType || "—"}
            </p>
          </div>
        </div>
      </DashboardModal>
    </div>
    </CrmListLoadGate>
  );
}
