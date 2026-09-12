"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  DashboardToggle,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";
import { toastApiError, toastSuccess, toastValidationError } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";
import { useCustomerOptions } from "./use-customer-options";

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
  const appliesOptions = lookupOptions(lookups, "appliesTo");
  const enforcementOptions = lookupOptions(lookups, "enforcementLevels");
  const cycleOptions = lookupOptions(lookups, "reviewCycles");

  const [submitting, setSubmitting] = React.useState(false);
  const [customerId, setCustomerId] = React.useState("");
  const [requirementType, setRequirementType] = React.useState("");
  const [name, setName] = React.useState("");
  const [appliesTo, setAppliesTo] = React.useState("");
  const [enforcementLevel, setEnforcementLevel] = React.useState("");
  const [evidenceRequired, setEvidenceRequired] = React.useState(false);
  const [renewalPeriod, setRenewalPeriod] = React.useState("");
  const [notes, setNotes] = React.useState("");

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
        setRequirementType(r.requirementType ?? "");
        setAppliesTo(r.appliesTo ?? "");
        setEnforcementLevel(r.enforcementLevel ?? "");
        setEvidenceRequired(Boolean(r.evidenceRequired));
        setRenewalPeriod(r.renewalPeriod ?? "");
        setNotes(r.notes ?? "");
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, requirementId]);

  async function handleSave(addAnother = false) {
    if (!customerId || !name.trim() || !requirementType || !enforcementLevel) {
      toastValidationError();
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        customerId,
        name: name.trim(),
        requirementType,
        appliesTo: appliesTo || undefined,
        enforcementLevel: enforcementLevel as
          | "HARD_GATE"
          | "SOFT_GATE"
          | "ADVISORY",
        evidenceRequired,
        renewalPeriod: renewalPeriod.trim() || undefined,
        notes: notes.trim() || undefined,
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
      } else {
        router.push("/crm/requirements");
      }
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
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
                label="Requirement Type *"
                value={requirementType}
                onChange={(e) => setRequirementType(e.target.value)}
                options={typeOptions}
                placeholder="Select type"
              />
              <DashboardTextField
                label="Requirement *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Requirement name"
              />
              <DashboardSelectField
                label="Applies To"
                value={appliesTo}
                onChange={(e) => setAppliesTo(e.target.value)}
                options={appliesOptions}
                placeholder="Select"
              />
              <DashboardSelectField
                label="Enforcement Level *"
                value={enforcementLevel}
                onChange={(e) => setEnforcementLevel(e.target.value)}
                options={enforcementOptions}
                placeholder="Select level"
              />
              <DashboardToggle
                label="Evidence Required?"
                checked={evidenceRequired}
                onCheckedChange={setEvidenceRequired}
              />
              <DashboardSelectField
                label="Renewal Period"
                value={renewalPeriod}
                onChange={(e) => setRenewalPeriod(e.target.value)}
                options={cycleOptions}
                emptyMessage="No record found"
                placeholder="Select period"
              />
              <DashboardTextField
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
              />
            </DashboardFormGrid>
          ),
        },
      ]}
    />
  );
}
