"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextAreaField,
  DashboardTextField,
  DashboardToolbarButton,
  cn,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { ApiError } from "@dark-horse-safety/api-client";
import { crmApi } from "@/lib/crm-api";
import { parseMoney, toIsoDate } from "@/lib/crm-ui";
import { toastApiError, toastSuccess, toastValidationError } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";

type FieldErrors = Record<string, string | undefined>;

type AddressParts = {
  street: string;
  suite: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  country: string;
};

type PendingFile = {
  name: string;
  sizeLabel: string;
  contentBase64: string;
  mimeType: string;
};

const EMPTY_ADDRESS: AddressParts = {
  street: "",
  suite: "",
  city: "",
  state: "TX",
  zip: "",
  county: "",
  country: "USA",
};

const URL_RE = /^https?:\/\/([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;
const NS_RE = /^NS-\d{7}$/i;
const ISN_RE = /^ISN-\d{8}$/i;
const VF_RE = /^VF-\d{7}$/i;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToPending(file: File): Promise<PendingFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve({
        name: file.name,
        sizeLabel: formatBytes(file.size),
        contentBase64: result,
        mimeType: file.type || "application/octet-stream",
      });
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

function serializeAddress(a: AddressParts): string {
  return JSON.stringify({
    street: a.street.trim(),
    suite: a.suite.trim(),
    city: a.city.trim(),
    state: a.state.trim(),
    zip: a.zip.trim(),
    county: a.county.trim(),
    country: a.country.trim() || "USA",
  });
}

function parseAddress(raw?: string | null): AddressParts {
  if (!raw?.trim()) return { ...EMPTY_ADDRESS };
  try {
    const parsed = JSON.parse(raw) as Partial<AddressParts>;
    if (parsed && typeof parsed === "object" && "street" in parsed) {
      return {
        street: parsed.street ?? "",
        suite: parsed.suite ?? "",
        city: parsed.city ?? "",
        state: parsed.state ?? "TX",
        zip: parsed.zip ?? "",
        county: parsed.county ?? "",
        country: parsed.country ?? "USA",
      };
    }
  } catch {
    /* plain text fallback */
  }
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const cityLine = lines[1] ?? "";
  const cityMatch = cityLine.match(/^([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/i);
  return {
    street: lines[0] ?? raw,
    suite: "",
    city: cityMatch?.[1]?.trim() ?? "",
    state: cityMatch?.[2]?.toUpperCase() ?? "TX",
    zip: cityMatch?.[3] ?? "",
    county: lines[2] ?? "",
    country: lines[3] ?? "USA",
  };
}

function addressSummary(a: AddressParts) {
  const line = [a.street, a.suite].filter(Boolean).join(", ");
  const city = [a.city, a.state, a.zip].filter(Boolean).join(", ");
  return [line, city].filter(Boolean).join(" — ").toUpperCase() || "—";
}

function isPastDate(value: string) {
  const iso = toIsoDate(value);
  if (!iso) return false;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

function isoToDisplayDate(iso?: string | null) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.slice(0, 10));
  if (!m) return iso;
  return `${m[2]}/${m[3]}/${m[1]}`;
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return (name.slice(0, 2) || "CU").toUpperCase();
}

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Shared Add / Edit Customer screen — Figma layout + field validation.
 * Errors show on submit; typing / changing a field clears that field's error.
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
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(!isEdit);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [existingDuplicateId, setExistingDuplicateId] = React.useState<
    string | null
  >(null);

  const [repOptions, setRepOptions] = React.useState<DashboardSelectOption[]>(
    [],
  );
  const [industryOptions, setIndustryOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [statusOptions, setStatusOptions] = React.useState<
    DashboardSelectOption[]
  >([
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
    { value: "NEEDS_REVIEW", label: "Needs review" },
  ]);
  const [paymentOptions, setPaymentOptions] = React.useState<
    DashboardSelectOption[]
  >([
    { value: "Net 15", label: "Net 15" },
    { value: "Net 30", label: "Net 30" },
    { value: "Net 60", label: "Net 60" },
  ]);
  const [pricingOptions, setPricingOptions] = React.useState<
    DashboardSelectOption[]
  >([
    { value: "Standard", label: "Standard" },
    { value: "Enterprise", label: "Enterprise" },
    { value: "Custom", label: "Custom" },
  ]);
  const [typeOptions, setTypeOptions] = React.useState<DashboardSelectOption[]>(
    [
      { value: "OPERATOR", label: "Operator" },
      { value: "CONTRACTOR", label: "Contractor" },
      { value: "VENDOR", label: "Vendor" },
      { value: "PARTNER", label: "Partner" },
    ],
  );
  const [sourceOptions, setSourceOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [formChipOptions, setFormChipOptions] = React.useState<
    { id: string; label: string }[]
  >([
    { id: "JSA", label: "JSA" },
    { id: "PERMIT TO WORK", label: "Permit To Work" },
    { id: "EQUIPMENT INSPECTION", label: "Equipment Inspection" },
  ]);
  const [stateOptions, setStateOptions] = React.useState<
    DashboardSelectOption[]
  >([
    { value: "TX", label: "TX" },
    { value: "NM", label: "NM" },
    { value: "OK", label: "OK" },
  ]);
  const [countyOptions, setCountyOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [parentOptions, setParentOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [contactOptions, setContactOptions] = React.useState<
    DashboardSelectOption[]
  >([]);

  const [customerCode, setCustomerCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [legalEntityName, setLegalEntityName] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [assignedRep, setAssignedRep] = React.useState("");
  const [industry, setIndustry] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [parentCompanyId, setParentCompanyId] = React.useState("");
  const [customerType, setCustomerType] = React.useState("");
  const [primaryContactId, setPrimaryContactId] = React.useState("");
  const [source, setSource] = React.useState("");
  const [accountNotes, setAccountNotes] = React.useState("");
  const [billing, setBilling] = React.useState<AddressParts>({
    ...EMPTY_ADDRESS,
  });
  const [mailing, setMailing] = React.useState<AddressParts>({
    ...EMPTY_ADDRESS,
  });
  const [sameAsBilling, setSameAsBilling] = React.useState(true);
  const [paymentTerms, setPaymentTerms] = React.useState("");
  const [creditLimit, setCreditLimit] = React.useState("");
  const [taxExempt, setTaxExempt] = React.useState(false);
  const [taxId, setTaxId] = React.useState("");
  const [pricingTier, setPricingTier] = React.useState("Standard");
  const [netsuiteId, setNetsuiteId] = React.useState("");
  const [isnId, setIsnId] = React.useState("");
  const [veriforceId, setVeriforceId] = React.useState("");
  const [msaOnFile, setMsaOnFile] = React.useState(false);
  const [msaExpiry, setMsaExpiry] = React.useState("");
  const [coiExpiry, setCoiExpiry] = React.useState("");
  const [w9OnFile, setW9OnFile] = React.useState(false);
  const [clockInRadius, setClockInRadius] = React.useState("1000 FT");
  const [radiusOverride, setRadiusOverride] = React.useState(false);
  const [requiresPo, setRequiresPo] = React.useState(false);
  const [requiredForms, setRequiredForms] = React.useState<string[]>([
    "JSA",
    "PERMIT TO WORK",
    "EQUIPMENT INSPECTION",
  ]);
  const [addingForm, setAddingForm] = React.useState(false);
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [logoMeta, setLogoMeta] = React.useState<string | null>(null);
  const [logoPending, setLogoPending] = React.useState<PendingFile | null>(
    null,
  );
  const [msaFile, setMsaFile] = React.useState<PendingFile | null>(null);
  const [coiFile, setCoiFile] = React.useState<PendingFile | null>(null);
  const [w9File, setW9File] = React.useState<PendingFile | null>(null);
  const [existingDocs, setExistingDocs] = React.useState<
    { id: string; name: string; kind?: string | null }[]
  >([]);

  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const msaInputRef = React.useRef<HTMLInputElement>(null);
  const coiInputRef = React.useRef<HTMLInputElement>(null);
  const w9InputRef = React.useRef<HTMLInputElement>(null);

  function clearError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (key === "name") setExistingDuplicateId(null);
  }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lookups, reps, parents] = await Promise.all([
          crmApi.lookups(),
          crmApi.lookupReps(),
          crmApi.listCustomers({ pageSize: 100, sort: "name", direction: "asc" }),
        ]);
        if (cancelled) return;
        const data = lookups.data;
        const mapOpts = (
          list?: { value: string; label: string }[],
        ): DashboardSelectOption[] =>
          (list ?? []).map((o) => ({ value: o.value, label: o.label }));

        if (data.customerStatuses?.length) {
          setStatusOptions(mapOpts(data.customerStatuses));
        }
        const industries = data.industries ?? data.industry ?? [];
        if (industries.length) setIndustryOptions(mapOpts(industries));
        else {
          setIndustryOptions([
            { value: "Oil & Gas", label: "Oil & Gas" },
            { value: "Construction", label: "Construction" },
            { value: "Utilities", label: "Utilities" },
          ]);
        }
        if (data.paymentTerms?.length) setPaymentOptions(mapOpts(data.paymentTerms));
        if (data.pricingTiers?.length) setPricingOptions(mapOpts(data.pricingTiers));
        if (data.customerTypes?.length) {
          setTypeOptions(
            data.customerTypes.map((o) => ({
              value: o.value.toUpperCase(),
              label: o.label,
            })),
          );
        }
        if (data.leadSources?.length) setSourceOptions(mapOpts(data.leadSources));
        if (data.states?.length) setStateOptions(mapOpts(data.states));
        if (data.counties?.length) setCountyOptions(mapOpts(data.counties));
        if (data.requiredForms?.length) {
          setFormChipOptions(
            data.requiredForms.map((o) => ({
              id: o.value.toUpperCase(),
              label: o.label,
            })),
          );
        }
        setRepOptions(
          reps.data.map((r) => ({
            value: r.id,
            label:
              [r.firstName, r.lastName].filter(Boolean).join(" ").trim() ||
              r.email ||
              r.id,
          })),
        );
        setParentOptions(
          (parents.data.items ?? [])
            .filter((c) => c.id !== customerId)
            .map((c) => ({
              value: c.id,
              label: `${c.name}${c.code ? ` (${c.code})` : ""}`,
            })),
        );
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  React.useEffect(() => {
    if (!isEdit || !customerId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.getCustomer(customerId);
        if (cancelled) return;
        const c = res.data;
        setCustomerCode(c.code ?? "");
        setName(c.name ?? "");
        setLegalEntityName(c.legalEntityName ?? "");
        setStatus((c.status ?? "ACTIVE").toUpperCase());
        setAssignedRep(c.assignedRep?.id ?? "");
        setIndustry(c.industry ?? "");
        setWebsite(c.website ?? "");
        setEmail(c.email ?? "");
        setPhone(c.phone ?? "");
        setParentCompanyId(c.parentCompanyId ?? c.parentCompany?.id ?? "");
        setCustomerType((c.customerType ?? "OPERATOR").toUpperCase());
        setSource(c.source ?? "");
        setAccountNotes(c.accountNotes ?? "");
        setBilling(parseAddress(c.billingAddress));
        const mail = parseAddress(c.mailingAddress);
        const billingParsed = parseAddress(c.billingAddress);
        const same =
          !c.mailingAddress?.trim() ||
          serializeAddress(mail) === serializeAddress(billingParsed);
        setSameAsBilling(same);
        setMailing(same ? billingParsed : mail);
        setPaymentTerms(c.paymentTerms ?? "Net 30");
        setCreditLimit(c.creditLimit != null ? String(c.creditLimit) : "");
        setTaxExempt(Boolean(c.taxExempt));
        setTaxId(c.taxId ?? "");
        setPricingTier(c.pricingTier ?? "Standard");
        setNetsuiteId(c.netsuiteId ?? "");
        setIsnId(c.isnId ?? "");
        setVeriforceId(c.veriforceId ?? "");
        setMsaOnFile(Boolean(c.msaOnFile));
        setMsaExpiry(isoToDisplayDate(c.msaExpiry));
        setCoiExpiry(isoToDisplayDate(c.coiExpiry));
        setW9OnFile(Boolean(c.w9OnFile));
        setClockInRadius(c.clockInRadius ?? "1000 FT");
        setRadiusOverride(Boolean(c.clockInRadius && c.clockInRadius !== "1000 FT"));
        setRequiresPo(Boolean(c.requiresPo));
        setRequiredForms(
          (c.defaultRequiredForms ?? "")
            .split(/[,|]/)
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean),
        );
        setLogoUrl(c.logoUrl ?? null);
        setLogoMeta(c.logoUrl ? c.logoUrl.split("/").pop() ?? "Logo" : null);
        setExistingDocs(c.documents ?? []);
        setContactOptions(
          (c.contacts ?? []).map((ct) => ({
            value: ct.id,
            label: [ct.fullName, ct.roleTitle].filter(Boolean).join(" · "),
          })),
        );
        const primary = (c.contacts ?? []).find((ct) => ct.isPrimary);
        setPrimaryContactId(primary?.id ?? "");
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

  function validateClient(): FieldErrors {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Enter a customer name.";
    if (!status) next.status = "Select a status.";
    if (!assignedRep) next.assignedRepId = "Select an assigned rep.";
    if (!customerType) next.customerType = "Select a customer type.";
    if (!billing.street.trim()) next.billingStreet = "Enter a street.";
    if (!billing.city.trim()) next.billingCity = "Enter a city.";
    if (!billing.zip.trim()) next.billingZip = "Enter a zip.";
    if (!paymentTerms) next.paymentTerms = "Select payment terms.";

    if (website.trim() && !URL_RE.test(website.trim())) {
      next.website = "Enter a valid URL, e.g. https://example.com";
    }
    if (creditLimit.trim()) {
      const n = parseMoney(creditLimit);
      if (n == null || Number.isNaN(n)) next.creditLimit = "Enter a number.";
    }
    if (netsuiteId.trim() && !NS_RE.test(netsuiteId.trim())) {
      next.netsuiteId = "Must match format NS-#######.";
    }
    if (isnId.trim() && !ISN_RE.test(isnId.trim())) {
      next.isnId = "Must match format ISN-########.";
    }
    if (veriforceId.trim() && !VF_RE.test(veriforceId.trim())) {
      next.veriforceId = "Must match format VF-#######.";
    }
    if (msaExpiry && isPastDate(msaExpiry)) {
      next.msaExpiry = "This date has already passed.";
    }
    if (coiExpiry && isPastDate(coiExpiry)) {
      next.coiExpiry = "This date has already passed.";
    }
    return next;
  }

  function buildBody() {
    const billingAddress = serializeAddress(billing);
    const mailingAddress = sameAsBilling
      ? billingAddress
      : serializeAddress(mailing);
    return {
      name: name.trim(),
      legalEntityName: legalEntityName.trim() || undefined,
      status,
      assignedRepId: assignedRep || undefined,
      industry: industry || undefined,
      website: website.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      customerType: customerType || undefined,
      source: source || undefined,
      accountNotes: accountNotes.trim() || undefined,
      logoUrl: logoUrl || undefined,
      parentCompanyId: parentCompanyId || undefined,
      billingAddress,
      mailingAddress,
      paymentTerms: paymentTerms || undefined,
      creditLimit: parseMoney(creditLimit),
      taxExempt,
      taxId: taxId.trim() || undefined,
      pricingTier: pricingTier || undefined,
      netsuiteId: netsuiteId.trim() || undefined,
      isnId: isnId.trim() || undefined,
      veriforceId: veriforceId.trim() || undefined,
      msaOnFile,
      msaExpiry: toIsoDate(msaExpiry),
      coiExpiry: toIsoDate(coiExpiry),
      w9OnFile: w9OnFile ? w9File?.name || "ON FILE" : undefined,
      clockInRadius: clockInRadius.trim() || undefined,
      requiresPo,
      defaultRequiredForms: requiredForms.join(", ") || undefined,
    };
  }

  async function uploadPendingDocs(id: string) {
    const jobs: Promise<unknown>[] = [];
    if (logoPending) {
      jobs.push(
        crmApi.createCustomerDocument(id, {
          name: logoPending.name,
          kind: "LOGO",
          mimeType: logoPending.mimeType,
          contentBase64: logoPending.contentBase64,
        }),
      );
    }
    if (msaFile) {
      jobs.push(
        crmApi.createCustomerDocument(id, {
          name: msaFile.name,
          kind: "MSA",
          mimeType: msaFile.mimeType,
          contentBase64: msaFile.contentBase64,
          expiresAt: toIsoDate(msaExpiry) ?? undefined,
        }),
      );
    }
    if (coiFile) {
      jobs.push(
        crmApi.createCustomerDocument(id, {
          name: coiFile.name,
          kind: "COI",
          mimeType: coiFile.mimeType,
          contentBase64: coiFile.contentBase64,
          expiresAt: toIsoDate(coiExpiry) ?? undefined,
        }),
      );
    }
    if (w9File) {
      jobs.push(
        crmApi.createCustomerDocument(id, {
          name: w9File.name,
          kind: "W9",
          mimeType: w9File.mimeType,
          contentBase64: w9File.contentBase64,
        }),
      );
    }
    if (jobs.length) await Promise.all(jobs);
  }

  function applyApiDetails(details?: Record<string, string[]>) {
    if (!details) return;
    const mapped: FieldErrors = {};
    for (const [key, messages] of Object.entries(details)) {
      const msg = messages[0];
      if (!msg) continue;
      if (key === "billingAddress") mapped.billingStreet = msg;
      else if (key === "existingId") setExistingDuplicateId(msg);
      else mapped[key] = msg;
    }
    setErrors((prev) => ({ ...prev, ...mapped }));
  }

  async function handleSave(addAnother = false) {
    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      toastValidationError();
      requestAnimationFrame(() => {
        const firstInvalid = document.querySelector<HTMLElement>(
          "[aria-invalid='true']",
        );
        firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
        firstInvalid?.focus();
      });
      return;
    }

    setSubmitting(true);
    setSaveError(null);
    setErrors({});
    try {
      const body = buildBody();
      let id = customerId;
      if (isEdit && customerId) {
        await crmApi.updateCustomer(customerId, body);
        toastSuccess("Customer updated");
      } else {
        const created = await crmApi.createCustomer(body);
        id = created.data.id;
        toastSuccess("Customer created");
      }
      if (id) {
        try {
          await uploadPendingDocs(id);
        } catch (docErr) {
          toastApiError(docErr);
        }
        if (primaryContactId) {
          try {
            await crmApi.setContactPrimary(primaryContactId, id);
          } catch (primaryErr) {
            toastApiError(primaryErr);
          }
        }
      }
      if (addAnother && !isEdit) {
        setName("");
        setLegalEntityName("");
        setStatus("");
        setAssignedRep("");
        setCustomerType("");
        setPaymentTerms("");
        setAccountNotes("");
        setWebsite("");
        setEmail("");
        setPhone("");
        setBilling({ ...EMPTY_ADDRESS });
        setMailing({ ...EMPTY_ADDRESS });
        setCreditLimit("");
        setNetsuiteId("");
        setIsnId("");
        setVeriforceId("");
        setLogoPending(null);
        setLogoUrl(null);
        setMsaFile(null);
        setCoiFile(null);
        setW9File(null);
        setErrors({});
        setExistingDuplicateId(null);
      } else {
        router.push(id ? `/crm/accounts/${id}` : "/crm/accounts");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        applyApiDetails(err.details);
        setSaveError(err.message);
        toastApiError(err);
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

  const msaDoc = existingDocs.find((d) => (d.kind || "").toUpperCase() === "MSA");
  const coiDoc = existingDocs.find((d) => (d.kind || "").toUpperCase() === "COI");
  const w9Doc = existingDocs.find((d) => (d.kind || "").toUpperCase() === "W9");

  return (
    <CrmFormPageShell
      cancelHref="/crm/accounts"
      submitLabel="Save"
      submitting={submitting}
      saveError={saveError}
      onDiscardSave={() => setSaveError(null)}
      onRetrySave={() => void handleSave(false)}
      onSave={() => handleSave(false)}
      onSaveAndAddAnother={isEdit ? undefined : () => handleSave(true)}
      sections={[
        {
          title: "Company Logo",
          content: (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div
                className={cn(
                  "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#3E3E3E] bg-[#2A2A2A] font-sans text-[18px] font-[590] text-[#FDFDFF]",
                )}
              >
                {logoPending?.contentBase64 || logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPending?.contentBase64 || logoUrl || ""}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initialsFromName(name || "CU")
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {logoMeta || logoPending?.name || "No logo uploaded"}
                  {logoPending ? ` — ${logoPending.sizeLabel}` : null}
                </p>
                <div className="flex flex-wrap gap-2">
                  <DashboardToolbarButton
                    disabled={!logoPending && !logoUrl}
                    onClick={() => {
                      setLogoPending(null);
                      setLogoUrl(null);
                      setLogoMeta(null);
                    }}
                  >
                    Remove
                  </DashboardToolbarButton>
                  <DashboardToolbarButton
                    onClick={() => logoInputRef.current?.click()}
                  >
                    Replace Logo
                  </DashboardToolbarButton>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      void fileToPending(file).then((p) => {
                        setLogoPending(p);
                        setLogoMeta(`${p.name} — ${p.sizeLabel}`);
                        setLogoUrl(p.contentBase64);
                      });
                    }}
                  />
                </div>
                <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                  PNG, JPG or SVG — square works best.
                </p>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
                >
                  Click or drag to upload
                </button>
              </div>
            </div>
          ),
        },
        {
          title: "Company Details",
          content: (
            <div className="space-y-5">
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <div className="space-y-1.5">
                  <DashboardTextField
                    label="Customer Name *"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearError("name");
                    }}
                    error={errors.name}
                    placeholder="Customer name"
                  />
                  {existingDuplicateId ? (
                    <Link
                      href={`/crm/accounts/${existingDuplicateId}`}
                      className="font-sans text-[11px] uppercase text-[#E5484D] underline"
                    >
                      Open existing record →
                    </Link>
                  ) : null}
                </div>
                <DashboardTextField
                  label="Legal Entity Name"
                  value={legalEntityName}
                  onChange={(e) => setLegalEntityName(e.target.value)}
                  placeholder="Legal entity name"
                />
                <DashboardTextField
                  label="Customer ID"
                  value={isEdit ? customerCode : "Auto-generated on save"}
                  disabled
                />
                <DashboardSelectField
                  label="Status *"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    clearError("status");
                  }}
                  options={statusOptions}
                  placeholder="Select status"
                  error={errors.status}
                />
                <DashboardSelectField
                  label="Assigned Rep *"
                  value={assignedRep}
                  onChange={(e) => {
                    setAssignedRep(e.target.value);
                    clearError("assignedRepId");
                  }}
                  options={repOptions}
                  placeholder="Select rep"
                  error={errors.assignedRepId}
                />
                <DashboardSelectField
                  label="Industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  options={industryOptions}
                  placeholder="Select industry"
                />
                <DashboardTextField
                  label="Website"
                  value={website}
                  onChange={(e) => {
                    setWebsite(e.target.value);
                    clearError("website");
                  }}
                  error={errors.website}
                  placeholder="https://example.com"
                />
                <DashboardTextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="billing@example.com"
                />
                <DashboardTextField
                  label="Phone"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(432) 555-0000"
                />
                <DashboardSelectField
                  label="Parent Company"
                  value={parentCompanyId}
                  onChange={(e) => setParentCompanyId(e.target.value)}
                  options={parentOptions}
                  placeholder="Search / select…"
                />
                <DashboardSelectField
                  label="Customer Type *"
                  value={customerType}
                  onChange={(e) => {
                    setCustomerType(e.target.value);
                    clearError("customerType");
                  }}
                  options={typeOptions}
                  placeholder="Select type"
                  error={errors.customerType}
                />
                <DashboardSelectField
                  label="Primary Contact"
                  value={primaryContactId}
                  onChange={(e) => setPrimaryContactId(e.target.value)}
                  options={contactOptions}
                  placeholder="Select contact"
                  emptyMessage={
                    isEdit
                      ? "No contacts on this customer"
                      : "Add contacts after saving"
                  }
                />
                <DashboardSelectField
                  label="Source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  options={sourceOptions}
                  placeholder="Select source"
                />
                <DashboardTextAreaField
                  label="Account Notes (Internal — Not Customer-Facing)"
                  value={accountNotes}
                  onChange={(e) => setAccountNotes(e.target.value)}
                  placeholder="Internal notes"
                  containerClassName="md:col-span-2"
                  rows={5}
                />
              </DashboardFormGrid>

              <div className="space-y-3">
                <p className="font-sans text-[12px] font-normal tracking-[-0.02em] text-[#C47A7A]">
                  Billing address{" "}
                  <span className="text-[#E5484D]">*</span>
                </p>
                <DashboardFormGrid className="gap-x-4 gap-y-5">
                  <DashboardTextField
                    label="Street"
                    value={billing.street}
                    onChange={(e) => {
                      setBilling((a) => ({ ...a, street: e.target.value }));
                      clearError("billingStreet");
                      clearError("billingAddress");
                    }}
                    error={errors.billingStreet || errors.billingAddress}
                    placeholder="Street address"
                    containerClassName="md:col-span-2"
                  />
                  <DashboardTextField
                    label="Suite / Unit"
                    value={billing.suite}
                    onChange={(e) =>
                      setBilling((a) => ({ ...a, suite: e.target.value }))
                    }
                    placeholder="Suite / unit"
                  />
                  <DashboardTextField
                    label="City"
                    value={billing.city}
                    onChange={(e) => {
                      setBilling((a) => ({ ...a, city: e.target.value }));
                      clearError("billingCity");
                    }}
                    error={errors.billingCity}
                    placeholder="City"
                  />
                  <DashboardSelectField
                    label="State"
                    value={billing.state}
                    onChange={(e) =>
                      setBilling((a) => ({ ...a, state: e.target.value }))
                    }
                    options={stateOptions}
                    placeholder="Select state"
                  />
                  <DashboardTextField
                    label="Zip"
                    value={billing.zip}
                    onChange={(e) => {
                      setBilling((a) => ({ ...a, zip: e.target.value }));
                      clearError("billingZip");
                    }}
                    error={errors.billingZip}
                    placeholder="Zip"
                  />
                  <DashboardSelectField
                    label="County"
                    value={billing.county}
                    onChange={(e) =>
                      setBilling((a) => ({ ...a, county: e.target.value }))
                    }
                    options={countyOptions}
                    placeholder="Select county"
                  />
                  <DashboardTextField
                    label="Country"
                    value={billing.country}
                    onChange={(e) =>
                      setBilling((a) => ({ ...a, country: e.target.value }))
                    }
                    placeholder="Country"
                  />
                </DashboardFormGrid>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    Mailing Address
                  </p>
                  <div className="flex items-center gap-2.5">
                    <span className="font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[12px]">
                      Same As Billing
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={sameAsBilling}
                      onClick={() => {
                        const next = !sameAsBilling;
                        setSameAsBilling(next);
                        if (next) setMailing(billing);
                      }}
                      className={cn(
                        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                        sameAsBilling ? "bg-[#22C55E]" : "bg-[#3E3E3E]",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                          sameAsBilling && "translate-x-4",
                        )}
                      />
                    </button>
                  </div>
                </div>
                {sameAsBilling ? (
                  <div className="rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-3 font-sans text-[12px] font-normal uppercase leading-relaxed tracking-[-0.02em] text-[#959597] md:text-[13px]">
                    Using Billing Address — {addressSummary(billing)}
                  </div>
                ) : (
                  <DashboardFormGrid className="gap-x-4 gap-y-5">
                    <DashboardTextField
                      label="Street"
                      value={mailing.street}
                      onChange={(e) =>
                        setMailing((a) => ({ ...a, street: e.target.value }))
                      }
                      placeholder="Street address"
                      containerClassName="md:col-span-2"
                    />
                    <DashboardTextField
                      label="Suite / Unit"
                      value={mailing.suite}
                      onChange={(e) =>
                        setMailing((a) => ({ ...a, suite: e.target.value }))
                      }
                      placeholder="Suite / unit"
                    />
                    <DashboardTextField
                      label="City"
                      value={mailing.city}
                      onChange={(e) =>
                        setMailing((a) => ({ ...a, city: e.target.value }))
                      }
                      placeholder="City"
                    />
                    <DashboardSelectField
                      label="State"
                      value={mailing.state}
                      onChange={(e) =>
                        setMailing((a) => ({ ...a, state: e.target.value }))
                      }
                      options={stateOptions}
                      placeholder="Select state"
                    />
                    <DashboardTextField
                      label="Zip"
                      value={mailing.zip}
                      onChange={(e) =>
                        setMailing((a) => ({ ...a, zip: e.target.value }))
                      }
                      placeholder="Zip"
                    />
                    <DashboardSelectField
                      label="County"
                      value={mailing.county}
                      onChange={(e) =>
                        setMailing((a) => ({ ...a, county: e.target.value }))
                      }
                      options={countyOptions}
                      placeholder="Select county"
                    />
                    <DashboardTextField
                      label="Country"
                      value={mailing.country}
                      onChange={(e) =>
                        setMailing((a) => ({ ...a, country: e.target.value }))
                      }
                      placeholder="Country"
                    />
                  </DashboardFormGrid>
                )}
              </div>
            </div>
          ),
        },
        {
          title: "Commercial",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardSelectField
                label="Payment Terms *"
                value={paymentTerms}
                onChange={(e) => {
                  setPaymentTerms(e.target.value);
                  clearError("paymentTerms");
                }}
                options={paymentOptions}
                placeholder="Select terms"
                error={errors.paymentTerms}
              />
              <DashboardTextField
                label="Credit Limit"
                value={creditLimit}
                onChange={(e) => {
                  setCreditLimit(e.target.value);
                  clearError("creditLimit");
                }}
                error={errors.creditLimit}
                placeholder="$50,000.00"
              />
              <div className="flex flex-col gap-2">
                <span className="font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
                  Tax Exempt?
                </span>
                <div className="flex h-10 items-center">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={taxExempt}
                    onClick={() => setTaxExempt(!taxExempt)}
                    className={cn(
                      "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                      taxExempt ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform",
                        taxExempt
                          ? "translate-x-4 bg-[#1A1A1A]"
                          : "bg-[#959597]",
                      )}
                    />
                  </button>
                </div>
              </div>
              <DashboardTextField
                label="Tax ID"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="82-3749201"
              />
              <DashboardSelectField
                label="Default Pricing Tier"
                value={pricingTier}
                onChange={(e) => setPricingTier(e.target.value)}
                options={pricingOptions}
                placeholder="Select tier"
                containerClassName="md:col-span-2"
                hint="Sets the default rate card applied to new quotes for this customer. Tiers, low to high: Standard, Preferred, Enterprise. Manage what each tier includes in Settings → Pricing Tiers."
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
                onChange={(e) => {
                  setNetsuiteId(e.target.value);
                  clearError("netsuiteId");
                }}
                error={errors.netsuiteId}
                placeholder="NS-829471"
              />
              <DashboardTextField
                label="ISN ID"
                value={isnId}
                onChange={(e) => {
                  setIsnId(e.target.value);
                  clearError("isnId");
                }}
                error={errors.isnId}
                placeholder="ISN-40058723"
              />
              <DashboardTextField
                label="Veriforce ID"
                value={veriforceId}
                onChange={(e) => {
                  setVeriforceId(e.target.value);
                  clearError("veriforceId");
                }}
                error={errors.veriforceId}
                placeholder="VF-2039185"
                containerClassName="md:col-span-2"
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Compliance",
          content: (
            <div className="space-y-5">
              <div className="space-y-3">
                <span className="font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
                  MSA On File
                </span>
                <ComplianceOnFileToggle
                  checked={msaOnFile}
                  onCheckedChange={setMsaOnFile}
                />
              </div>

              <div className="space-y-2">
                <DashboardTextField
                  label="MSA Expiry"
                  value={msaExpiry}
                  onChange={(e) => {
                    setMsaExpiry(e.target.value);
                    clearError("msaExpiry");
                  }}
                  error={errors.msaExpiry}
                  placeholder="MM/DD/YYYY"
                />
                <ComplianceFileRow
                  name={msaFile?.name || msaDoc?.name}
                  size={msaFile?.sizeLabel}
                  onUpload={() => msaInputRef.current?.click()}
                  onReplace={() => msaInputRef.current?.click()}
                  onClear={() => {
                    setMsaFile(null);
                    setMsaOnFile(false);
                  }}
                />
                <input
                  ref={msaInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    void fileToPending(file).then((p) => {
                      setMsaFile(p);
                      setMsaOnFile(true);
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                <DashboardTextField
                  label="COI Expiry"
                  value={coiExpiry}
                  onChange={(e) => {
                    setCoiExpiry(e.target.value);
                    clearError("coiExpiry");
                  }}
                  error={errors.coiExpiry}
                  placeholder="MM/DD/YYYY"
                />
                <ComplianceFileRow
                  name={coiFile?.name || coiDoc?.name}
                  size={coiFile?.sizeLabel}
                  onUpload={() => coiInputRef.current?.click()}
                  onReplace={() => coiInputRef.current?.click()}
                  onClear={() => setCoiFile(null)}
                />
                <input
                  ref={coiInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    void fileToPending(file).then(setCoiFile);
                  }}
                />
              </div>

              <div className="space-y-2">
                <span className="font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
                  W-9 On File
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <ComplianceOnFileToggle
                    checked={w9OnFile}
                    onCheckedChange={setW9OnFile}
                  />
                  <ComplianceFileRow
                    name={w9File?.name || w9Doc?.name}
                    size={w9File?.sizeLabel}
                    onUpload={() => w9InputRef.current?.click()}
                    onReplace={() => w9InputRef.current?.click()}
                    onClear={() => {
                      setW9File(null);
                      setW9OnFile(false);
                    }}
                    inline
                  />
                </div>
                <input
                  ref={w9InputRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    void fileToPending(file).then((p) => {
                      setW9File(p);
                      setW9OnFile(true);
                    });
                  }}
                />
              </div>
            </div>
          ),
        },
        {
          title: "Operational Defaults",
          content: (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <span className="font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    Default Clock-in Radius
                  </span>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      value={clockInRadius}
                      onChange={(e) => {
                        setClockInRadius(e.target.value);
                        setRadiusOverride(true);
                      }}
                      disabled={!radiusOverride}
                      className={cn(
                        "h-10 min-w-0 flex-1 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] outline-none transition-colors focus:border-[#5A5A5A] disabled:cursor-not-allowed disabled:opacity-60 md:text-[13px]",
                      )}
                    />
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setClockInRadius("1000 FT");
                          setRadiusOverride(false);
                        }}
                        className={cn(
                          "h-10 rounded-lg border border-[#3E3E3E] px-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] transition-colors",
                          !radiusOverride
                            ? "bg-[#2A2A2A] text-[#959597]"
                            : "bg-[#1F1F1F] text-[#6F6F72] hover:text-[#959597]",
                        )}
                      >
                        System Default
                      </button>
                      <button
                        type="button"
                        onClick={() => setRadiusOverride(true)}
                        className={cn(
                          "h-10 rounded-lg border border-[#3E3E3E] px-3 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] transition-colors",
                          radiusOverride
                            ? "bg-[#353535] text-[#FDFDFF]"
                            : "bg-[#2A2A2A] text-[#959597] hover:text-[#FDFDFF]",
                        )}
                      >
                        Set Override
                      </button>
                    </div>
                  </div>
                </div>
                <div className="relative flex h-[88px] w-full max-w-[140px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#2D2D30] bg-[#141414]">
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage:
                        "linear-gradient(#2A2A2A 1px, transparent 1px), linear-gradient(90deg, #2A2A2A 1px, transparent 1px)",
                      backgroundSize: "14px 14px",
                    }}
                  />
                  <div className="relative flex h-[62px] w-[62px] items-center justify-center">
                    <span className="absolute inset-0 rounded-full border border-dashed border-[#3B82F6]/70" />
                    <span className="absolute inset-2 rounded-full border border-[#3B82F6]/35" />
                    <span className="h-2 w-2 rounded-full bg-[#E5484D] shadow-[0_0_0_3px_rgba(229,72,77,0.25)]" />
                  </div>
                  <span className="absolute bottom-1.5 left-1.5 rounded bg-[#1A1A1A]/90 px-1.5 py-0.5 font-sans text-[9px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    {clockInRadius.trim() || "1000 FT"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 py-1">
                <span className="font-sans text-[12px] font-normal uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  Requires PO Before Invoice?
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={requiresPo}
                  onClick={() => setRequiresPo(!requiresPo)}
                  className={cn(
                    "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                    requiresPo ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform",
                      requiresPo
                        ? "translate-x-4 bg-[#1A1A1A]"
                        : "bg-[#959597]",
                    )}
                  />
                </button>
              </div>

              <div className="space-y-2">
                <span className="font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
                  Default Required Forms
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {requiredForms.map((form) => (
                    <span
                      key={form}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#3E3E3E] bg-[#2A2A2A] px-2.5 py-1.5 font-sans text-[11px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]"
                    >
                      {form}
                      <button
                        type="button"
                        aria-label={`Remove ${form}`}
                        onClick={() =>
                          setRequiredForms((prev) =>
                            prev.filter((f) => f !== form),
                          )
                        }
                        className="text-[#959597] hover:text-[#FDFDFF]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAddingForm((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-md border border-dashed border-[#3E3E3E] bg-transparent px-2.5 py-1.5 font-sans text-[11px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#959597] transition-colors hover:border-[#5A5A5A] hover:text-[#FDFDFF]"
                  >
                    + Add Form
                  </button>
                </div>
                {addingForm ? (
                  <div className="flex flex-wrap gap-2 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] p-2">
                    {(formChipOptions.length
                      ? formChipOptions
                      : [
                          { id: "JSA", label: "JSA" },
                          { id: "PERMIT TO WORK", label: "Permit to Work" },
                          {
                            id: "EQUIPMENT INSPECTION",
                            label: "Equipment Inspection",
                          },
                          { id: "JHA", label: "JHA" },
                          { id: "HOT WORK", label: "Hot Work" },
                        ]
                    )
                      .filter((o) => !requiredForms.includes(o.id))
                      .map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setRequiredForms((prev) => [...prev, opt.id]);
                            setAddingForm(false);
                          }}
                          className="rounded-md border border-[#3E3E3E] bg-[#2A2A2A] px-2.5 py-1.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-[#353535]"
                        >
                          {opt.label}
                        </button>
                      ))}
                    {(formChipOptions.length
                      ? formChipOptions
                      : [
                          { id: "JSA", label: "JSA" },
                          { id: "PERMIT TO WORK", label: "Permit to Work" },
                          {
                            id: "EQUIPMENT INSPECTION",
                            label: "Equipment Inspection",
                          },
                        ]
                    ).every((o) => requiredForms.includes(o.id)) ? (
                      <span className="px-1 font-sans text-[10px] uppercase text-[#6F6F72]">
                        All forms added
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <p className="max-w-3xl font-sans text-[10px] uppercase leading-relaxed tracking-[-0.02em] text-[#6F6F72]">
                  Automatically required on every new work order for this
                  customer. Techs cannot complete a work order until these forms
                  are submitted.
                </p>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}

function ComplianceOnFileToggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-[#22C55E]" : "bg-[#3E3E3E]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            checked && "translate-x-4",
          )}
        />
      </button>
      <span className="font-sans text-[12px] font-normal uppercase tracking-[-0.02em] text-[#FDFDFF]">
        On File
      </span>
    </div>
  );
}

function ComplianceFileRow({
  name,
  size,
  onUpload,
  onReplace,
  onClear,
  inline = false,
}: {
  name?: string | null;
  size?: string;
  onUpload: () => void;
  onReplace: () => void;
  onClear: () => void;
  inline?: boolean;
}) {
  const hasFile = Boolean(name?.trim());
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3",
        inline ? "min-w-0 flex-1" : "",
      )}
    >
      {hasFile ? (
        <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-2.5 py-1.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className="shrink-0 text-[#959597]"
          >
            <path
              d="M4.5 1.5h5.086L13.5 5.414V13.5a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M9.5 1.5V5.5H13.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
          <span className="truncate font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            {name}
          </span>
          {size ? (
            <span className="shrink-0 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
              {size}
            </span>
          ) : null}
          <button
            type="button"
            aria-label={`Remove ${name}`}
            onClick={onClear}
            className="shrink-0 text-[#959597] hover:text-[#FDFDFF]"
          >
            ×
          </button>
        </span>
      ) : (
        <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#6F6F72]">
          No file attached
        </span>
      )}
      <button
        type="button"
        onClick={onUpload}
        className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] underline underline-offset-2 hover:text-white"
      >
        Upload
      </button>
      <button
        type="button"
        onClick={onReplace}
        className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] underline underline-offset-2 hover:text-white"
      >
        Replace
      </button>
    </div>
  );
}
