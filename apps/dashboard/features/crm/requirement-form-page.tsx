"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  DashboardToggle,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";

const TYPE_OPTIONS: DashboardSelectOption[] = [
  { value: "certification", label: "Certification" },
  { value: "safety", label: "Safety" },
  { value: "contract", label: "Contract" },
  { value: "insurance", label: "Insurance" },
  { value: "tax", label: "Tax" },
];
const APPLIES_OPTIONS: DashboardSelectOption[] = [
  { value: "all", label: "All" },
  { value: "wells", label: "Well sites" },
  { value: "field", label: "Field ops" },
];
const ENFORCEMENT_OPTIONS: DashboardSelectOption[] = [
  { value: "hard-gate", label: "Hard Gate" },
  { value: "soft-gate", label: "Soft Gate" },
  { value: "advisory", label: "Advisory" },
];
const CYCLE_OPTIONS: DashboardSelectOption[] = [
  { value: "annual", label: "Annual" },
  { value: "quarterly", label: "Quarterly" },
  { value: "monthly", label: "Monthly" },
];

export function RequirementFormPage({
  mode = "create",
  requirementId,
}: {
  mode?: "create" | "edit";
  requirementId?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [submitting, setSubmitting] = React.useState(false);
  const [customerId, setCustomerId] = React.useState("");
  const [customers, setCustomers] = React.useState<DashboardSelectOption[]>([]);
  const [requirementType, setRequirementType] = React.useState<string>("");
  const [name, setName] = React.useState<string>("");
  const [appliesTo, setAppliesTo] = React.useState<string>("");
  const [enforcementLevel, setEnforcementLevel] = React.useState<string>("");
  const [evidenceRequired, setEvidenceRequired] = React.useState<boolean>(false);
  const [renewalPeriod, setRenewalPeriod] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.lookupCustomers();
        if (cancelled) return;
        const opts = res.data.map((c) => ({ value: c.id, label: c.name }));
        setCustomers(opts);
        if (!customerId && opts[0]) setCustomerId(opts[0].value);

        if (isEdit && requirementId) {
          const req = await crmApi.getRequirement(requirementId);
          if (cancelled) return;
          const r = req.data;
          setCustomerId(r.customerId);
          setName(r.name ?? "");
          setRequirementType(
            (r.requirementType ?? "certification").toLowerCase(),
          );
          setAppliesTo((r.appliesTo ?? "all").toLowerCase());
          setEnforcementLevel(
            (r.enforcementLevel ?? "HARD_GATE")
              .toLowerCase()
              .replace(/_/g, "-"),
          );
          setEvidenceRequired(Boolean(r.evidenceRequired));
          setRenewalPeriod(r.renewalPeriod ?? "");
          setNotes(r.notes ?? "");
        }
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, isEdit, requirementId]);

  async function handleSave(addAnother = false) {
    if (!customerId || !name.trim()) {
      toastApiError(new Error("Customer and requirement are required"));
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        customerId,
        name: name.trim(),
        requirementType:
          TYPE_OPTIONS.find((o) => o.value === requirementType)
            ?.label ?? requirementType,
        appliesTo:
          APPLIES_OPTIONS.find((o) => o.value === appliesTo)
            ?.label ?? appliesTo,
        enforcementLevel: enforcementLevel
          .replace(/-/g, "_")
          .toUpperCase() as "HARD_GATE" | "SOFT_GATE" | "ADVISORY",
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
                options={
                  customers.length
                    ? customers
                    : [{ value: "", label: "Loading…" }]
                }
              />
              <DashboardSelectField
                label="Requirement Type *"
                value={requirementType}
                onChange={(e) => setRequirementType(e.target.value)}
                options={TYPE_OPTIONS}
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
                options={APPLIES_OPTIONS}
              />
              <DashboardSelectField
                label="Enforcement Level *"
                value={enforcementLevel}
                onChange={(e) => setEnforcementLevel(e.target.value)}
                options={ENFORCEMENT_OPTIONS}
              />
              <DashboardToggle
                label="Evidence Required?"
                checked={evidenceRequired}
                onCheckedChange={setEvidenceRequired}
              />
              <DashboardTextField
                label="Renewal Period"
                value={renewalPeriod}
                onChange={(e) => setRenewalPeriod(e.target.value)}
                placeholder="Renewal period"
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
