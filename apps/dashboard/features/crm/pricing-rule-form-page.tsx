"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { parseMoney, toIsoDate } from "@/lib/crm-ui";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";

const PRICING_FORM = {
  services: [
    { value: "Wireline Logging", label: "Wireline Logging" },
    { value: "H2S Tech", label: "H2S Tech" },
    { value: "Standby", label: "Standby" },
    { value: "Equipment Day Rate", label: "Equipment Day Rate" },
    { value: "Pump Down", label: "Pump Down" },
  ] as DashboardSelectOption[],
  rateTypes: [
    { value: "Per Job", label: "Per Job" },
    { value: "Per Hr", label: "Per Hr" },
    { value: "Per Run", label: "Per Run" },
  ] as DashboardSelectOption[],
  units: [
    { value: "Job", label: "Job" },
    { value: "Hr", label: "Hr" },
    { value: "Run", label: "Run" },
  ] as DashboardSelectOption[],
};

export function PricingRuleFormPage({
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
  const [service, setService] = React.useState("");
  const [rateType, setRateType] = React.useState("");
  const [rate, setRate] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [minimumCharge, setMinimumCharge] = React.useState("");
  const [overtimeMultiplier, setOvertimeMultiplier] = React.useState("");
  const [effectiveFrom, setEffectiveFrom] = React.useState("");
  const [effectiveTo, setEffectiveTo] = React.useState("");
  const [notes, setNotes] = React.useState("");

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
        const res = await crmApi.getPricingRule(ruleId);
        if (cancelled) return;
        const r = res.data;
        setCustomerId(r.customerId);
        setService(r.serviceItem ?? "");
        setRateType(r.rateType ?? "");
        setRate(r.rate != null ? String(r.rate) : "");
        setUnit(r.unit ?? "");
        setMinimumCharge(r.minimumCharge != null ? String(r.minimumCharge) : "");
        setOvertimeMultiplier(r.overtimeMultiplier ?? "");
        setEffectiveFrom(r.effectiveFrom ? r.effectiveFrom.slice(0, 10) : "");
        setEffectiveTo(r.effectiveTo ? r.effectiveTo.slice(0, 10) : "");
        setNotes(r.notes ?? "");
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
    if (!customerId || !service.trim() || !rate.trim()) {
      toastApiError(new Error("Customer, service, and rate are required"));
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        customerId,
        serviceItem: service,
        rateType: rateType || undefined,
        rate: parseMoney(rate) ?? rate,
        unit: unit || undefined,
        minimumCharge: parseMoney(minimumCharge),
        overtimeMultiplier: overtimeMultiplier || undefined,
        effectiveFrom: toIsoDate(effectiveFrom),
        effectiveTo: toIsoDate(effectiveTo),
        notes: notes.trim() || undefined,
        status: "ACTIVE",
      };
      if (isEdit && ruleId) {
        await crmApi.updatePricingRule(ruleId, body);
        toastSuccess("Pricing rule updated");
      } else {
        await crmApi.createPricingRule(body);
        toastSuccess("Pricing rule created");
      }
      router.push("/crm/pricing-rules");
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
      cancelHref="/crm/pricing-rules"
      submitLabel="Save"
      submitting={submitting}
      onSave={() => void handleSave()}
      sections={[
        {
          title: "Rule Details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardSelectField
                label="Customer *"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                options={customers}
              />
              <DashboardSelectField
                label="Service / Item *"
                value={service}
                onChange={(e) => setService(e.target.value)}
                options={PRICING_FORM.services}
              />
              <DashboardSelectField
                label="Rate Type *"
                value={rateType}
                onChange={(e) => setRateType(e.target.value)}
                options={PRICING_FORM.rateTypes}
              />
              <DashboardTextField
                label="Rate *"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="$0.00"
              />
              <DashboardSelectField
                label="Unit of Measurement"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                options={PRICING_FORM.units}
              />
              <DashboardTextField
                label="Minimum Charge"
                value={minimumCharge}
                onChange={(e) => setMinimumCharge(e.target.value)}
                placeholder="$0.00"
              />
              <DashboardTextField
                label="Overtime Multiplier"
                value={overtimeMultiplier}
                onChange={(e) => setOvertimeMultiplier(e.target.value)}
                placeholder="1.0X"
              />
              <DashboardTextField
                label="Effective From *"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                placeholder="MM/DD/YYYY"
              />
              <DashboardTextField
                label="Effective To"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                placeholder="MM/DD/YYYY"
              />
              <DashboardTextField
                label="Notes/Justification *"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
                containerClassName="md:col-span-2"
              />
            </DashboardFormGrid>
          ),
        },
      ]}
    />
  );
}
