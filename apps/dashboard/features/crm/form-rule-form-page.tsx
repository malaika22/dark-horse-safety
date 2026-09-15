"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardChoiceChips,
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { toIsoDate } from "@/lib/crm-ui";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";
import { toastApiError, toastSuccess, toastValidationError } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";
import { useCustomerOptions } from "./use-customer-options";

function asRoles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function BlueToggle({
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-10 items-center justify-between gap-3 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3",
        disabled && "opacity-40",
      )}
    >
      <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[12px]">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-[#3B82F6]" : "bg-[#3E3E3E]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            checked && "translate-x-4",
          )}
        />
      </button>
    </div>
  );
}

/**
 * Add / Edit Form Rule — Figma layout + live API (no stubbed catalogs).
 */
export function FormRuleFormPage({
  mode = "create",
  ruleId,
}: {
  mode?: "create" | "edit";
  ruleId?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const { lookups } = useCrmLookups({ includeLocations: false });
  const templateOptions = lookupOptions(lookups, "formTemplates");
  const jobTypeOptions = lookupOptions(lookups, "jobTypes");
  const triggerOptions = lookupOptions(lookups, "formTriggers");
  const dueOptions = lookupOptions(lookups, "formDueOptions");
  const versionOptions = lookupOptions(lookups, "formVersions");
  const scopeOptions = lookupOptions(lookups, "formScopes");
  const overrideRoleOptions = lookupOptions(lookups, "formOverrideRoles");
  const { options: customers, loading: customersLoading } = useCustomerOptions();

  const overrideChips = React.useMemo(
    () => overrideRoleOptions.map((o) => ({ id: o.value, label: o.label })),
    [overrideRoleOptions],
  );

  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);
  const [impactAck, setImpactAck] = React.useState(false);
  const [openWorkOrders, setOpenWorkOrders] = React.useState(0);
  const [startedWorkOrders, setStartedWorkOrders] = React.useState(0);
  const [previewCustomerName, setPreviewCustomerName] = React.useState("");
  const [showImpact, setShowImpact] = React.useState(false);
  const [addingOverrideRole, setAddingOverrideRole] = React.useState(false);

  const [customerId, setCustomerId] = React.useState("");
  const [jobType, setJobType] = React.useState("");
  const [formTemplate, setFormTemplate] = React.useState("");
  const [versionMode, setVersionMode] = React.useState<"ALWAYS_LATEST" | "PINNED" | "">(
    "",
  );
  const [version, setVersion] = React.useState("");
  const [required, setRequired] = React.useState(false);
  const [hardGate, setHardGate] = React.useState(false);
  const [blocksPayroll, setBlocksPayroll] = React.useState(false);
  const [overrideRoles, setOverrideRoles] = React.useState<string[]>([]);
  const [requireOverrideReason, setRequireOverrideReason] =
    React.useState(false);
  const [trigger, setTrigger] = React.useState("");
  const [scope, setScope] = React.useState("");
  const [due, setDue] = React.useState("");
  const [appliesFrom, setAppliesFrom] = React.useState("");
  const [appliesToEnd, setAppliesToEnd] = React.useState("");
  const [rolloutMode, setRolloutMode] = React.useState<"ALL" | "NEW_ONLY" | "">(
    "",
  );

  const showImpactBanner =
    !isEdit && showImpact && openWorkOrders > 0 && !impactAck;
  const blockSaveOnImpact = showImpactBanner;

  const pinLabel = version
    ? `Pin to ${version}`
    : "Pin to a version";

  React.useEffect(() => {
    if (!isEdit || !ruleId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.getFormRule(ruleId);
        if (cancelled) return;
        const r = res.data;
        setCustomerId(r.customerId);
        setJobType(r.jobType ?? "");
        setFormTemplate(r.formTemplate ?? "");
        setRequired(Boolean(r.required));
        setHardGate(Boolean(r.hardGate));
        setBlocksPayroll(Boolean(r.blocksToggle));
        setTrigger(r.trigger ?? "");
        setDue(r.due ?? "");
        setScope(r.scope ?? r.appliesTo ?? "");
        setVersionMode(
          r.versionMode === "ALWAYS_LATEST" || !r.version
            ? "ALWAYS_LATEST"
            : "PINNED",
        );
        setVersion(r.version ?? "");
        setOverrideRoles(asRoles(r.overrideRoles));
        setRequireOverrideReason(Boolean(r.requireOverrideReason));
        setRolloutMode(r.rolloutMode === "NEW_ONLY" ? "NEW_ONLY" : "ALL");
        setAppliesFrom(r.appliesFrom ? String(r.appliesFrom).slice(0, 10) : "");
        setAppliesToEnd(
          r.appliesToEnd ? String(r.appliesToEnd).slice(0, 10) : "",
        );
        setReady(true);
      } catch (err) {
        toastApiError(err);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, ruleId]);

  React.useEffect(() => {
    if (!customerId) {
      setOpenWorkOrders(0);
      setStartedWorkOrders(0);
      setPreviewCustomerName("");
      setShowImpact(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.formRulePreview({
          customerId,
          formTemplate: formTemplate || undefined,
          jobType: jobType || undefined,
          required,
          hardGate,
          rolloutMode,
          excludeId: isEdit ? ruleId : undefined,
        });
        if (cancelled) return;
        setOpenWorkOrders(res.data.openWorkOrders ?? 0);
        setStartedWorkOrders(res.data.startedWorkOrders ?? 0);
        setPreviewCustomerName(res.data.customerName ?? "");
        setShowImpact(Boolean(res.data.showImpact));
        setImpactAck(false);
      } catch {
        if (!cancelled) {
          setOpenWorkOrders(0);
          setStartedWorkOrders(0);
          setShowImpact(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    customerId,
    formTemplate,
    jobType,
    required,
    hardGate,
    rolloutMode,
    isEdit,
    ruleId,
  ]);

  function onRequiredChange(next: boolean) {
    setRequired(next);
    if (!next) {
      setHardGate(false);
      setBlocksPayroll(false);
    }
  }

  async function handleSave(addAnother = false) {
    if (!customerId || !formTemplate.trim()) {
      toastValidationError("Customer and form template are required");
      return;
    }
    if (!versionMode) {
      toastValidationError("Select a version mode");
      return;
    }
    if (!rolloutMode) {
      toastValidationError("Select a rollout mode");
      return;
    }
    if (versionMode === "PINNED" && !version.trim()) {
      toastValidationError("Select a pinned version");
      return;
    }
    if (blockSaveOnImpact) {
      toastValidationError(
        "Acknowledge the open work-order impact before saving.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        customerId,
        formTemplate: formTemplate.trim(),
        jobType: jobType || undefined,
        required,
        hardGate: required ? hardGate : false,
        blocksToggle: required ? blocksPayroll : false,
        trigger: trigger || undefined,
        due: due || undefined,
        scope: scope || undefined,
        appliesTo: scope || jobType || undefined,
        versionMode,
        version: versionMode === "PINNED" ? version : undefined,
        overrideRoles,
        requireOverrideReason,
        rolloutMode,
        appliesFrom: toIsoDate(appliesFrom),
        appliesToEnd: toIsoDate(appliesToEnd),
        status: "ACTIVE",
      };

      if (isEdit && ruleId) {
        await crmApi.updateFormRule(ruleId, body);
        toastSuccess("Form rule updated");
      } else {
        await crmApi.createFormRule(body);
        toastSuccess("Form rule created");
      }

      if (addAnother && !isEdit) {
        setFormTemplate("");
        setVersion("");
        setVersionMode("ALWAYS_LATEST");
        setOverrideRoles([]);
        setImpactAck(false);
      } else {
        router.push("/crm/form-rules");
      }
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="bg-shell p-6 font-sans text-sm text-[#959597]">
        Loading…
      </div>
    );
  }

  const customerLabel =
    previewCustomerName ||
    customers.find((c) => c.value === customerId)?.label ||
    "this customer";

  return (
    <CrmFormPageShell
      cancelHref="/crm/form-rules"
      submitLabel="Save"
      submitting={submitting}
      onSave={() => handleSave(false)}
      onSaveAndAddAnother={() => handleSave(true)}
      preFooter={
        showImpactBanner ? (
          <div className="flex flex-col gap-3 rounded-lg border border-[#8B7355] bg-[#3A2E1C] px-3 py-3">
            <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {openWorkOrders} open work order
              {openWorkOrders === 1 ? "" : "s"} for {customerLabel}
              {startedWorkOrders > 0
                ? ` (${startedWorkOrders} already started)`
                : ""}
              . Applying this hard-gate now can block clock-in.
            </p>
            <div className="flex flex-wrap gap-2">
              <DashboardToolbarButton onClick={() => setImpactAck(true)}>
                Acknowledge &amp; continue
              </DashboardToolbarButton>
              <DashboardToolbarButton
                onClick={() => setRolloutMode("NEW_ONLY")}
              >
                Apply to new only
              </DashboardToolbarButton>
            </div>
          </div>
        ) : null
      }
      sections={[
        {
          title: "Rule Details",
          content: (
            <div className="space-y-5">
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Customer *"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  options={customers}
                  loading={customersLoading}
                  placeholder="Select customer"
                  emptyMessage="No record found"
                />
                <DashboardSelectField
                  label="Job Type *"
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  options={jobTypeOptions}
                  placeholder="Select job type"
                  emptyMessage="No record found"
                />
              </DashboardFormGrid>

              <DashboardSelectField
                label="Form Template *"
                value={formTemplate}
                onChange={(e) => setFormTemplate(e.target.value)}
                options={templateOptions}
                placeholder="Select template"
                emptyMessage="No record found"
              />

              <div className="space-y-2">
                <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                  Version
                </span>
                <div className="space-y-2.5 pt-0.5">
                  {(
                    [
                      {
                        value: "ALWAYS_LATEST" as const,
                        label: "Always use the latest",
                      },
                      { value: "PINNED" as const, label: pinLabel },
                    ] as const
                  ).map((opt) => {
                    const selected = versionMode === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-start gap-2.5"
                      >
                        <span
                          className={cn(
                            "mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
                            selected ? "border-[#3B82F6]" : "border-[#959597]",
                          )}
                          aria-hidden
                        >
                          {selected ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
                          ) : null}
                        </span>
                        <input
                          type="radio"
                          name="versionMode"
                          checked={selected}
                          onChange={() => setVersionMode(opt.value)}
                          className="sr-only"
                        />
                        <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {versionMode === "PINNED" ? (
                  <DashboardSelectField
                    label="Pinned Version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    options={versionOptions}
                    placeholder="Select version"
                    emptyMessage="No versions found"
                  />
                ) : null}
              </div>

              <div className="space-y-3">
                <BlueToggle
                  label="Required *"
                  checked={required}
                  onCheckedChange={onRequiredChange}
                />
                <BlueToggle
                  label="Hard Gate"
                  checked={hardGate}
                  onCheckedChange={setHardGate}
                  disabled={!required}
                />
                <BlueToggle
                  label="Blocks Payroll"
                  checked={blocksPayroll}
                  onCheckedChange={setBlocksPayroll}
                  disabled={!required}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    Override Roles
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddingOverrideRole((v) => !v)}
                    className="font-sans text-[11px] uppercase text-[#60A5FA] hover:underline"
                  >
                    {addingOverrideRole ? "Done" : "+ Add role"}
                  </button>
                </div>
                <DashboardChoiceChips
                  value={overrideRoles}
                  onChange={setOverrideRoles}
                  options={overrideChips}
                />
                {addingOverrideRole ? (
                  <div className="flex flex-wrap gap-2">
                    {overrideChips
                      .filter((o) => !overrideRoles.includes(o.id))
                      .map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() =>
                            setOverrideRoles((prev) => [...prev, o.id])
                          }
                          className="rounded-md border border-[#3E3E3E] bg-[#2A2A2A] px-2.5 py-1.5 font-sans text-[11px] uppercase text-[#FDFDFF]"
                        >
                          {o.label}
                        </button>
                      ))}
                  </div>
                ) : null}
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={requireOverrideReason}
                    onChange={(e) =>
                      setRequireOverrideReason(e.target.checked)
                    }
                    className="h-4 w-4 rounded border-[#3E3E3E] bg-[#2A2A2A] accent-[#3B82F6]"
                  />
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    Require a reason when overriding
                  </span>
                </label>
              </div>

              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Trigger"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  options={triggerOptions}
                  placeholder="Select trigger"
                  emptyMessage="No record found"
                />
                <DashboardSelectField
                  label="Scope"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  options={scopeOptions}
                  placeholder="Select scope"
                  emptyMessage="No record found"
                />
              </DashboardFormGrid>

              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Due"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  options={dueOptions}
                  placeholder="Select due"
                  emptyMessage="No record found"
                />
                <DashboardTextField
                  label="Applies From"
                  type="date"
                  value={appliesFrom}
                  onChange={(e) => setAppliesFrom(e.target.value)}
                />
              </DashboardFormGrid>

              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardTextField
                  label="Applies To"
                  type="date"
                  value={appliesToEnd}
                  onChange={(e) => setAppliesToEnd(e.target.value)}
                />
                <div className="space-y-2">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    Rollout
                  </span>
                  <div className="space-y-2 pt-1">
                    {(
                      [
                        {
                          value: "ALL" as const,
                          label: "Apply to all matching work orders",
                        },
                        {
                          value: "NEW_ONLY" as const,
                          label: "Apply to new work orders only",
                        },
                      ] as const
                    ).map((opt) => {
                      const selected = rolloutMode === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className="flex cursor-pointer items-start gap-2.5"
                        >
                          <span
                            className={cn(
                              "mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
                              selected
                                ? "border-[#3B82F6]"
                                : "border-[#959597]",
                            )}
                            aria-hidden
                          >
                            {selected ? (
                              <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
                            ) : null}
                          </span>
                          <input
                            type="radio"
                            name="rolloutMode"
                            checked={selected}
                            onChange={() => setRolloutMode(opt.value)}
                            className="sr-only"
                          />
                          <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                            {opt.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </DashboardFormGrid>
            </div>
          ),
        },
      ]}
    />
  );
}
