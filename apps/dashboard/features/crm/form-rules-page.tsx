"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DashboardBadge,
  DashboardBulkSelectBar,
  DashboardDataTable,
  DashboardExportMenu,
  DashboardFilterChips,
  DashboardListToolbar,
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
  type DashboardSavedView,
  type DashboardSortDirection,
} from "@dark-horse-safety/ui";
import {
  FORM_RULES_KPI,
  FORM_RULES_ROWS,
  FORM_RULES_SAVED_VIEWS,
  FORM_RULES_SORT_OPTIONS,
  type FormRuleRow,
} from "./data/form-rules.mock";
import { PlusIcon } from "./crm-list-page-shell";

function sortRows(
  rows: FormRuleRow[],
  field: string,
  direction: DashboardSortDirection,
) {
  const dir = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (field) {
      case "status":     return a.status.label.localeCompare(b.status.label) * dir;
      case "template":   return a.formTemplate.localeCompare(b.formTemplate) * dir;
      case "trigger":    return a.trigger.localeCompare(b.trigger) * dir;
      case "hardGate":   return a.hardGate.localeCompare(b.hardGate) * dir;
      case "appliesTo":  return a.appliesTo.localeCompare(b.appliesTo) * dir;
      case "version":    return a.version.localeCompare(b.version) * dir;
      case "owner":      return a.owner.localeCompare(b.owner) * dir;
      case "customer":
      default:           return a.customer.localeCompare(b.customer) * dir;
    }
  });
}

export function FormRulesPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [sortField, setSortField] = React.useState("customer");
  const [sortDirection, setSortDirection] = React.useState<DashboardSortDirection>("asc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [chips, setChips] = React.useState<{ id: string; label: string }[]>([]);
  const [savedViewsOpen, setSavedViewsOpen] = React.useState(false);
  const [saveNewViewOpen, setSaveNewViewOpen] = React.useState(false);
  const [savedViews, setSavedViews] = React.useState<DashboardSavedView[]>(FORM_RULES_SAVED_VIEWS);
  const [activeViewId, setActiveViewId] = React.useState<string | null>("view-1");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = FORM_RULES_ROWS.filter((row) => {
      if (!q) return true;
      return [row.customer, row.code, row.formTemplate, row.owner].join(" ").toLowerCase().includes(q);
    });
    return sortRows(rows, sortField, sortDirection);
  }, [query, sortField, sortDirection]);

  const bulkOpen = selectedIds.length > 0;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  React.useEffect(() => { setPage(1); }, [query, sortField, sortDirection, pageSize]);

  const columns: DashboardDataTableColumn<FormRuleRow>[] = React.useMemo(
    () => [
      {
        id: "customer",
        header: "Customer",
        className: "min-w-[180px] max-w-[240px]",
        cell: (row) => (
          <DashboardTablePrimaryCell title={row.customer} subtitle={row.code} underline />
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
          <DashboardBadge variant={row.status.variant} pill className="max-w-full">
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
              { id: "edit",        label: "Edit Rule",                     onSelect: () => router.push(`/crm/form-rules/${row.id}/edit`) },
              { id: "view-tpl",    label: "View Form Template" },
              { id: "test",        label: "Test Rule Against a Job Type" },
              { id: "copy",        label: "Copy Rules to Another Customer" },
              { id: "delete",      label: "Delete Rule",                   destructive: true },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
          Required Form Rules
        </h1>
        <Link href="/crm/form-rules/new" className="inline-flex shrink-0">
          <DashboardToolbarButton variant="primary" leftIcon={<PlusIcon className="shrink-0" />}>
            Add Form Rule
          </DashboardToolbarButton>
        </Link>
      </div>

      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {FORM_RULES_KPI.map((cell) => (
            <DashboardStatCell key={cell.title} {...cell} />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      {bulkOpen ? (
        <DashboardBulkSelectBar
          selectedCount={selectedIds.length}
          actions={
            <>
              <DashboardToolbarButton className="!border-[#4B212B] !bg-[#3D1F1F] !text-[#FFBBCA]">
                Delete
              </DashboardToolbarButton>
              <DashboardExportMenu
                triggerLabel="Export selected"
                items={[
                  { id: "selected-csv", label: "Export selected view • CSV" },
                  { id: "all-csv",      label: "Export all • CSV" },
                  { id: "pdf",          label: "Export as PDF" },
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
            >
              {`Filter (${chips.length > 0 ? chips.length : "-"})`}
            </DashboardToolbarButton>
          }
          actions={
            <>
              <DashboardToolbarButton onClick={() => setSavedViewsOpen(true)}>
                Payroll Review
              </DashboardToolbarButton>
              <DashboardExportMenu
                items={[
                  { id: "view-csv", label: "Export current view • CSV" },
                  { id: "all-csv",  label: "Export all • CSV" },
                  { id: "pdf",      label: "Export as PDF" },
                ]}
              />
              <DashboardSortMenu
                options={FORM_RULES_SORT_OPTIONS}
                field={sortField}
                direction={sortDirection}
                onFieldChange={setSortField}
                onDirectionChange={setSortDirection}
              />
            </>
          }
          chips={
            chips.length > 0 ? (
              <DashboardFilterChips
                chips={chips}
                onRemove={(id) => setChips((prev) => prev.filter((c) => c.id !== id))}
                onClearAll={() => setChips([])}
              />
            ) : null
          }
        />
      )}

      <DashboardDataTable
        columns={columns}
        rows={pageRows}
        getRowId={(row) => row.id}
        emptyMessage="No form rules found"
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
      />

      <DashboardPagination
        page={safePage}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <DashboardSaveViewsModal
        open={savedViewsOpen}
        onClose={() => setSavedViewsOpen(false)}
        views={savedViews}
        activeViewId={activeViewId}
        onSelectView={setActiveViewId}
        onSaveNewView={() => setSaveNewViewOpen(true)}
        onViewAction={(viewId, action) => {
          if (action === "delete") {
            setSavedViews((prev) => prev.filter((v) => v.id !== viewId));
            if (activeViewId === viewId) setActiveViewId(null);
          }
          if (action === "duplicate") {
            const source = savedViews.find((v) => v.id === viewId);
            if (!source) return;
            const id = `view-${Date.now()}`;
            setSavedViews((prev) => [...prev, { id, label: `${source.label} copy` }]);
          }
        }}
      />

      <DashboardSaveNewViewModal
        open={saveNewViewOpen}
        onClose={() => setSaveNewViewOpen(false)}
        onConfirm={({ name }) => {
          const id = `view-${Date.now()}`;
          setSavedViews((prev) => [...prev, { id, label: name }]);
          setActiveViewId(id);
        }}
      />
    </div>
  );
}
