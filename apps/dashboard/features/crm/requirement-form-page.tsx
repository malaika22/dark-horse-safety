"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardChoiceChips,
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextAreaField,
  DashboardTextField,
  DashboardToggle,
  DashboardToolbarButton,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { toIsoDate } from "@/lib/crm-ui";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";
import { toastApiError, toastSuccess, toastValidationError } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";
import { useCustomerOptions } from "./use-customer-options";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

function asRoles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/**
 * Add / Edit Requirement — Figma two-column layout + live API.
 */
export function RequirementFormPage({
  mode = "create",
  requirementId,
}: {
  mode?: "create" | "edit";
  requirementId?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const { options: customers, loading: customersLoading } = useCustomerOptions();
  const { lookups } = useCrmLookups({ includeLocations: false });

  const typeOptions = lookupOptions(lookups, "requirementTypes");
  const sourceOptions = lookupOptions(lookups, "requirementSources");
  const catalogOptions = lookupOptions(lookups, "requirementCatalog");
  const evidenceTypeOptions = lookupOptions(lookups, "evidenceTypes");
  const verificationOptions = lookupOptions(lookups, "verificationMethods");
  const technicianScopeOptions = lookupOptions(lookups, "technicianScope");
  const technicianRoleOptions = lookupOptions(lookups, "technicianRoles");
  const overrideRoleOptions = lookupOptions(lookups, "overrideRoles");
  const validityOptions = lookupOptions(lookups, "validityPeriods");
  const rolloutOptions = lookupOptions(lookups, "rolloutModes");
  const enforcementOptions = lookupOptions(lookups, "enforcementLevels");

  const roleChips = React.useMemo(
    () =>
      technicianRoleOptions.map((o) => ({ id: o.value, label: o.label })),
    [technicianRoleOptions],
  );

  const overrideChips = React.useMemo(
    () =>
      overrideRoleOptions.map((o) => ({ id: o.value, label: o.label })),
    [overrideRoleOptions],
  );

  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);
  const [impactAck, setImpactAck] = React.useState(false);
  const [impactCount, setImpactCount] = React.useState(0);
  const [checksOnSave, setChecksOnSave] = React.useState<
    { ok: boolean; message: string }[]
  >([]);
  const [previewCustomerName, setPreviewCustomerName] = React.useState("");
  const [customMode, setCustomMode] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [customerId, setCustomerId] = React.useState("");
  const [requirementType, setRequirementType] = React.useState("");
  const [source, setSource] = React.useState("");
  const [issuingBody, setIssuingBody] = React.useState("");
  const [minimumGrade, setMinimumGrade] = React.useState("");
  const [catalogValue, setCatalogValue] = React.useState("");
  const [name, setName] = React.useState("");
  const [appliesTo, setAppliesTo] = React.useState("");
  const [appliesToRoles, setAppliesToRoles] = React.useState<string[]>([]);
  const [enforcementLevel, setEnforcementLevel] = React.useState("");
  const [evidenceRequired, setEvidenceRequired] = React.useState(false);
  const [evidenceType, setEvidenceType] = React.useState("");
  const [evidenceUrl, setEvidenceUrl] = React.useState<string | null>(null);
  const [evidenceFileName, setEvidenceFileName] = React.useState<string | null>(
    null,
  );
  const [verificationMethod, setVerificationMethod] = React.useState("");
  const [overrideRoles, setOverrideRoles] = React.useState<string[]>([]);

  const [requireOverrideReason, setRequireOverrideReason] =
    React.useState(false);
  const [rolloutMode, setRolloutMode] = React.useState("");
  const [effectiveFrom, setEffectiveFrom] = React.useState("");
  const [renewalLeadDays, setRenewalLeadDays] = React.useState("");
  const [validityPeriod, setValidityPeriod] = React.useState("");
  const [autoCheckable, setAutoCheckable] = React.useState(false);
  const [notes, setNotes] = React.useState("");

  const showCertFields =
    requirementType === "Certification" ||
    requirementType.toLowerCase() === "certification";
  const showRoleChips =
    appliesTo === "SPECIFIC_ROLES" || appliesTo === "Specific Roles";
  const showImpactBanner =
    !isEdit &&
    (enforcementLevel === "HARD_GATE" || enforcementLevel === "SOFT_GATE") &&
    impactCount > 0 &&
    !impactAck;
  const blockSaveOnImpact =
    !isEdit && enforcementLevel === "HARD_GATE" && impactCount > 0 && !impactAck;

  React.useEffect(() => {
    if (!isEdit || !requirementId) return;
    let cancelled = false;
    (async () => {
      try {
        const req = await crmApi.getRequirement(requirementId);
        if (cancelled) return;
        const r = req.data;
        setCustomerId(r.customerId);
        setName(r.name ?? "");
        setRequirementType(r.requirementType ?? "Certification");
        setSource(r.source ?? "CUSTOMER_IMPOSED");
        setIssuingBody(r.issuingBody ?? "");
        setMinimumGrade(r.minimumGrade ?? "");
        setAppliesTo(r.appliesTo ?? "SPECIFIC_ROLES");
        setAppliesToRoles(asRoles(r.appliesToRoles));
        setEnforcementLevel(r.enforcementLevel ?? "SOFT_GATE");
        setEvidenceRequired(Boolean(r.evidenceRequired));
        setEvidenceType(r.evidenceType ?? "CERTIFICATE_UPLOAD");
        setEvidenceUrl(r.evidenceUrl ?? null);
        setEvidenceFileName(r.evidenceUrl ? "Uploaded evidence" : null);
        setVerificationMethod(r.verificationMethod ?? "SELF_CERTIFIED");
        setOverrideRoles(asRoles(r.overrideRoles));
        setRequireOverrideReason(Boolean(r.requireOverrideReason));
        setRolloutMode(r.rolloutMode ?? "NEW_ONLY");
        setEffectiveFrom(
          r.effectiveFrom ? String(r.effectiveFrom).slice(0, 10) : "",
        );
        setRenewalLeadDays(
          r.renewalLeadDays != null ? String(r.renewalLeadDays) : "30",
        );
        setValidityPeriod(r.validityPeriod ?? "ANNUALLY");
        setAutoCheckable(r.autoCheckable !== false);
        setNotes(r.notes ?? "");

        const match = catalogOptions.find(
          (o) =>
            o.value === r.name ||
            o.label === r.name ||
            o.label.toLowerCase().startsWith((r.name ?? "").toLowerCase()),
        );
        if (match) {
          setCatalogValue(match.value);
          setCustomMode(false);
        } else {
          setCatalogValue("");
          setCustomMode(true);
        }
        setReady(true);
      } catch (err) {
        toastApiError(err);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // catalogOptions intentionally omitted — hydrate once on id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, requirementId]);

  React.useEffect(() => {
    if (!customerId) {
      setImpactCount(0);
      setChecksOnSave([]);
      setPreviewCustomerName("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const lead = Number.parseInt(renewalLeadDays, 10);
        const res = await crmApi.requirementPreview({
          customerId,
          requirementType,
          name: name.trim() || undefined,
          renewalLeadDays: Number.isFinite(lead) ? lead : undefined,
          validityPeriod: validityPeriod || undefined,
          appliesTo: appliesTo || undefined,
          appliesToRoles: showRoleChips ? appliesToRoles : undefined,
          enforcementLevel: enforcementLevel || undefined,
          rolloutMode: rolloutMode || undefined,
          excludeId: isEdit ? requirementId : undefined,
        });
        if (cancelled) return;
        setChecksOnSave(res.data.checksOnSave ?? []);
        setImpactCount(res.data.blockedCount ?? 0);
        setPreviewCustomerName(res.data.customerName ?? "");
        setImpactAck(false);
      } catch {
        if (!cancelled) {
          setChecksOnSave([]);
          setImpactCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    customerId,
    isEdit,
    requirementId,
    requirementType,
    name,
    renewalLeadDays,
    validityPeriod,
    appliesTo,
    appliesToRoles,
    showRoleChips,
    enforcementLevel,
    rolloutMode,
  ]);

  function onCatalogChange(value: string) {
    setCatalogValue(value);
    setCustomMode(false);
    const opt = catalogOptions.find((o) => o.value === value);
    setName(opt?.label?.split(" — ")[0]?.trim() || value);
    setAutoCheckable(true);
  }

  function startCustom() {
    setCustomMode(true);
    setCatalogValue("");
    setName("");
    setAutoCheckable(false);
  }

  async function handleEvidenceUpload(file: File) {
    setUploading(true);
    try {
      const contentBase64 = await fileToDataUrl(file);
      const saved = await crmApi.uploadFile({
        folder: requirementId
          ? `requirements/${requirementId}`
          : "requirements/draft",
        fileName: file.name,
        mimeType: file.type,
        contentBase64,
      });
      setEvidenceUrl(saved.data.url);
      setEvidenceFileName(saved.data.fileName || file.name);
      toastSuccess("Evidence uploaded");
    } catch (err) {
      toastApiError(err);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(addAnother = false, force = false) {
    if (!customerId || !name.trim() || !requirementType || !enforcementLevel) {
      toastValidationError();
      return;
    }
    if (showRoleChips && appliesToRoles.length === 0) {
      toastValidationError("Select at least one role");
      return;
    }
    if (blockSaveOnImpact && !force) {
      toastValidationError(
        "Review technician impact before saving, or choose Save anyway.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const lead = Number.parseInt(renewalLeadDays, 10);
      const body = {
        customerId,
        name: name.trim(),
        requirementType,
        source: source || undefined,
        issuingBody: showCertFields
          ? issuingBody.trim() || undefined
          : undefined,
        minimumGrade: showCertFields
          ? minimumGrade.trim() || undefined
          : undefined,
        appliesTo: appliesTo || undefined,
        appliesToRoles: showRoleChips ? appliesToRoles : [],
        enforcementLevel: enforcementLevel as
          | "HARD_GATE"
          | "SOFT_GATE"
          | "ADVISORY",
        evidenceRequired,
        evidenceType: evidenceRequired ? evidenceType || undefined : undefined,
        evidenceUrl: evidenceRequired ? evidenceUrl || undefined : undefined,
        verificationMethod: verificationMethod || undefined,
        overrideRoles,
        requireOverrideReason,
        rolloutMode: rolloutMode || undefined,
        effectiveFrom: toIsoDate(effectiveFrom),
        renewalLeadDays: Number.isFinite(lead) ? lead : undefined,
        validityPeriod: validityPeriod || undefined,
        autoCheckable,
        renewalPeriod: validityPeriod || undefined,
        notes: notes.trim() || undefined,
        docsRequired: evidenceRequired,
        status: "ACTIVE",
      };

      if (isEdit && requirementId) {
        await crmApi.updateRequirement(requirementId, body);
        toastSuccess("Requirement updated");
      } else {
        await crmApi.createRequirement(body);
        toastSuccess("Requirement created");
      }

      if (addAnother && !isEdit) {
        setName("");
        setCatalogValue("");
        setCustomMode(false);
        setEvidenceUrl(null);
        setEvidenceFileName(null);
        setNotes("");
        setImpactAck(false);
      } else {
        router.push("/crm/requirements");
      }
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  const typeHintOptions: DashboardSelectOption[] = typeOptions;

  if (!ready) {
    return (
      <div className="bg-shell p-6 font-sans text-[12px] uppercase text-[#959597]">
        Loading requirement…
      </div>
    );
  }

  return (
    <CrmFormPageShell
      cancelHref="/crm/requirements"
      submitLabel="Save"
      submitting={submitting}
      onSave={() => handleSave(false)}
      onSaveAndAddAnother={() => handleSave(true)}
      sections={[
        {
          title: "Requirement Details",
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
                  label="Type *"
                  value={requirementType}
                  onChange={(e) => setRequirementType(e.target.value)}
                  options={typeHintOptions}
                  placeholder="Select type"
                />
              </DashboardFormGrid>

              <div className="space-y-1.5">
                <DashboardSelectField
                  label="Source *"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  options={sourceOptions}
                  placeholder="Select source"
                />
                <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                  Who requires this — customer contract, regulation, or internal
                  policy.
                </p>
              </div>

              <div className="space-y-2 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-3">
                <p className="font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
                  Checked on Save
                </p>
                {checksOnSave.length ? (
                  <ul className="space-y-1">
                    {checksOnSave.map((check, i) => (
                      <li
                        key={i}
                        className={`font-sans text-[10px] uppercase tracking-[-0.02em] ${
                          check.ok ? "text-[#86EFAC]" : "text-[#E5484D]"
                        }`}
                      >
                        · {check.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    {customerId
                      ? "Running live checks…"
                      : "Select a customer to run live save checks."}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-3">
                <p className="font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
                  Fields below depend on type
                </p>
                <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                  Certification shows issuing body &amp; grade · Training shows
                  course library · Document / Equipment adjust evidence
                  defaults.
                </p>
              </div>

              {showCertFields ? (
                <DashboardFormGrid className="gap-x-4 gap-y-5">
                  <DashboardTextField
                    label="Issuing Body"
                    value={issuingBody}
                    onChange={(e) => setIssuingBody(e.target.value)}
                    placeholder="e.g. PEC, OSHA, Red Cross"
                  />
                  <DashboardTextField
                    label="Minimum Grade / Score"
                    value={minimumGrade}
                    onChange={(e) => setMinimumGrade(e.target.value)}
                    placeholder="e.g. Pass / 80%"
                  />
                </DashboardFormGrid>
              ) : null}

              <div className="space-y-2">
                {!customMode ? (
                  <DashboardSelectField
                    label="Requirement *"
                    value={catalogValue}
                    onChange={(e) => onCatalogChange(e.target.value)}
                    options={catalogOptions}
                    placeholder="Select from library"
                  />
                ) : (
                  <DashboardTextField
                    label="Custom Requirement *"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setAutoCheckable(false);
                    }}
                    placeholder="Enter requirement name"
                  />
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={startCustom}
                    className="inline-flex items-center rounded-md border border-dashed border-[#3E3E3E] px-2.5 py-1.5 font-sans text-[11px] uppercase text-[#959597] hover:border-[#5A5A5A] hover:text-[#FDFDFF]"
                  >
                    + Add custom
                  </button>
                  {customMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomMode(false);
                        setAutoCheckable(true);
                      }}
                      className="font-sans text-[11px] uppercase text-[#60A5FA] hover:underline"
                    >
                      Use library instead
                    </button>
                  ) : null}
                </div>
                {!autoCheckable ? (
                  <div className="rounded-lg border border-[#5C4A1F] bg-[#2A2410] px-3 py-2">
                    <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#E8B84A]">
                      Cannot be auto-checked against technician records. Manual
                      evidence review will be required.
                    </p>
                  </div>
                ) : null}
              </div>

              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Applies To Technicians *"
                  value={appliesTo}
                  onChange={(e) => setAppliesTo(e.target.value)}
                  options={technicianScopeOptions}
                  placeholder="Select scope"
                />
                <DashboardSelectField
                  label="Enforcement Level *"
                  value={enforcementLevel}
                  onChange={(e) => {
                    setEnforcementLevel(e.target.value);
                    setImpactAck(false);
                  }}
                  options={enforcementOptions}
                  placeholder="Select level"
                />
              </DashboardFormGrid>

              {showRoleChips ? (
                <DashboardChoiceChips
                  label="Roles"
                  options={roleChips}
                  value={appliesToRoles}
                  onChange={setAppliesToRoles}
                />
              ) : null}

              <DashboardToggle
                label="Evidence Required?"
                checked={evidenceRequired}
                onCheckedChange={setEvidenceRequired}
              />

              {evidenceRequired ? (
                <>
                  <DashboardSelectField
                    label="Evidence Type"
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                    options={evidenceTypeOptions}
                    placeholder="Select evidence type"
                  />

                  <div className="space-y-2">
                    <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                      Upload Sample / Evidence
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void handleEvidenceUpload(file);
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#3E3E3E] px-4 py-8 text-center hover:border-[#5A5A5A]"
                    >
                      <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                        {uploading
                          ? "Uploading…"
                          : evidenceFileName
                            ? evidenceFileName
                            : "Drop file or click to upload"}
                      </span>
                      <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
                        PDF, PNG, or JPG
                      </span>
                    </button>
                    {evidenceUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEvidenceUrl(null);
                          setEvidenceFileName(null);
                        }}
                        className="font-sans text-[11px] uppercase text-[#E5484D] hover:underline"
                      >
                        Remove file
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}

              <div className="space-y-3">
                <DashboardChoiceChips
                  label="Who Can Override"
                  options={overrideChips}
                  value={overrideRoles}
                  onChange={setOverrideRoles}
                />
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={requireOverrideReason}
                    onChange={(e) =>
                      setRequireOverrideReason(e.target.checked)
                    }
                    className="h-4 w-4 rounded border-[#3E3E3E] bg-[#2A2A2A]"
                  />
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    Require a reason when overriding
                  </span>
                </label>
              </div>

              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardTextField
                  label="Effective From"
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
                <DashboardTextField
                  label="Renewal Lead Time (Days)"
                  value={renewalLeadDays}
                  onChange={(e) =>
                    setRenewalLeadDays(e.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="30"
                />
                <DashboardSelectField
                  label="Validity Period"
                  value={validityPeriod}
                  onChange={(e) => setValidityPeriod(e.target.value)}
                  options={validityOptions}
                  placeholder="Select period"
                />
                <DashboardSelectField
                  label="Verification Method"
                  value={verificationMethod}
                  onChange={(e) => setVerificationMethod(e.target.value)}
                  options={verificationOptions}
                  placeholder="Select method"
                />
              </DashboardFormGrid>

              <div className="space-y-2">
                <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                  Rollout
                </span>
                <div className="space-y-2">
                  {rolloutOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5"
                    >
                      <input
                        type="radio"
                        name="rolloutMode"
                        checked={rolloutMode === opt.value}
                        onChange={() => setRolloutMode(opt.value)}
                        className="mt-0.5"
                      />
                      <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <DashboardTextAreaField
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
                placeholder="Internal notes"
                rows={3}
              />
              <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                {notes.length} / 1000
              </p>

              {showImpactBanner || (impactCount > 0 && !isEdit && impactAck) ? (
                <div className="flex flex-col gap-3 rounded-lg border border-[#8B7355] bg-[#3A2E1C] px-3 py-3">
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
                      {impactCount} technician
                      {impactCount === 1 ? "" : "s"}
                      {previewCustomerName
                        ? ` at ${previewCustomerName}`
                        : ""}{" "}
                      may not currently meet this requirement. Saving can block
                      dispatch depending on enforcement.
                    </p>
                  </div>
                  {!impactAck ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <DashboardToolbarButton
                        onClick={() => router.push("/crm/requirements")}
                      >
                        View Technicians
                      </DashboardToolbarButton>
                      <DashboardToolbarButton
                        onClick={() => {
                          const el = document.querySelector<HTMLInputElement>(
                            'input[type="date"]',
                          );
                          el?.focus();
                        }}
                      >
                        Set Effective Date
                      </DashboardToolbarButton>
                      <DashboardToolbarButton
                        onClick={() => {
                          setImpactAck(true);
                          void handleSave(false, true);
                        }}
                      >
                        Save Anyway
                      </DashboardToolbarButton>
                    </div>
                  ) : (
                    <p className="font-sans text-[10px] uppercase text-[#86EFAC]">
                      Impact acknowledged — you can save.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          ),
        },
      ]}
    />
  );
}
