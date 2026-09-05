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
import { parseMoney, toApiStatus, toIsoDate } from "@/lib/crm-ui";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";
import type { DashboardSelectOption } from "@dark-horse-safety/ui";

const STATUS_OPTIONS: DashboardSelectOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "needs-review", label: "Needs review" },
];
const PAYMENT_OPTIONS: DashboardSelectOption[] = [
  { value: "Net 15", label: "Net 15" },
  { value: "Net 30", label: "Net 30" },
  { value: "Net 60", label: "Net 60" },
];
const PRICING_TIER_OPTIONS: DashboardSelectOption[] = [
  { value: "Standard", label: "Standard" },
  { value: "Enterprise", label: "Enterprise" },
  { value: "Custom", label: "Custom" },
];

/**
 * Shared Add / Edit Customer screen — same UI for both modes.
 * Header title (Add Customer vs Edit Customer) comes from app-shell path.
 */
export function CustomerFormPage({
  mode,
  customerId,
}: {
  mode: "create" | "edit";
  customerId?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);
  const [repOptions, setRepOptions] = React.useState<DashboardSelectOption[]>([]);
  const [industryOptions, setIndustryOptions] = React.useState<DashboardSelectOption[]>([]);
  const [assignedRep, setAssignedRep] = React.useState("");

  const [name, setName] = React.useState("");
  const [legalEntityName, setLegalEntityName] = React.useState("");
  const [status, setStatus] = React.useState<string>("active");
  const [industry, setIndustry] = React.useState<string>("");
  const [website, setWebsite] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [billingAddress, setBillingAddress] = React.useState<string>("");
  const [mailingAddress, setMailingAddress] = React.useState("");
  const [paymentTerms, setPaymentTerms] = React.useState<string>("Net 30");
  const [creditLimit, setCreditLimit] = React.useState("");
  const [taxExempt, setTaxExempt] = React.useState<boolean>(false);
  const [taxId, setTaxId] = React.useState("");
  const [pricingTier, setPricingTier] = React.useState<string>("Standard");
  const [netsuiteId, setNetsuiteId] = React.useState("");
  const [isnId, setIsnId] = React.useState("");
  const [veriforceId, setVeriforceId] = React.useState("");
  const [msaOnFile, setMsaOnFile] = React.useState<boolean>(false);
  const [msaExpiry, setMsaExpiry] = React.useState("");
  const [coiExpiry, setCoiExpiry] = React.useState("");
  const [w9OnFile, setW9OnFile] = React.useState("");
  const [clockInRadius, setClockInRadius] = React.useState("");
  const [requiresPo, setRequiresPo] = React.useState<boolean>(false);
  const [requiredForms, setRequiredForms] = React.useState("");

  React.useEffect(() => {
    if (!isEdit || !customerId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.getCustomer(customerId);
        if (cancelled) return;
        const c = res.data;
        setName(c.name ?? "");
        setLegalEntityName(c.legalEntityName ?? "");
        setStatus((c.status ?? "ACTIVE").toLowerCase().replace(/_/g, "-"));
        setIndustry(c.industry ?? "oil-gas");
        setWebsite(c.website ?? "");
        setPhone(c.phone ?? "");
        setBillingAddress(c.billingAddress ?? "");
        setMailingAddress(c.mailingAddress ?? "");
        setPaymentTerms(c.paymentTerms ?? "net-60");
        setCreditLimit(
          c.creditLimit != null ? String(c.creditLimit) : "",
        );
        setTaxExempt(Boolean(c.taxExempt));
        setTaxId(c.taxId ?? "");
        setPricingTier(c.pricingTier ?? "enterprise");
        setNetsuiteId(c.netsuiteId ?? "");
        setIsnId(c.isnId ?? "");
        setVeriforceId(c.veriforceId ?? "");
        setMsaOnFile(Boolean(c.msaOnFile));
        setMsaExpiry(c.msaExpiry ? c.msaExpiry.slice(0, 10) : "");
        setCoiExpiry(c.coiExpiry ? c.coiExpiry.slice(0, 10) : "");
        setW9OnFile(c.w9OnFile ?? "");
        setClockInRadius(c.clockInRadius ?? "");
        setRequiresPo(Boolean(c.requiresPo));
        setRequiredForms(c.defaultRequiredForms ?? "");
        setAssignedRep(c.assignedRep?.id ?? "");
        setReady(true);
      } catch (err) {
        toastApiError(err);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, customerId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lookups, reps] = await Promise.all([
          crmApi.lookups(),
          crmApi.lookupReps(),
        ]);
        if (cancelled) return;
        const industries = lookups.data.industries ?? lookups.data.industry ?? [];
        setIndustryOptions(
          industries.length
            ? industries
            : [
                { value: "Oil & Gas", label: "Oil & Gas" },
                { value: "Construction", label: "Construction" },
                { value: "Utilities", label: "Utilities" },
              ],
        );
        setRepOptions(
          reps.data.map((r) => ({
            value: r.id,
            label:
              [r.firstName, r.lastName].filter(Boolean).join(" ").trim() ||
              r.email ||
              r.id,
          })),
        );
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function buildBody() {
    return {
      name: name.trim(),
      legalEntityName: legalEntityName.trim() || undefined,
      status: toApiStatus(status),
      industry: industry || undefined,
      website: website.trim() || undefined,
      phone: phone.trim() || undefined,
      billingAddress: billingAddress.trim() || undefined,
      mailingAddress: mailingAddress.trim() || undefined,
      paymentTerms: paymentTerms || undefined,
      creditLimit: parseMoney(creditLimit),
      taxExempt,
      taxId: taxId.trim() || undefined,
      pricingTier: pricingTier || undefined,
      assignedRepId: assignedRep || undefined,
      netsuiteId: netsuiteId.trim() || undefined,
      isnId: isnId.trim() || undefined,
      veriforceId: veriforceId.trim() || undefined,
      msaOnFile,
      msaExpiry: toIsoDate(msaExpiry),
      coiExpiry: toIsoDate(coiExpiry),
      w9OnFile: w9OnFile.trim() || undefined,
      clockInRadius: clockInRadius.trim() || undefined,
      requiresPo,
      defaultRequiredForms: requiredForms.trim() || undefined,
    };
  }

  async function handleSave(addAnother = false) {
    if (!name.trim()) {
      toastApiError(new Error("Customer name is required"));
      return;
    }
    setSubmitting(true);
    try {
      const body = buildBody();
      if (isEdit && customerId) {
        await crmApi.updateCustomer(customerId, body);
        toastSuccess("Customer updated");
      } else {
        await crmApi.createCustomer(body);
        toastSuccess("Customer created");
      }
      if (addAnother && !isEdit) {
        setName("");
      } else {
        router.push("/crm/accounts");
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

  return (
    <CrmFormPageShell
      cancelHref="/crm/accounts"
      submitLabel="Save"
      submitting={submitting}
      onSave={() => handleSave(false)}
      onSaveAndAddAnother={() => handleSave(true)}
      sections={[
        {
          title: "Company Details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="Customer Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer name"
              />
              <DashboardTextField
                label="Legal Entity Name"
                value={legalEntityName}
                onChange={(e) => setLegalEntityName(e.target.value)}
                placeholder="Legal entity name"
              />
              <DashboardTextField
                label="Customer ID"
                value={isEdit ? (customerId ?? "") : ""}
                placeholder="CUST-000000"
                disabled
              />
              <DashboardSelectField
                label="Status *"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={STATUS_OPTIONS}
              />
              <DashboardSelectField
                label="Assigned Rep *"
                value={assignedRep}
                onChange={(e) => setAssignedRep(e.target.value)}
                options={repOptions}
              />
              <DashboardSelectField
                label="Industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                options={industryOptions}
              />
              <DashboardTextField
                label="Website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="www.example.com"
              />
              <DashboardTextField
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(432) 555-0000"
              />
              <DashboardTextField
                label="Billing Address *"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Billing address"
              />
              <DashboardTextField
                label="Mailing Address"
                value={mailingAddress}
                onChange={(e) => setMailingAddress(e.target.value)}
                placeholder="Mailing address"
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Commercial",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardSelectField
                label="Payment Terms *"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                options={PAYMENT_OPTIONS}
              />
              <DashboardTextField
                label="Credit Limit"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="$0.00"
              />
              <DashboardToggle
                label="Tax Exempt?"
                checked={taxExempt}
                onCheckedChange={setTaxExempt}
              />
              <DashboardTextField
                label="Tax ID"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="Tax ID"
              />
              <DashboardSelectField
                label="Default Pricing Tier"
                value={pricingTier}
                onChange={(e) => setPricingTier(e.target.value)}
                options={PRICING_TIER_OPTIONS}
                containerClassName="md:col-span-2"
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Integration",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="NetSuite Customer ID"
                value={netsuiteId}
                onChange={(e) => setNetsuiteId(e.target.value)}
                placeholder="NS-000000"
              />
              <DashboardTextField
                label="ISN ID"
                value={isnId}
                onChange={(e) => setIsnId(e.target.value)}
                placeholder="ISN-00000000"
              />
              <DashboardTextField
                label="Veriforce ID"
                value={veriforceId}
                onChange={(e) => setVeriforceId(e.target.value)}
                placeholder="VF-0000000"
                containerClassName="md:col-span-2"
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Compliance",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardToggle
                label="MSA on File?"
                checked={msaOnFile}
                onCheckedChange={setMsaOnFile}
              />
              <DashboardTextField
                label="MSA Expiry"
                value={msaExpiry}
                onChange={(e) => setMsaExpiry(e.target.value)}
                placeholder="MM/DD/YYYY"
              />
              <DashboardTextField
                label="COI Expiry"
                value={coiExpiry}
                onChange={(e) => setCoiExpiry(e.target.value)}
                placeholder="MM/DD/YYYY"
              />
              <DashboardTextField
                label="W-9 on File"
                value={w9OnFile}
                onChange={(e) => setW9OnFile(e.target.value)}
                placeholder="W-9 status"
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Operational Defaults",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="Default Clock In Radius"
                value={clockInRadius}
                onChange={(e) => setClockInRadius(e.target.value)}
                placeholder="Radius"
              />
              <DashboardToggle
                label="Requires PO Before Invoice?"
                checked={requiresPo}
                onCheckedChange={setRequiresPo}
              />
              <DashboardTextField
                label="Default Required Forms"
                value={requiredForms}
                onChange={(e) => setRequiredForms(e.target.value)}
                placeholder="Forms"
                containerClassName="md:col-span-2"
              />
            </DashboardFormGrid>
          ),
        },
      ]}
    />
  );
}
