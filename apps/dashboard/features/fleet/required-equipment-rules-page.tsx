"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardBadge,
  DashboardListToolbar,
  DashboardModal,
  DashboardPagination,
  DashboardPanel,
  DashboardRowActionMenu,
  DashboardSearchInput,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import {
  fleetApi,
  type EquipmentRule,
  type EquipmentRuleGroup,
  type EquipmentRulesInsights,
  type EquipmentRulesKpiCell,
} from "@/lib/fleet-api";
import { crmApi } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { PayrollPrimaryButton } from "@/features/hr/payroll-resolve-modals";

function enforcementBadge(tone: string) {
  if (tone === "danger") return "error" as const;
  if (tone === "warning") return "warning" as const;
  return "neutral" as const;
}

function GhostBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg px-3 py-2 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#959597] transition-colors hover:text-[#FDFDFF] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function RequiredEquipmentRulesPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [kpi, setKpi] = React.useState<EquipmentRulesKpiCell[]>([]);
  const [groups, setGroups] = React.useState<EquipmentRuleGroup[]>([]);
  const [insights, setInsights] =
    React.useState<EquipmentRulesInsights | null>(null);
  const [q, setQ] = React.useState("");
  const [groupByJobType, setGroupByJobType] = React.useState(true);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [total, setTotal] = React.useState(0);

  const [addOpen, setAddOpen] = React.useState(false);
  const [editRule, setEditRule] = React.useState<EquipmentRule | null>(null);
  const [copyRule, setCopyRule] = React.useState<EquipmentRule | null>(null);
  const [overrideRule, setOverrideRule] =
    React.useState<EquipmentRule | null>(null);
  const [testRule, setTestRule] = React.useState<EquipmentRule | null>(null);
  const [affectedRule, setAffectedRule] =
    React.useState<EquipmentRule | null>(null);
  const [affectedItems, setAffectedItems] = React.useState<
    Array<{
      id: string;
      code: string;
      customerName: string;
      title: string;
      status: string;
    }>
  >([]);

  const [formEquipment, setFormEquipment] = React.useState("");
  const [formJobType, setFormJobType] = React.useState(
    "Confined Space Standby",
  );
  const [formQty, setFormQty] = React.useState(1);
  const [formPer, setFormPer] = React.useState("JOB");
  const [formEnforcement, setFormEnforcement] =
    React.useState("BLOCKS_DISPATCH");
  const [formSubstitutes, setFormSubstitutes] = React.useState("");
  const [copyJobType, setCopyJobType] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [customers, setCustomers] = React.useState<
    Array<{ id: string; name: string }>
  >([]);
  const [workOrders, setWorkOrders] = React.useState<
    Array<{ id: string; code: string }>
  >([]);
  const [testWoId, setTestWoId] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, kpiRes, insightsRes] = await Promise.all([
        fleetApi.listEquipmentRules({
          page,
          pageSize,
          q: q.trim() || undefined,
          sort: "jobType",
        }),
        fleetApi.equipmentRulesKpi(),
        fleetApi.equipmentRulesInsights(),
      ]);
      setGroups(listRes.data.groups ?? []);
      setTotal(listRes.data.total ?? 0);
      setKpi(kpiRes.data.cells ?? []);
      setInsights(insightsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    void (async () => {
      try {
        const [cust, wos] = await Promise.all([
          crmApi.listCustomers({ page: 1, pageSize: 50 }),
          crmApi.listWorkOrders({ page: 1, pageSize: 50 }),
        ]);
        setCustomers(
          (cust.data.items ?? []).map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
          })),
        );
        setWorkOrders(
          (wos.data.items ?? []).map((w: { id: string; code: string }) => ({
            id: w.id,
            code: w.code,
          })),
        );
      } catch {
        /* optional pickers */
      }
    })();
  }, []);

  function openAdd(jobType?: string) {
    setEditRule(null);
    setFormEquipment("");
    setFormJobType(jobType ?? "Confined Space Standby");
    setFormQty(1);
    setFormPer("JOB");
    setFormEnforcement("BLOCKS_DISPATCH");
    setFormSubstitutes("");
    setAddOpen(true);
  }

  function openEdit(rule: EquipmentRule) {
    setEditRule(rule);
    setFormEquipment(rule.equipment);
    setFormJobType(rule.jobType);
    setFormQty(rule.qty);
    setFormPer(rule.per);
    setFormEnforcement(rule.enforcement);
    setFormSubstitutes(rule.substitutes ?? "");
    setAddOpen(true);
  }

  async function saveRule() {
    if (!formEquipment.trim() || !formJobType.trim()) {
      toastApiError(new Error("Equipment and job type are required"));
      return;
    }
    setBusy(true);
    try {
      if (editRule) {
        await fleetApi.updateEquipmentRule(editRule.id, {
          equipment: formEquipment.trim(),
          jobType: formJobType.trim(),
          qty: formQty,
          per: formPer,
          enforcement: formEnforcement,
          substitutes: formSubstitutes.trim() || undefined,
        });
        toastSuccess("Rule updated");
      } else {
        await fleetApi.createEquipmentRule({
          equipment: formEquipment.trim(),
          jobType: formJobType.trim(),
          qty: formQty,
          per: formPer,
          enforcement: formEnforcement,
          substitutes: formSubstitutes.trim() || undefined,
        });
        toastSuccess("Rule created");
      }
      setAddOpen(false);
      await reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(rule: EquipmentRule) {
    setBusy(true);
    try {
      await fleetApi.deactivateEquipmentRule(rule.id);
      toastSuccess("Rule deactivated");
      await reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function submitCopy() {
    if (!copyRule || !copyJobType.trim()) return;
    setBusy(true);
    try {
      await fleetApi.copyEquipmentRule(copyRule.id, copyJobType.trim());
      toastSuccess(`Copied to ${copyJobType}`);
      setCopyRule(null);
      await reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function submitOverride() {
    if (!overrideRule || !customerId) return;
    setBusy(true);
    try {
      await fleetApi.addCustomerOverride(overrideRule.id, {
        customerId,
        qty: overrideRule.qty + 1,
      });
      toastSuccess("Customer override added");
      setOverrideRule(null);
      await reload();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function submitTest() {
    if (!testRule || !testWoId) return;
    setBusy(true);
    try {
      const res = await fleetApi.testEquipmentRule(testRule.id, testWoId);
      toastSuccess(res.data.result);
      setTestRule(null);
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function openAffected(rule: EquipmentRule) {
    setAffectedRule(rule);
    try {
      const res = await fleetApi.affectedWorkOrders(rule.id);
      setAffectedItems(res.data.items);
    } catch (err) {
      toastApiError(err);
      setAffectedItems([]);
    }
  }

  const flatRules = groups.flatMap((g) => g.rules);
  const displayGroups = groupByJobType
    ? groups
    : [{ jobType: "All Rules", count: flatRules.length, rules: flatRules }];

  const fieldClass =
    "w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none";
  const labelClass =
    "font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597]";

  return (
    <div className="space-y-4 bg-shell p-3 sm:p-5">
      {error ? (
        <div className="rounded-lg border border-[#B84A4A]/50 bg-[#2A1212] px-4 py-3 font-sans text-[12px] uppercase text-[#E86A6A]">
          {error}{" "}
          <button type="button" className="underline" onClick={() => void reload()}>
            Retry
          </button>
        </div>
      ) : null}

      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          {(kpi.length
            ? kpi
            : [
                { title: "Active Rules", value: "—", meta: "LOADING" },
                { title: "Job Types Covered", value: "—", meta: "LOADING" },
                { title: "Blocking Dispatch", value: "—", meta: "LOADING" },
                { title: "Customer Overrides", value: "—", meta: "LOADING" },
              ]
          ).map((cell) => (
            <DashboardStatCell
              key={cell.title}
              title={cell.title}
              value={cell.value}
              meta={cell.meta}
            />
          ))}
        </DashboardStatRow>
      </DashboardStatGrid>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <DashboardListToolbar
            search={
              <DashboardSearchInput
                value={q}
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
                placeholder="Search Equipment or Job Type"
              />
            }
            actions={
              <>
                <DashboardToolbarButton
                  onClick={() => setGroupByJobType((v) => !v)}
                >
                  {groupByJobType ? "Ungroup" : "Group by Job Type"}
                </DashboardToolbarButton>
                <DashboardToolbarButton
                  variant="primary"
                  onClick={() => openAdd()}
                >
                  + Add Rule
                </DashboardToolbarButton>
              </>
            }
          />

          <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="hidden grid-cols-[minmax(140px,1.4fr)_48px_88px_140px_minmax(120px,1fr)_minmax(110px,1fr)_minmax(100px,1fr)_88px_40px] gap-2 border-b border-[#2A2A2A] px-3 py-2 text-[10px] uppercase text-[#6F6F72] lg:grid">
              <span>Equipment</span>
              <span>Qty</span>
              <span>Per</span>
              <span>Enforcement</span>
              <span>Substitutes</span>
              <span>Applies To</span>
              <span>Condition</span>
              <span>Status</span>
              <span />
            </div>

            {loading && !groups.length ? (
              <p className="px-4 py-8 text-center font-sans text-[12px] uppercase text-[#6F6F72]">
                Loading rules…
              </p>
            ) : null}

            {!loading && !displayGroups.length ? (
              <p className="px-4 py-8 text-center font-sans text-[12px] uppercase text-[#6F6F72]">
                No equipment rules found
              </p>
            ) : null}

            {displayGroups.map((group) => {
              const isCollapsed = collapsed[group.jobType] === true;
              return (
                <div key={group.jobType} className="border-b border-[#2A2A2A] last:border-b-0">
                  {groupByJobType ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsed((prev) => ({
                          ...prev,
                          [group.jobType]: !isCollapsed,
                        }))
                      }
                      className="flex w-full items-center justify-between bg-[#141414] px-3 py-2.5 text-left"
                    >
                      <span className="font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                        {group.jobType}{" "}
                        <span className="text-[#6F6F72]">({group.count})</span>
                      </span>
                      <span className="text-[#6F6F72]">
                        {isCollapsed ? "▸" : "▾"}
                      </span>
                    </button>
                  ) : null}

                  {!isCollapsed
                    ? group.rules.map((rule) => (
                        <div
                          key={rule.id}
                          className="grid grid-cols-1 gap-2 border-t border-[#222] px-3 py-3 lg:grid-cols-[minmax(140px,1.4fr)_48px_88px_140px_minmax(120px,1fr)_minmax(110px,1fr)_minmax(100px,1fr)_88px_40px] lg:items-center"
                        >
                          <div>
                            <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                              {rule.equipment}
                            </p>
                            <p className="mt-0.5 font-sans text-[10px] uppercase text-[#6F6F72]">
                              {rule.code}
                            </p>
                          </div>
                          <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                            {rule.qty}
                          </p>
                          <p className="font-sans text-[12px] uppercase text-[#C8C8C8]">
                            {rule.perLabel}
                          </p>
                          <div>
                            <DashboardBadge
                              variant={enforcementBadge(rule.enforcementTone)}
                              pill
                            >
                              {rule.enforcementLabel}
                            </DashboardBadge>
                          </div>
                          <p className="font-sans text-[11px] uppercase text-[#959597]">
                            {rule.substitutes ?? "—"}
                          </p>
                          <div>
                            {rule.hasOverride && rule.overrides[0] ? (
                              <div className="group relative">
                                <button
                                  type="button"
                                  className="font-sans text-[11px] uppercase text-[#6BA3FF] hover:underline"
                                >
                                  {rule.overrides[0].customerName.split(" ")[0]}{" "}
                                  <span className="text-[#3E7BDB]">
                                    Override +
                                  </span>
                                </button>
                                <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-64 rounded-lg border border-[#3E3E3E] bg-[#1A1A1A] p-3 shadow-xl group-hover:block">
                                  <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                                    {rule.overrides[0].customerName}
                                  </p>
                                  <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">
                                    Qty {rule.overrides[0].qty} (Standard:{" "}
                                    {rule.overrides[0].standardQty})
                                  </p>
                                  <Link
                                    href={`/crm/customers/${rule.overrides[0].customerId}`}
                                    className="mt-2 inline-block font-sans text-[10px] uppercase text-[#6BA3FF]"
                                  >
                                    View in CRM → Customer Requirements
                                  </Link>
                                </div>
                              </div>
                            ) : (
                              <p className="font-sans text-[11px] uppercase text-[#959597]">
                                {rule.appliesTo}
                              </p>
                            )}
                          </div>
                          <p className="font-sans text-[11px] uppercase text-[#959597]">
                            {rule.condition ?? "—"}
                          </p>
                          <div>
                            <DashboardBadge
                              variant={
                                rule.status === "ACTIVE" ? "success" : "neutral"
                              }
                              pill
                            >
                              {rule.statusLabel}
                            </DashboardBadge>
                          </div>
                          <div className="flex justify-end">
                            <DashboardRowActionMenu
                              items={[
                                {
                                  id: "edit",
                                  label: "Edit Rule",
                                  onSelect: () => openEdit(rule),
                                },
                                {
                                  id: "override",
                                  label: "Add Customer Override",
                                  onSelect: () => {
                                    setCustomerId("");
                                    setOverrideRule(rule);
                                  },
                                },
                                {
                                  id: "test",
                                  label: "Test Against a Work Order",
                                  onSelect: () => {
                                    setTestWoId("");
                                    setTestRule(rule);
                                  },
                                },
                                {
                                  id: "copy",
                                  label: "Copy to Another Job Type",
                                  onSelect: () => {
                                    setCopyJobType("");
                                    setCopyRule(rule);
                                  },
                                },
                                {
                                  id: "affected",
                                  label: "View Affected Work Orders",
                                  onSelect: () => void openAffected(rule),
                                },
                                {
                                  id: "deactivate",
                                  label: "Deactivate Rule",
                                  destructive: true,
                                  onSelect: () => void deactivate(rule),
                                },
                              ]}
                            />
                          </div>
                        </div>
                      ))
                    : null}

                  {groupByJobType && !isCollapsed ? (
                    <button
                      type="button"
                      onClick={() => openAdd(group.jobType)}
                      className="w-full border-t border-[#222] px-3 py-2 text-left font-sans text-[11px] uppercase tracking-[-0.02em] text-[#6BA3FF] hover:bg-[#141414]"
                    >
                      + Add Rule to {group.jobType}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          <DashboardPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPage(1);
              setPageSize(n);
            }}
          />
        </div>

        <aside className="space-y-4">
          <DashboardPanel className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">
                Currently Blocking
              </h3>
              <span className="rounded-md bg-[#3A1C1C] px-2 py-0.5 font-sans text-[10px] uppercase text-[#E86A6A]">
                {insights?.currentlyBlocking.count ?? 0} WOs
              </span>
            </div>
            <ul className="space-y-3">
              {(insights?.currentlyBlocking.items ?? []).map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/operations/work-orders/${item.id}`}
                    className="font-sans text-[12px] uppercase text-[#FDFDFF] hover:underline"
                  >
                    {item.code}
                  </Link>
                  <p className="mt-0.5 font-sans text-[10px] uppercase text-[#E86A6A]">
                    {item.missing}
                  </p>
                  <p className="font-sans text-[10px] uppercase text-[#6F6F72]">
                    {item.dateLabel} · {item.customerName}
                  </p>
                </li>
              ))}
            </ul>
            {insights?.currentlyBlocking.inventoryNote ? (
              <div className="mt-3 rounded-lg border border-[#E8C547]/40 bg-[#3A3218] px-3 py-2 font-sans text-[10px] uppercase leading-relaxed text-[#E8C547]">
                {insights.currentlyBlocking.inventoryNote}
              </div>
            ) : null}
          </DashboardPanel>

          <DashboardPanel className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">
                Coverage Gaps
              </h3>
              <span className="rounded-md bg-[#3A3218] px-2 py-0.5 font-sans text-[10px] uppercase text-[#E8C547]">
                {insights?.coverageGaps.count ?? 0} Uncovered
              </span>
            </div>
            {(insights?.coverageGaps.items ?? []).map((gap) => (
              <div key={gap.jobType} className="mb-3">
                <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                  {gap.jobType}
                </p>
                <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">
                  {gap.message}
                </p>
                <button
                  type="button"
                  onClick={() => openAdd(gap.jobType)}
                  className="mt-2 font-sans text-[11px] uppercase text-[#6BA3FF] hover:underline"
                >
                  + Add Rules
                </button>
              </div>
            ))}
            {!insights?.coverageGaps.items?.length ? (
              <p className="font-sans text-[11px] uppercase text-[#6F6F72]">
                All job types covered
              </p>
            ) : null}
          </DashboardPanel>

          <DashboardPanel className="p-4">
            <h3 className="mb-3 font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">
              {insights?.mostMissed.title ?? "Most-Missed by Truck"}
            </h3>
            <ul className="space-y-3">
              {(insights?.mostMissed.items ?? []).map((row) => (
                <li key={`${row.truck}-${row.driver}`}>
                  <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                    {row.truck} — {row.driver}
                  </p>
                  {row.items.map((it) => (
                    <p
                      key={it.equipment}
                      className="mt-0.5 font-sans text-[10px] uppercase text-[#959597]"
                    >
                      {it.equipment} ({it.absences} Absences)
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </DashboardPanel>
        </aside>
      </div>

      <DashboardModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={editRule ? "Edit Rule" : "Add Rule"}
        widthClassName="max-w-[520px]"
        footer={
          <div className="flex w-full justify-end gap-2">
            <GhostBtn disabled={busy} onClick={() => setAddOpen(false)}>
              Cancel
            </GhostBtn>
            <PayrollPrimaryButton disabled={busy} onClick={() => void saveRule()}>
              {editRule ? "Save" : "Add Rule"}
            </PayrollPrimaryButton>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className={labelClass}>Equipment</span>
            <input
              className={fieldClass}
              value={formEquipment}
              onChange={(e) => setFormEquipment(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className={labelClass}>Job Type</span>
            <input
              className={fieldClass}
              value={formJobType}
              onChange={(e) => setFormJobType(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className={labelClass}>Qty</span>
              <input
                type="number"
                min={1}
                className={fieldClass}
                value={formQty}
                onChange={(e) => setFormQty(Number(e.target.value) || 1)}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Per</span>
              <select
                className={fieldClass}
                value={formPer}
                onChange={(e) => setFormPer(e.target.value)}
              >
                <option value="JOB">Job</option>
                <option value="TECHNICIAN">Technician</option>
                <option value="TRUCK">Truck</option>
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className={labelClass}>Enforcement</span>
            <select
              className={fieldClass}
              value={formEnforcement}
              onChange={(e) => setFormEnforcement(e.target.value)}
            >
              <option value="BLOCKS_DISPATCH">Blocks Dispatch</option>
              <option value="WARNING">Warning</option>
              <option value="INFORMATIONAL">Informational</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className={labelClass}>Substitutes</span>
            <input
              className={fieldClass}
              value={formSubstitutes}
              onChange={(e) => setFormSubstitutes(e.target.value)}
            />
          </label>
        </div>
      </DashboardModal>

      <DashboardModal
        open={!!copyRule}
        onClose={() => setCopyRule(null)}
        title="Copy to Another Job Type"
        widthClassName="max-w-[440px]"
        footer={
          <div className="flex w-full justify-end gap-2">
            <GhostBtn disabled={busy} onClick={() => setCopyRule(null)}>
              Cancel
            </GhostBtn>
            <PayrollPrimaryButton disabled={busy} onClick={() => void submitCopy()}>
              Copy Rule
            </PayrollPrimaryButton>
          </div>
        }
      >
        <label className="block space-y-1">
          <span className={labelClass}>Target Job Type</span>
          <input
            className={fieldClass}
            value={copyJobType}
            onChange={(e) => setCopyJobType(e.target.value)}
            placeholder="E.G. VESSEL ENTRY"
          />
        </label>
      </DashboardModal>

      <DashboardModal
        open={!!overrideRule}
        onClose={() => setOverrideRule(null)}
        title="Add Customer Override"
        widthClassName="max-w-[440px]"
        footer={
          <div className="flex w-full justify-end gap-2">
            <GhostBtn disabled={busy} onClick={() => setOverrideRule(null)}>
              Cancel
            </GhostBtn>
            <PayrollPrimaryButton
              disabled={busy}
              onClick={() => void submitOverride()}
            >
              Add Override
            </PayrollPrimaryButton>
          </div>
        }
      >
        <label className="block space-y-1">
          <span className={labelClass}>Customer</span>
          <select
            className={fieldClass}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </DashboardModal>

      <DashboardModal
        open={!!testRule}
        onClose={() => setTestRule(null)}
        title="Test Against a Work Order"
        widthClassName="max-w-[440px]"
        footer={
          <div className="flex w-full justify-end gap-2">
            <GhostBtn disabled={busy} onClick={() => setTestRule(null)}>
              Cancel
            </GhostBtn>
            <PayrollPrimaryButton disabled={busy} onClick={() => void submitTest()}>
              Run Test
            </PayrollPrimaryButton>
          </div>
        }
      >
        <label className="block space-y-1">
          <span className={labelClass}>Work Order</span>
          <select
            className={fieldClass}
            value={testWoId}
            onChange={(e) => setTestWoId(e.target.value)}
          >
            <option value="">Select work order</option>
            {workOrders.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code}
              </option>
            ))}
          </select>
        </label>
      </DashboardModal>

      <DashboardModal
        open={!!affectedRule}
        onClose={() => setAffectedRule(null)}
        title="Affected Work Orders"
        widthClassName="max-w-[520px]"
        footer={
          <div className="flex w-full justify-end">
            <PayrollPrimaryButton onClick={() => setAffectedRule(null)}>
              Done
            </PayrollPrimaryButton>
          </div>
        }
      >
        <p className="mb-3 font-sans text-[11px] uppercase text-[#959597]">
          {affectedRule?.equipment} · {affectedRule?.jobType}
        </p>
        <ul className="space-y-2">
          {affectedItems.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2"
            >
              <Link
                href={`/operations/work-orders/${item.id}`}
                className={cn(
                  "font-sans text-[12px] uppercase text-[#FDFDFF] hover:underline",
                )}
              >
                {item.code}
              </Link>
              <p className="mt-0.5 font-sans text-[10px] uppercase text-[#959597]">
                {item.customerName} · {item.title}
              </p>
            </li>
          ))}
          {!affectedItems.length ? (
            <p className="font-sans text-[11px] uppercase text-[#6F6F72]">
              No affected work orders
            </p>
          ) : null}
        </ul>
      </DashboardModal>
    </div>
  );
}
