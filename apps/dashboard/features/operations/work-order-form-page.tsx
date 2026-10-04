"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardBadge,
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  DashboardToolbarButton,
  cn,
  type DashboardBadgeVariant,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { CrmFormPageShell } from "@/features/crm/crm-form-page-shell";
import { ApiError } from "@dark-horse-safety/api-client";
import { crmApi, type CrmWorkOrderFormOptions } from "@/lib/crm-api";
import { operationsApi } from "@/lib/operations-api";
import { toastApiError, toastSuccess } from "@/lib/toast";

function defaultDateTime(daysFromNow: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRunLabel(isoLocal: string) {
  if (!isoLocal) return "—";
  const d = new Date(isoLocal);
  if (Number.isNaN(d.getTime())) return isoLocal;
  return (
    d
      .toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(",", "")
      .toUpperCase() + " CT"
  );
}

function nextMonthlyLabels(startIso: string, count: number) {
  if (!startIso) return [] as string[];
  const base = new Date(startIso);
  if (Number.isNaN(base.getTime())) return [];
  const out: string[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(base);
    d.setMonth(d.getMonth() + i);
    out.push(
      d
        .toLocaleDateString("en-US", { month: "short", day: "numeric" })
        .toUpperCase(),
    );
  }
  return out;
}

function assetTone(tone?: string): DashboardBadgeVariant {
  if (tone === "success") return "success";
  if (tone === "warning") return "warning";
  if (tone === "review") return "review";
  return "operations";
}

export function WorkOrderFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("customerId") ?? "";
  const quoteIdParam = searchParams.get("quoteId") ?? "";

  const [options, setOptions] = React.useState<CrmWorkOrderFormOptions | null>(
    null,
  );
  const [customer, setCustomer] = React.useState(customerIdParam);
  const [locationId, setLocationId] = React.useState("");
  const [poAfe, setPoAfe] = React.useState("");
  const [countyState, setCountyState] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [pricingRule, setPricingRule] = React.useState("MSA - $160 / HR");
  const [jobType, setJobType] = React.useState("CONFINED SPACE STANDBY");
  const [subcategory, setSubcategory] = React.useState("VESSEL ENTRY - H2S");
  const [jobStart, setJobStart] = React.useState(() => defaultDateTime(0, 6));
  const [estimatedEnd, setEstimatedEnd] = React.useState(() =>
    defaultDateTime(1, 18),
  );
  const [quoteId, setQuoteId] = React.useState(quoteIdParam);
  const [truck, setTruck] = React.useState("");
  const [assetPackage, setAssetPackage] = React.useState("CONFINED-SPACE KIT");
  const [techIds, setTechIds] = React.useState<string[]>([]);
  const [forms, setForms] = React.useState<Record<string, boolean>>({
    jsa: true,
    ptw: true,
    aqt: true,
  });
  const [scope, setScope] = React.useState("");
  const [recurring, setRecurring] = React.useState(true);
  const [repeatRule, setRepeatRule] = React.useState("EVERY 1 MONTH");
  const [endsAfter, setEndsAfter] = React.useState("12");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await crmApi.workOrderFormOptions();
        if (cancelled) return;
        setOptions(res.data);
        if (!customerIdParam && res.data.customers[0]) {
          setCustomer((prev) => prev || res.data.customers[0]!.value);
        }
        const defaultTruck =
          res.data.trucks.find((t) => t.value.includes("DHS-1017"))?.value ||
          res.data.trucks.find((t) => t.value)?.value ||
          "";
        setTruck((prev) => prev || defaultTruck);
        // Pre-select first two techs like Figma
        const seedTechs = res.data.technicians.slice(0, 2).map((t) => t.value);
        setTechIds((prev) => (prev.length ? prev : seedTechs));
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerIdParam]);

  const locationOptions: DashboardSelectOption[] = React.useMemo(() => {
    const locs = (options?.locations ?? []).filter(
      (l) => !customer || l.customerId === customer,
    );
    return [
      { value: "", label: "SELECT LOCATION…" },
      ...locs.map((l) => ({
        value: l.value,
        label: l.meta ? `${l.label} · ${l.meta}` : l.label,
      })),
    ];
  }, [options, customer]);

  const quoteOptions: DashboardSelectOption[] = React.useMemo(() => {
    const qs = (options?.quotes ?? []).filter(
      (q) => !customer || q.customerId === customer,
    );
    return [
      { value: "", label: "SELECT APPROVED QUOTE…" },
      ...qs.map((q) => ({
        value: q.value,
        label: `${q.label} · ${q.status}`,
      })),
    ];
  }, [options, customer]);

  const assetRows = React.useMemo(() => {
    const all = options?.assetItems ?? [];
    const matched = all.filter((a) => a.packageId === assetPackage);
    return matched.length
      ? matched
      : all.filter((a) => a.packageId === "CONFINED-SPACE KIT");
  }, [options, assetPackage]);

  const selectedTechs = React.useMemo(
    () =>
      (options?.technicians ?? []).filter((t) => techIds.includes(t.value)),
    [options, techIds],
  );

  const nextRuns = React.useMemo(
    () => nextMonthlyLabels(jobStart, 11),
    [jobStart],
  );

  function toggleTech(id: string) {
    setTechIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function addNextTech() {
    const next = options?.technicians.find((t) => !techIds.includes(t.value));
    if (next) toggleTech(next.value);
  }

  async function handleSave() {
    if (!customer) {
      toastApiError(new Error("Customer is required"));
      return;
    }
    setSubmitting(true);
    try {
      const serviceDate = jobStart ? jobStart.slice(0, 10) : undefined;
      const formLabels = (options?.requiredForms ?? [])
        .filter((f) => forms[f.id] ?? f.defaultChecked)
        .map((f) => f.label)
        .join(", ");
      const notesParts = [
        poAfe ? `PO/AFE: ${poAfe}` : null,
        countyState ? `County/State: ${countyState}` : null,
        contact ? `Contact: ${contact}` : null,
        pricingRule ? `Pricing: ${pricingRule}` : null,
        subcategory ? `Subcategory: ${subcategory}` : null,
        truck ? `Truck: ${truck}` : null,
        assetPackage ? `Asset package: ${assetPackage}` : null,
        selectedTechs.length
          ? `Technicians: ${selectedTechs.map((t) => t.label).join(", ")}`
          : null,
        formLabels ? `Required forms: ${formLabels}` : null,
        recurring
          ? `Recurring: ${repeatRule}; ends after ${endsAfter} work orders`
          : null,
        scope || null,
      ].filter(Boolean);

      let woId: string | undefined;

      if (quoteId && jobType && locationId && serviceDate) {
        try {
          const converted = await crmApi.convertQuoteToWorkOrder(quoteId, {
            jobType,
            locationId,
            serviceDate,
          });
          woId = converted.data?.id;
        } catch (err) {
          if (err instanceof ApiError && err.code === "CONVERT_BLOCKED") {
            toastApiError(err);
            return;
          }
        }
      }

      if (!woId) {
        const created = await crmApi.createWorkOrder({
          customerId: customer,
          locationId: locationId || undefined,
          category: jobType || undefined,
          title: subcategory || jobType || undefined,
          serviceDate,
          status: "OPEN",
          scheduledStart: jobStart || undefined,
          scheduledEnd: estimatedEnd || undefined,
          notes: notesParts.join("\n") || undefined,
          quoteId: quoteId || undefined,
        });
        woId = created.data?.id;
      }

      if (recurring && customer && jobType) {
        try {
          await operationsApi.createRecurringSeries({
            customerId: customer,
            jobType,
            frequency: "MONTHLY",
            nextOccurrence: serviceDate,
            generatedCount: 1,
            remainingCount: Math.max(0, Number(endsAfter) - 1) || 11,
            notes: `From create WO · ${repeatRule}`,
          });
        } catch {
          // WO still created; series is best-effort
        }
      }

      toastSuccess(
        recurring ? "Work order + recurring series created" : "Work order created",
      );
      router.push(
        woId ? `/operations/work-orders/${woId}` : "/operations/work-orders",
      );
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CrmFormPageShell
      cancelHref="/operations/work-orders"
      submitLabel="Create Work Order"
      submitting={submitting}
      onSave={handleSave}
      sections={[
        {
          title: "Customer & Job",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardSelectField
                label="Customer"
                value={customer}
                onChange={(e) => {
                  setCustomer(e.target.value);
                  setLocationId("");
                  setQuoteId("");
                }}
                options={[
                  { value: "", label: "SELECT CUSTOMER…" },
                  ...(options?.customers ?? []),
                ]}
              />
              <DashboardTextField
                label="PO / AFE Number"
                value={poAfe}
                onChange={(e) => setPoAfe(e.target.value)}
                placeholder="E.G. AFE-2026-11B"
              />
              <DashboardSelectField
                label="Location / Well"
                value={locationId}
                onChange={(e) => {
                  const v = e.target.value;
                  setLocationId(v);
                  const loc = options?.locations.find((l) => l.value === v);
                  if (loc?.meta) setCountyState(loc.meta.toUpperCase());
                }}
                options={locationOptions}
              />
              <DashboardTextField
                label="County / State"
                value={countyState}
                onChange={(e) => setCountyState(e.target.value)}
                placeholder="REEVES COUNTY, TX"
              />
              <DashboardTextField
                label="Contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="MIKE TREVINO - (432) 555-0148"
              />
              <DashboardSelectField
                label="Pricing Rule"
                value={pricingRule}
                onChange={(e) => setPricingRule(e.target.value)}
                options={
                  options?.pricingRules?.length
                    ? options.pricingRules
                    : [
                        {
                          value: "MSA - $160 / HR",
                          label: "MSA - $160 / HR",
                        },
                      ]
                }
              />
              <DashboardSelectField
                label="Job Type"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                options={options?.jobTypes ?? []}
              />
              <DashboardSelectField
                label="Subcategory"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                options={options?.subcategories ?? []}
              />
              <DashboardTextField
                label="Job Start"
                type="datetime-local"
                value={jobStart}
                onChange={(e) => setJobStart(e.target.value)}
              />
              <DashboardTextField
                label="Estimated End"
                type="datetime-local"
                value={estimatedEnd}
                onChange={(e) => setEstimatedEnd(e.target.value)}
              />
              <DashboardSelectField
                label="Source Quote"
                value={quoteId}
                onChange={(e) => setQuoteId(e.target.value)}
                options={quoteOptions}
              />
              <DashboardTextField
                label="Quote Status"
                value={
                  options?.quotes.find((q) => q.value === quoteId)?.status ??
                  "SELECT A QUOTE TO LINK"
                }
                readOnly
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Recurring Schedule",
          content: (
            <div className="space-y-4">
              <div className="flex items-center justify-end">
                <label className="flex items-center gap-3">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    Monthly
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={recurring}
                    onClick={() => setRecurring((v) => !v)}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors",
                      recurring ? "bg-[#3D8B6E]" : "bg-[#3E3E3E]",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                        recurring ? "left-5" : "left-0.5",
                      )}
                    />
                  </button>
                </label>
              </div>

              {recurring ? (
                <>
                  <DashboardFormGrid className="gap-x-4 gap-y-5">
                    <DashboardSelectField
                      label="Repeat"
                      value={repeatRule}
                      onChange={(e) => setRepeatRule(e.target.value)}
                      options={[
                        { value: "EVERY 1 MONTH", label: "EVERY 1 MONTH" },
                        { value: "EVERY 2 WEEKS", label: "EVERY 2 WEEKS" },
                        { value: "EVERY 1 WEEK", label: "EVERY 1 WEEK" },
                      ]}
                    />
                    <DashboardTextField
                      label="First Run"
                      value={formatRunLabel(jobStart)}
                      readOnly
                    />
                    <DashboardSelectField
                      label="End"
                      value={endsAfter}
                      onChange={(e) => setEndsAfter(e.target.value)}
                      options={[
                        { value: "6", label: "AFTER 6 WORK ORDERS" },
                        { value: "12", label: "AFTER 12 WORK ORDERS" },
                        { value: "24", label: "AFTER 24 WORK ORDERS" },
                      ]}
                    />
                  </DashboardFormGrid>

                  <div>
                    <p className="mb-2 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                      Next Runs
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {nextRuns.slice(0, 3).map((label) => (
                        <span
                          key={label}
                          className="rounded-md border border-[#3E3E3E] bg-[#2A2A2A] px-2.5 py-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]"
                        >
                          {label}
                        </span>
                      ))}
                      {nextRuns.length > 3 ? (
                        <span className="font-sans text-[11px] uppercase text-[#959597]">
                          + {nextRuns.length - 3} MORE
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-1">
                    <Link
                      href="/operations/recurring-series"
                      className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#8B9BB4] hover:text-[#FDFDFF]"
                    >
                      Open Series List
                    </Link>
                    <button
                      type="button"
                      className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#8B9BB4] hover:text-[#FDFDFF]"
                      onClick={() =>
                        toastSuccess("Edit schedule after series is created")
                      }
                    >
                      Edit Schedule
                    </button>
                    <button
                      type="button"
                      className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#6F6F72] hover:text-[#959597]"
                      onClick={() => setRecurring(false)}
                    >
                      Cancel Recurrence
                    </button>
                  </div>
                </>
              ) : (
                <p className="font-sans text-[11px] uppercase text-[#6F6F72]">
                  Turn on Monthly to generate a recurring series with this work
                  order.
                </p>
              )}
            </div>
          ),
        },
        {
          title: "Fleet & Assets",
          content: (
            <div className="space-y-4">
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardSelectField
                  label="Truck"
                  value={truck}
                  onChange={(e) => setTruck(e.target.value)}
                  options={options?.trucks ?? [{ value: "", label: "SELECT…" }]}
                  containerClassName="md:col-span-2"
                />
                <DashboardSelectField
                  label="Asset Package"
                  value={assetPackage}
                  onChange={(e) => setAssetPackage(e.target.value)}
                  options={options?.assetPackages ?? []}
                  containerClassName="md:col-span-2"
                />
              </DashboardFormGrid>
              <div className="space-y-2 rounded-xl border border-[#2A2A2A] bg-[#161616] p-3">
                {assetRows.map((a) => (
                  <div
                    key={a.name}
                    className="flex items-center justify-between gap-2 border-b border-[#222] py-2 last:border-0"
                  >
                    <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {a.name}
                    </span>
                    <DashboardBadge variant={assetTone(a.tone)} pill>
                      {a.status}
                    </DashboardBadge>
                  </div>
                ))}
              </div>
            </div>
          ),
        },
        {
          title: "Crew & Required Documents",
          content: (
            <div className="space-y-5">
              <div>
                <p className="mb-2 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                  Assign Technicians
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedTechs.map((t) => (
                    <span
                      key={t.value}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#3E3E3E] bg-[#2A2A2A] px-2.5 py-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]"
                    >
                      {t.label}
                      <button
                        type="button"
                        aria-label={`Remove ${t.label}`}
                        className="text-[#6F6F72] hover:text-[#FDFDFF]"
                        onClick={() => toggleTech(t.value)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <DashboardToolbarButton onClick={addNextTech}>
                    + Add
                  </DashboardToolbarButton>
                </div>
              </div>

              {selectedTechs.length > 0 ? (
                <div className="rounded-xl border border-[#2A2A2A] bg-[#161616] p-3">
                  <p className="mb-2 font-sans text-[10px] uppercase text-[#6F6F72]">
                    Eligibility Check
                  </p>
                  <div className="space-y-2">
                    {selectedTechs.map((t) => (
                      <div
                        key={t.value}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2A2A2A] font-sans text-[10px] text-[#FDFDFF]">
                            {t.label.slice(0, 1)}
                          </span>
                          <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                            {t.label}
                          </span>
                        </div>
                        <DashboardBadge
                          variant={t.eligible === false ? "error" : "success"}
                          pill
                        >
                          {t.eligibilityLabel ??
                            (t.eligible === false
                              ? "MISSING TRAINING"
                              : "ELIGIBLE")}
                        </DashboardBadge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                    Required Forms
                  </p>
                  <p className="font-sans text-[9px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    From Required Form Rules - Customer + Job Type
                  </p>
                </div>
                <ul className="space-y-2">
                  {(options?.requiredForms ?? []).map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2.5"
                    >
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#FDFDFF]"
                          checked={forms[f.id] ?? f.defaultChecked}
                          onChange={(e) =>
                            setForms((prev) => ({
                              ...prev,
                              [f.id]: e.target.checked,
                            }))
                          }
                        />
                        <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                          {f.label}
                        </span>
                      </label>
                      <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
                        {f.gate}
                      </span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-[#3E3E3E] px-3 py-2.5">
                    <span className="font-sans text-[12px] uppercase text-[#6F6F72]">
                      Add Another Form…
                    </span>
                    <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
                      Optional
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <p className="mb-2 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                  Job Details / Scope
                </p>
                <textarea
                  className="min-h-[110px] w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#6F6F72]"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder="DESCRIBE THE STANDBY SCOPE, HAZARDS, CLIENT PTW REQUIREMENTS...."
                />
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
