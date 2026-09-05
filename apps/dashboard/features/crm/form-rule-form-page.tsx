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
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";

const FORM_RULE_FORM = {
  templates: [
    { value: "Wireline Operations V2", label: "Wireline Operations V2" },
    { value: "JSA", label: "JSA" },
    { value: "Permit to work", label: "Permit to work" },
    { value: "Tailgate", label: "Tailgate" },
    { value: "EOD report", label: "EOD report" },
  ] as DashboardSelectOption[],
  jobTypes: [
    { value: "JSA", label: "JSA" },
    { value: "Permit to Work", label: "Permit to Work" },
    { value: "Wireline", label: "Wireline" },
    { value: "H2S", label: "H2S" },
  ] as DashboardSelectOption[],
  dueOptions: [
    { value: "Before Job Start", label: "Before Job Start" },
    { value: "On Dispatch", label: "On Dispatch" },
    { value: "Per Shift", label: "Per Shift" },
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
  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);
  const [customers, setCustomers] = React.useState<DashboardSelectOption[]>([]);
  const [customerId, setCustomerId] = React.useState("");
  const [jobType, setJobType] = React.useState("");
  const [formTemplate, setFormTemplate] = React.useState("");
  const [required, setRequired] = React.useState(false);
  const [hardgate, setHardgate] = React.useState(false);
  const [blocksToggle, setBlocksToggle] = React.useState(false);
  const [due, setDue] = React.useState("");
  const [appliesFrom, setAppliesFrom] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.lookupCustomers();
        if (cancelled) return;
        setCustomers(res.data.map((c) => ({ value: c.id, label: c.name })));
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        setDue(r.due ?? r.trigger ?? "");
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
        jobType: jobType || undefined,
        required,
        hardGate: hardgate,
        blocksToggle,
        due: due || undefined,
        appliesFrom: toIsoDate(appliesFrom),
        status: toApiStatus("active"),
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
                />
                <DashboardSelectField
                  label="Job Type *"
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  options={FORM_RULE_FORM.jobTypes}
                />
                <DashboardSelectField
                  label="Form Template *"
                  value={formTemplate}
                  onChange={(e) => setFormTemplate(e.target.value)}
                  options={FORM_RULE_FORM.templates}
                  containerClassName="md:col-span-2"
                />
              </DashboardFormGrid>

              <div className="space-y-3">
                <DashboardToggle
                  label="Required? *"
                  checked={required}
                  onCheckedChange={setRequired}
                />
                <DashboardToggle
                  label="Hardgate"
                  checked={hardgate}
                  onCheckedChange={setHardgate}
                />
                <DashboardToggle
                  label="Blocks Toggle?"
                  checked={blocksToggle}
                  onCheckedChange={setBlocksToggle}
                />
              </div>

              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Due"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  options={FORM_RULE_FORM.dueOptions}
                />
                <DashboardTextField
                  label="Applies From"
                  value={appliesFrom}
                  onChange={(e) => setAppliesFrom(e.target.value)}
                  placeholder="MM/DD/YYYY"
                />
              </DashboardFormGrid>
            </div>
          ),
        },
      ]}
    />
  );
}
