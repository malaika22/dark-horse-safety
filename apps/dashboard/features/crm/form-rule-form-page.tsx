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
import { toApiStatus, toIsoDate } from "@/lib/crm-ui";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";
import { useCustomerOptions } from "./use-customer-options";

const FORM_RULE_FORM = {
  triggerOptions: [
    { value: "On Dispatch", label: "On Dispatch" },
    { value: "On Start", label: "On Start" },
    { value: "Per Shift", label: "Per Shift" },
  ] as DashboardSelectOption[],
  dueOptions: [
    { value: "Before Dispatch", label: "Before Dispatch" },
    { value: "Before Closeout", label: "Before Closeout" },
    { value: "Before Job Start", label: "Before Job Start" },
  ] as DashboardSelectOption[],
  appliesToOptions: [
    { value: "All Jobs", label: "All Jobs" },
    { value: "Well Sites", label: "Well Sites" },
    { value: "Fleet Jobs", label: "Fleet Jobs" },
    { value: "H2S Sites", label: "H2S Sites" },
  ] as DashboardSelectOption[],
  versionOptions: [
    { value: "V1", label: "V1" },
    { value: "V2", label: "V2" },
    { value: "V3", label: "V3" },
  ] as DashboardSelectOption[],
  statusOptions: [
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
    { value: "DRAFT", label: "Draft" },
  ] as DashboardSelectOption[],
};

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
  const { options: customers, loading: customersLoading } = useCustomerOptions();
  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);
  const [customerId, setCustomerId] = React.useState("");
  const [jobType, setJobType] = React.useState("");
  const [formTemplate, setFormTemplate] = React.useState("");
  const [required, setRequired] = React.useState(true);
  const [hardgate, setHardgate] = React.useState(false);
  const [blocksToggle, setBlocksToggle] = React.useState(false);
  const [trigger, setTrigger] = React.useState("");
  const [due, setDue] = React.useState("");
  const [appliesTo, setAppliesTo] = React.useState("");
  const [version, setVersion] = React.useState("V1");
  const [status, setStatus] = React.useState("ACTIVE");
  const [appliesFrom, setAppliesFrom] = React.useState("");

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
        setHardgate(Boolean(r.hardGate));
        setBlocksToggle(Boolean(r.blocksToggle));
        setTrigger(r.trigger ?? "");
        setDue(r.due ?? "");
        setAppliesTo(r.appliesTo ?? r.jobType ?? "");
        setVersion(r.version ?? "V1");
        setStatus((r.status ?? "ACTIVE").toUpperCase());
        setAppliesFrom(r.appliesFrom ? String(r.appliesFrom).slice(0, 10) : "");
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

  async function handleSave() {
    if (!customerId || !formTemplate.trim()) {
      toastApiError(new Error("Customer and form template are required"));
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        customerId,
        formTemplate,
        jobType: jobType || appliesTo || undefined,
        required,
        hardGate: hardgate,
        blocksToggle,
        trigger: trigger || undefined,
        due: due || undefined,
        appliesTo: appliesTo || jobType || undefined,
        version: version || undefined,
        appliesFrom: toIsoDate(appliesFrom),
        status: toApiStatus(status),
      };
      if (isEdit && ruleId) {
        await crmApi.updateFormRule(ruleId, body);
        toastSuccess("Form rule updated");
      } else {
        await crmApi.createFormRule(body);
        toastSuccess("Form rule created");
      }
      router.push("/crm/form-rules");
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="bg-shell p-6 font-sans text-sm text-[#959597]">Loading…</div>
    );
  }

  return (
    <CrmFormPageShell
      cancelHref="/crm/form-rules"
      submitLabel="Save"
      submitting={submitting}
      onSave={() => void handleSave()}
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
                  label="Form Template *"
                  value={formTemplate}
                  onChange={(e) => setFormTemplate(e.target.value)}
                  options={templateOptions}
                  emptyMessage="No record found"
                />
                <DashboardSelectField
                  label="Trigger"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  options={FORM_RULE_FORM.triggerOptions}
                />
                <DashboardSelectField
                  label="Applies To"
                  value={appliesTo}
                  onChange={(e) => {
                    setAppliesTo(e.target.value);
                    if (!jobType) setJobType(e.target.value);
                  }}
                  options={
                    jobTypeOptions.length
                      ? jobTypeOptions
                      : FORM_RULE_FORM.appliesToOptions
                  }
                  emptyMessage="No record found"
                />
                <DashboardSelectField
                  label="Due By"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  options={FORM_RULE_FORM.dueOptions}
                />
                <DashboardSelectField
                  label="Version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  options={FORM_RULE_FORM.versionOptions}
                />
                <DashboardSelectField
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={FORM_RULE_FORM.statusOptions}
                />
                <DashboardTextField
                  label="Applies From"
                  value={appliesFrom}
                  onChange={(e) => setAppliesFrom(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </DashboardFormGrid>

              <div className="space-y-3">
                <DashboardToggle
                  label="Required?"
                  checked={required}
                  onCheckedChange={setRequired}
                />
                <DashboardToggle
                  label="Hard Gate (enforcement)"
                  checked={hardgate}
                  onCheckedChange={setHardgate}
                />
                <DashboardToggle
                  label="Blocks Payroll?"
                  checked={blocksToggle}
                  onCheckedChange={setBlocksToggle}
                />
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
