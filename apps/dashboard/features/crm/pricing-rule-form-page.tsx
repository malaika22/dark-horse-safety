"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextAreaField,
  DashboardTextField,
  DashboardToolbarButton,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { ApiError } from "@dark-horse-safety/api-client";
import { crmApi, type CrmPricingRule } from "@/lib/crm-api";
import { parseMoney } from "@/lib/crm-ui";
import { toastApiError, toastSuccess, toastValidationError } from "@/lib/toast";
import {
  sessionDisplayName,
  sessionRoleLabel,
  useSession,
} from "@/features/app-shell/session-context";
import { CrmFormPageShell } from "./crm-form-page-shell";
import { useCustomerOptions } from "./use-customer-options";

type FieldErrors = Record<string, string | undefined>;

function formatRateInput(raw: string): string {
  const n = parseMoney(raw);
  if (n == null) return raw;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function rateTypeKey(v: string) {
  return v.trim().toUpperCase().replace(/\s+/g, "_");
}

function wellLabelMap(options: DashboardSelectOption[]) {
  return new Map(options.map((o) => [o.value, o.label]));
}

/**
 * Shared Add / Edit Pricing Rule screen — Figma layout + live API data.
 */
export function PricingRuleFormPage({
  mode = "create",
  ruleId,
}: {
  mode?: "create" | "edit";
  ruleId?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const { user } = useSession();
  const { options: customers, loading: customersLoading } = useCustomerOptions();

  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [conflictAck, setConflictAck] = React.useState(false);
  const [conflict, setConflict] = React.useState<CrmPricingRule | null>(null);

  const [customerId, setCustomerId] = React.useState("");
  const [service, setService] = React.useState("");
  const [rateType, setRateType] = React.useState("");
  const [rate, setRate] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [minimumCharge, setMinimumCharge] = React.useState("");
  const [overtimeMultiplier, setOvertimeMultiplier] = React.useState("");
  const [overtimeThreshold, setOvertimeThreshold] = React.useState("");
  const [halfDayRate, setHalfDayRate] = React.useState("");
  const [minimumQuantity, setMinimumQuantity] = React.useState("");
  const [effectiveFromCycle, setEffectiveFromCycle] = React.useState("");
  const [effectiveToCycle, setEffectiveToCycle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [netsuiteItem, setNetsuiteItem] = React.useState("");
  const [appliesTo, setAppliesTo] = React.useState("ALL_SITES");
  const [wells, setWells] = React.useState<string[]>([]);
  const [wellOptions, setWellOptions] = React.useState<DashboardSelectOption[]>(
    [],
  );
  const [addingWell, setAddingWell] = React.useState(false);
  const [serviceOptions, setServiceOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [rateTypeOptions, setRateTypeOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [unitOptions, setUnitOptions] = React.useState<DashboardSelectOption[]>(
    [],
  );
  const [cycleOptions, setCycleOptions] = React.useState<DashboardSelectOption[]>(
    [],
  );
  const [netsuiteOptions, setNetsuiteOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [appliesToOptions, setAppliesToOptions] = React.useState<
    DashboardSelectOption[]
  >([
    { value: "ALL_SITES", label: "All Sites" },
    { value: "SPECIFIC_WELLS", label: "Specific Wells" },
  ]);
  const [impactCount, setImpactCount] = React.useState(0);
  const [approvalStatus, setApprovalStatus] = React.useState("APPROVED");
  const [approvedBy, setApprovedBy] = React.useState("");
  const [approvedAt, setApprovedAt] = React.useState<string | null>(null);

  const rt = rateTypeKey(rateType);
  const showHourFields = rt === "PER_HOUR" || rt === "PER_HR";
  const showDayFields = rt === "PER_DAY";
  const showUnitFields = rt === "PER_UNIT";

  const sessionApproverLabel = React.useMemo(() => {
    const name = sessionDisplayName(user);
    const role = sessionRoleLabel(user?.role);
    return role ? `${name} (${role})` : name;
  }, [user]);

  function clearError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lookups = await crmApi.lookups();
        if (cancelled) return;
        const d = lookups.data;
        if (d.serviceItems?.length) {
          setServiceOptions(
            d.serviceItems.map((o) => ({
              value: o.value || o.label,
              label: o.label,
            })),
          );
        }
        if (d.rateTypes?.length) {
          setRateTypeOptions(
            d.rateTypes.map((o) => ({
              value: o.value || o.label,
              label: o.label,
            })),
          );
        }
        if (d.units?.length) {
          setUnitOptions(
            d.units.map((o) => ({
              value: o.value || o.label,
              label: o.label,
            })),
          );
        }
        if (d.payCycles?.length) {
          setCycleOptions(
            d.payCycles.map((o) => ({ value: o.value, label: o.label })),
          );
        }
        if (d.netsuiteItems?.length) {
          setNetsuiteOptions(
            d.netsuiteItems.map((o) => ({ value: o.value, label: o.label })),
          );
        }
        if (d.pricingAppliesTo?.length) {
          setAppliesToOptions(
            d.pricingAppliesTo.map((o) => ({ value: o.value, label: o.label })),
          );
        }
      } catch {
        /* empty until retry */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!customerId) {
      setWellOptions([]);
      setImpactCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const locs = await crmApi.listLocations({ customerId, pageSize: 100 });
        if (cancelled) return;
        setWellOptions(
          (locs.data.items ?? []).map((l) => ({
            value: l.id,
            label: l.name,
          })),
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  React.useEffect(() => {
    if (!customerId || !service) {
      setImpactCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.pricingRuleImpact({
          customerId,
          serviceItem: service,
        });
        if (!cancelled) setImpactCount(res.data.openQuotes ?? 0);
      } catch {
        if (!cancelled) setImpactCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, service]);

  // Migrate legacy well names → location IDs when options load
  React.useEffect(() => {
    if (!wellOptions.length || !wells.length) return;
    setWells((prev) =>
      prev.map((w) => {
        if (wellOptions.some((o) => o.value === w)) return w;
        const byName = wellOptions.find(
          (o) => o.label.toLowerCase() === w.toLowerCase(),
        );
        return byName?.value ?? w;
      }),
    );
  }, [wellOptions]);

  React.useEffect(() => {
    if (!customerId || !service) {
      setConflict(null);
      setConflictAck(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.listPricingRules({
          customerId,
          pageSize: 50,
        });
        if (cancelled) return;
        const match = (res.data.items ?? []).find(
          (r) =>
            r.serviceItem.toLowerCase() === service.toLowerCase() &&
            r.id !== ruleId &&
            (r.status ?? "").toUpperCase() !== "ARCHIVED",
        );
        setConflict(match ?? null);
        setConflictAck(false);
      } catch {
        setConflict(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, service, ruleId]);

  React.useEffect(() => {
    if (!isEdit || !ruleId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.getPricingRule(ruleId);
        if (cancelled) return;
        const r = res.data;
        setCustomerId(r.customerId);
        setService(r.serviceItem ?? "");
        setRateType(r.rateType ?? "");
        setRate(r.rate != null ? formatRateInput(String(r.rate)) : "");
        setUnit(r.unit ?? "");
        setMinimumCharge(
          r.minimumCharge != null ? String(r.minimumCharge) : "",
        );
        setOvertimeMultiplier(r.overtimeMultiplier ?? "");
        setOvertimeThreshold(r.overtimeThreshold ?? "");
        setHalfDayRate(r.halfDayRate != null ? String(r.halfDayRate) : "");
        setMinimumQuantity(
          r.minimumQuantity != null ? String(r.minimumQuantity) : "",
        );
        if (r.effectiveFrom) {
          setEffectiveFromCycle(r.effectiveFrom.slice(0, 10));
        }
        if (r.effectiveTo) {
          setEffectiveToCycle(r.effectiveTo.slice(0, 10));
        }
        setNotes(r.notes ?? "");
        setNetsuiteItem(r.netsuiteItem ?? "");
        setAppliesTo(r.appliesTo ?? "ALL_SITES");
        const wellsRaw = r.appliesToWells;
        setWells(
          Array.isArray(wellsRaw) ? wellsRaw.map((w) => String(w)) : [],
        );
        setApprovalStatus(r.approvalStatus ?? "APPROVED");
        setApprovedBy(r.approvedBy ?? "");
        setApprovedAt(r.approvedAt ?? null);
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

  function validateClient(): FieldErrors {
    const next: FieldErrors = {};
    if (!customerId.trim()) next.customerId = "Select a customer.";
    if (!service.trim()) next.service = "Select a service / item.";
    if (!rateType.trim()) next.rateType = "Select a rate type.";
    const rateNum = parseMoney(rate);
    if (!rate.trim() || rateNum == null || rateNum < 0) {
      next.rate = "Enter a rate.";
    }
    if (!effectiveFromCycle.trim()) {
      next.effectiveFrom = "Select effective from.";
    }
    if (!notes.trim()) next.notes = "Enter notes / justification.";
    else if (notes.trim().length > 500) next.notes = "Max 500 characters.";
    if (conflict && !conflictAck && !isEdit) {
      next.conflict = "Acknowledge the existing rate conflict to continue.";
    }
    if (appliesTo === "SPECIFIC_WELLS" && wells.length === 0) {
      next.wells = "Add at least one well, or set Applies To to All Sites.";
    }
    return next;
  }

  function applyApiDetails(details?: Record<string, string[]>) {
    if (!details) return;
    const mapped: FieldErrors = {};
    for (const [key, messages] of Object.entries(details)) {
      const msg = messages[0];
      if (!msg) continue;
      if (key === "serviceItem") mapped.service = msg;
      else if (key === "effectiveFrom") mapped.effectiveFrom = msg;
      else if (key === "appliesToWells") mapped.wells = msg;
      else mapped[key] = msg;
    }
    setErrors((prev) => ({ ...prev, ...mapped }));
  }

  function scrollToFirstError() {
    requestAnimationFrame(() => {
      const firstInvalid = document.querySelector<HTMLElement>(
        "[aria-invalid='true']",
      );
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        firstInvalid.focus();
        return;
      }
      const conflictEl = document.querySelector<HTMLElement>(
        "[data-pricing-conflict-error]",
      );
      conflictEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  async function handleSave(addAnother = false) {
    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      toastValidationError();
      scrollToFirstError();
      return;
    }

    setSubmitting(true);
    setSaveError(null);
    setErrors({});
    try {
      const body = {
        customerId,
        serviceItem: service.trim(),
        rateType: rateType.trim(),
        rate: parseMoney(rate)!,
        unit: showUnitFields ? unit || undefined : undefined,
        minimumCharge:
          showHourFields || showDayFields
            ? parseMoney(minimumCharge)
            : undefined,
        overtimeMultiplier: showHourFields
          ? overtimeMultiplier.trim() || undefined
          : undefined,
        overtimeThreshold: showHourFields
          ? overtimeThreshold.trim() || undefined
          : undefined,
        halfDayRate: showDayFields ? parseMoney(halfDayRate) : undefined,
        minimumQuantity: showUnitFields
          ? parseMoney(minimumQuantity)
          : undefined,
        effectiveFrom: effectiveFromCycle,
        effectiveTo: effectiveToCycle || undefined,
        notes: notes.trim(),
        netsuiteItem: netsuiteItem || undefined,
        appliesTo: appliesTo || undefined,
        appliesToWells:
          appliesTo === "SPECIFIC_WELLS" ? wells : undefined,
        status: "ACTIVE",
      };

      if (isEdit && ruleId) {
        await crmApi.updatePricingRule(ruleId, body);
        toastSuccess("Pricing rule updated");
        router.push("/crm/pricing-rules");
      } else {
        await crmApi.createPricingRule(body);
        toastSuccess("Pricing rule created");
        if (addAnother) {
          setCustomerId("");
          setService("");
          setRateType("");
          setRate("");
          setNotes("");
          setWells([]);
          setEffectiveFromCycle("");
          setEffectiveToCycle("");
          setConflict(null);
          setConflictAck(false);
          setErrors({});
        } else {
          router.push("/crm/pricing-rules");
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        applyApiDetails(err.details);
        setSaveError(err.message);
        toastApiError(err);
        scrollToFirstError();
      } else {
        toastApiError(err);
        setSaveError(err instanceof Error ? err.message : "Save failed");
      }
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
    customers.find((c) => c.value === customerId)?.label ?? "Customer";
  const fromLabel =
    cycleOptions.find((c) => c.value === effectiveFromCycle)?.label ??
    effectiveFromCycle;
  const labels = wellLabelMap(wellOptions);
  const approvedLabel = (() => {
    const who = approvedBy || sessionApproverLabel;
    const when = approvedAt
      ? new Date(approvedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
    return `${who} · ${when}`;
  })();
  const approvalBadge =
    (approvalStatus || "APPROVED").replace(/_/g, " ").toLowerCase() ===
    "approved"
      ? "Approved"
      : (approvalStatus || "Pending").replace(/_/g, " ");

  return (
    <CrmFormPageShell
      cancelHref={
        isEdit && ruleId ? `/crm/pricing-rules/${ruleId}` : "/crm/pricing-rules"
      }
      submitLabel="Save"
      submitting={submitting}
      saveError={saveError}
      showTopCancel={false}
      onDiscardSave={() => setSaveError(null)}
      onRetrySave={() => void handleSave(false)}
      onSave={() => void handleSave(false)}
      onSaveAndAddAnother={isEdit ? undefined : () => void handleSave(true)}
      sections={[
        {
          title: "Rule Details",
          content: (
            <div className="space-y-5">
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Customer *"
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    clearError("customerId");
                  }}
                  options={customers}
                  loading={customersLoading}
                  placeholder="Select customer"
                  error={errors.customerId}
                />
                <DashboardSelectField
                  label="Service / Item *"
                  value={service}
                  onChange={(e) => {
                    setService(e.target.value);
                    clearError("service");
                  }}
                  options={serviceOptions}
                  placeholder="Select service"
                  error={errors.service}
                />
              </DashboardFormGrid>

              {conflict && !conflictAck ? (
                <div className="flex flex-col gap-3 rounded-lg border border-[#8B7355] bg-[#3A2E1C] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden
                      className="mt-0.5 shrink-0 text-[#E8B84A]"
                    >
                      <path
                        d="M8 1.5 14.5 13.5h-13L8 1.5Z"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 6v3.5M8 11.5h.01"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                    </svg>
                    <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {customerLabel} already has a rate for{" "}
                      {conflict.serviceItem} — $
                      {Number(conflict.rate).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                      {conflict.rateType ? `/${conflict.rateType}` : ""}
                      {conflict.effectiveTo
                        ? `, effective to ${new Date(
                            conflict.effectiveTo,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}`
                        : ""}
                      . Saving will supersede it from {fromLabel}.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <DashboardToolbarButton
                      onClick={() =>
                        router.push(`/crm/pricing-rules/${conflict.id}/edit`)
                      }
                    >
                      View Existing Rule
                    </DashboardToolbarButton>
                    <DashboardToolbarButton
                      onClick={() => {
                        setConflictAck(true);
                        clearError("conflict");
                      }}
                    >
                      Continue
                    </DashboardToolbarButton>
                  </div>
                </div>
              ) : null}
              {errors.conflict ? (
                <span
                  data-pricing-conflict-error
                  className="font-sans text-[11px] uppercase text-[#E5484D]"
                >
                  {errors.conflict}
                </span>
              ) : null}

              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Rate Type *"
                  value={rateType}
                  onChange={(e) => {
                    setRateType(e.target.value);
                    clearError("rateType");
                  }}
                  options={rateTypeOptions}
                  placeholder="Select rate type"
                  error={errors.rateType}
                />
                <div className="space-y-1.5">
                  <DashboardTextField
                    label="Rate *"
                    value={rate}
                    onChange={(e) => {
                      setRate(e.target.value);
                      clearError("rate");
                    }}
                    onBlur={() => {
                      if (parseMoney(rate) != null) {
                        setRate(formatRateInput(rate));
                      }
                    }}
                    error={errors.rate}
                    placeholder="$0.00"
                  />
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    Numeric entry only. Symbol and thousands separators applied
                    automatically.
                  </p>
                </div>
              </DashboardFormGrid>

              <div className="rounded-lg border border-[#3E3E3E] bg-[#1A1A1A] px-3 py-3">
                <p className="mb-2 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
                  Fields below depend on rate type
                </p>
                <ul className="space-y-1 font-sans text-[10px] uppercase leading-relaxed tracking-[-0.02em] text-[#6F6F72]">
                  <li>
                    · Per Hour — shows minimum charge (hrs), OT multiplier, OT
                    threshold.
                  </li>
                  <li>
                    · Per Day — shows minimum charge (days), half-day rate.
                  </li>
                  <li>
                    · Per Job — shows none of these (a fixed price doesn&apos;t
                    accrue hours or units).
                  </li>
                  <li>
                    · Per Unit — shows unit of measurement, minimum quantity.
                  </li>
                </ul>
              </div>

              {showHourFields || showDayFields || showUnitFields ? (
                <DashboardFormGrid className="gap-x-4 gap-y-5">
                  {(showHourFields || showDayFields) && (
                    <DashboardTextField
                      label={
                        showHourFields
                          ? "Minimum Charge (Hrs)"
                          : "Minimum Charge (Days)"
                      }
                      value={minimumCharge}
                      onChange={(e) => setMinimumCharge(e.target.value)}
                      placeholder="$0.00"
                    />
                  )}
                  {showHourFields ? (
                    <>
                      <DashboardTextField
                        label="OT Multiplier"
                        value={overtimeMultiplier}
                        onChange={(e) => setOvertimeMultiplier(e.target.value)}
                        placeholder="1.5X"
                      />
                      <DashboardTextField
                        label="OT Threshold"
                        value={overtimeThreshold}
                        onChange={(e) => setOvertimeThreshold(e.target.value)}
                        placeholder="8 HRS"
                      />
                    </>
                  ) : null}
                  {showDayFields ? (
                    <DashboardTextField
                      label="Half-Day Rate"
                      value={halfDayRate}
                      onChange={(e) => setHalfDayRate(e.target.value)}
                      placeholder="$0.00"
                    />
                  ) : null}
                  {showUnitFields ? (
                    <>
                      <DashboardSelectField
                        label="Unit of Measurement"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        options={unitOptions}
                        placeholder="Select unit"
                      />
                      <DashboardTextField
                        label="Minimum Quantity"
                        value={minimumQuantity}
                        onChange={(e) => setMinimumQuantity(e.target.value)}
                        placeholder="1"
                      />
                    </>
                  ) : null}
                </DashboardFormGrid>
              ) : null}

              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <div className="space-y-1.5">
                  <DashboardSelectField
                    label="Effective From *"
                    value={effectiveFromCycle}
                    onChange={(e) => {
                      setEffectiveFromCycle(e.target.value);
                      clearError("effectiveFrom");
                    }}
                    options={cycleOptions}
                    placeholder="Select pay cycle"
                    error={errors.effectiveFrom}
                  />
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    Rate changes take effect at the start of a pay cycle. If a
                    non-boundary date is entered: &apos;Next available:{" "}
                    {cycleOptions[0]?.label.split("·")[1]?.trim() ?? "—"}&apos;.
                  </p>
                </div>
                <DashboardSelectField
                  label="Effective To"
                  value={effectiveToCycle}
                  onChange={(e) => setEffectiveToCycle(e.target.value)}
                  options={[{ value: "", label: "Open-ended" }, ...cycleOptions]}
                />
              </DashboardFormGrid>

              <div className="space-y-1.5">
                <DashboardTextAreaField
                  label="Notes/Justification *"
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value.slice(0, 500));
                    clearError("notes");
                  }}
                  error={errors.notes}
                  placeholder="Why this rate?"
                  rows={4}
                />
                <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                  {notes.length} / 500
                </p>
              </div>

              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Linked NetSuite Item"
                  value={netsuiteItem}
                  onChange={(e) => setNetsuiteItem(e.target.value)}
                  options={netsuiteOptions}
                  placeholder="Select item"
                />
                <DashboardSelectField
                  label="Applies To"
                  value={appliesTo}
                  onChange={(e) => setAppliesTo(e.target.value)}
                  options={appliesToOptions}
                />
              </DashboardFormGrid>

              {appliesTo === "SPECIFIC_WELLS" ? (
                <div className="space-y-2">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    Wells This Rate Applies To
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {wells.map((w) => (
                      <span
                        key={w}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#3E3E3E] bg-[#2A2A2A] px-2.5 py-1.5 font-sans text-[11px] uppercase text-[#FDFDFF]"
                      >
                        {labels.get(w) ?? w}
                        <button
                          type="button"
                          onClick={() =>
                            setWells((prev) => prev.filter((x) => x !== w))
                          }
                          className="text-[#959597] hover:text-[#FDFDFF]"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAddingWell((v) => !v)}
                      className="inline-flex items-center rounded-md border border-dashed border-[#3E3E3E] px-2.5 py-1.5 font-sans text-[11px] uppercase text-[#959597] hover:text-[#FDFDFF]"
                    >
                      + Add Well
                    </button>
                  </div>
                  {addingWell ? (
                    <div className="flex flex-wrap gap-2 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] p-2">
                      {wellOptions
                        .filter((o) => !wells.includes(o.value))
                        .map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => {
                              setWells((prev) => [...prev, o.value]);
                              setAddingWell(false);
                              clearError("wells");
                            }}
                            className="rounded-md border border-[#3E3E3E] bg-[#2A2A2A] px-2.5 py-1.5 font-sans text-[11px] uppercase text-[#FDFDFF]"
                          >
                            {o.label}
                          </button>
                        ))}
                      {!wellOptions.length ? (
                        <span className="px-1 font-sans text-[10px] uppercase text-[#6F6F72]">
                          No wells for this customer
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {errors.wells ? (
                    <span className="font-sans text-[11px] uppercase text-[#E5484D]">
                      {errors.wells}
                    </span>
                  ) : null}
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    Leave empty and set &apos;Applies To&apos; to All Sites to
                    use this rate everywhere for this customer.
                  </p>
                </div>
              ) : (
                <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                  Leave empty and set &apos;Applies To&apos; to All Sites to use
                  this rate everywhere for this customer.
                </p>
              )}

              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <div className="space-y-2">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    Approval Status
                  </span>
                  <div className="flex h-10 items-center rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3">
                    <span className="rounded-full bg-[#166534] px-2.5 py-1 font-sans text-[11px] font-[510] uppercase text-[#86EFAC]">
                      {approvalBadge}
                    </span>
                  </div>
                </div>
                <DashboardTextField
                  label="Approved By"
                  value={approvedLabel}
                  disabled
                />
              </DashboardFormGrid>
              <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                Rules created by delegated users require admin approval before
                taking effect. Rules created by an admin apply immediately.
              </p>

              <div className="rounded-lg border border-[#1E3A5F] bg-[#0F1A2E] px-4 py-3">
                <p className="font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
                  Impact Preview
                </p>
                <p className="mt-1 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {impactCount} open quote{impactCount === 1 ? "" : "s"} use the
                  current rate.
                </p>
                <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#60A5FA]">
                  This change applies to work orders from {fromLabel} onward and
                  does not alter existing quotes.
                </p>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
