"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardBadge,
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  DashboardToolbarButton,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { CrmFormPageShell } from "@/features/crm/crm-form-page-shell";
import { ApiError } from "@dark-horse-safety/api-client";
import { crmApi, type CrmWorkOrderFormOptions } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";

export function WorkOrderFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("customerId") ?? "";
  const customerName = searchParams.get("customer") ?? "";
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
  const [jobStart, setJobStart] = React.useState("");
  const [estimatedEnd, setEstimatedEnd] = React.useState("");
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
  const [recurring, setRecurring] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  useSetHeaderBreadcrumb("Operations / Create Work Order");

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
        if (customerName && customerIdParam) {
          /* keep param */
        }
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerIdParam, customerName]);

  const locationOptions: DashboardSelectOption[] = React.useMemo(() => {
    const locs = (options?.locations ?? []).filter(
      (l) => !customer || l.customerId === customer,
    );
    return [
      { value: "", label: "Select location…" },
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
      { value: "", label: "Select approved quote…" },
      ...qs.map((q) => ({
        value: q.value,
        label: `${q.label} · ${q.status}`,
      })),
    ];
  }, [options, customer]);

  function toggleTech(id: string) {
    setTechIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    if (!customer) {
      toastApiError(new Error("Customer is required"));
      return;
    }
    setSubmitting(true);
    try {
      const serviceDate = jobStart ? jobStart.slice(0, 10) : undefined;
      const notesParts = [
        poAfe ? `PO/AFE: ${poAfe}` : null,
        countyState ? `County/State: ${countyState}` : null,
        contact ? `Contact: ${contact}` : null,
        pricingRule ? `Pricing: ${pricingRule}` : null,
        subcategory ? `Subcategory: ${subcategory}` : null,
        truck ? `Truck: ${truck}` : null,
        assetPackage ? `Asset package: ${assetPackage}` : null,
        techIds.length
          ? `Technicians: ${techIds
              .map(
                (id) =>
                  options?.technicians.find((t) => t.value === id)?.label ?? id,
              )
              .join(", ")}`
          : null,
        recurring ? "Recurring: monthly series requested" : null,
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

      toastSuccess("Work order created");
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
                onChange={(e) => setCustomer(e.target.value)}
                options={[
                  { value: "", label: "Select customer…" },
                  ...(options?.customers ?? []),
                ]}
              />
              <DashboardTextField
                label="PO / AFE Number"
                value={poAfe}
                onChange={(e) => setPoAfe(e.target.value)}
                placeholder="E.g. AFE-2026-118"
              />
              <DashboardSelectField
                label="Location / Well"
                value={locationId}
                onChange={(e) => {
                  const v = e.target.value;
                  setLocationId(v);
                  const loc = options?.locations.find((l) => l.value === v);
                  if (loc?.meta) setCountyState(loc.meta);
                }}
                options={locationOptions}
              />
              <DashboardTextField
                label="County / State"
                value={countyState}
                onChange={(e) => setCountyState(e.target.value)}
                placeholder="Reeves County, TX"
              />
              <DashboardTextField
                label="Contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Mike Trevino - (432) 555-0148"
              />
              <DashboardTextField
                label="Pricing Rule"
                value={pricingRule}
                onChange={(e) => setPricingRule(e.target.value)}
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
                  (quoteId ? "Linked" : "Select a quote to link")
                }
                readOnly
              />
            </DashboardFormGrid>
          ),
        },
        {
          title: "Recurring Schedule",
          content: (
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={recurring}
                  onClick={() => setRecurring((v) => !v)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${recurring ? "bg-[#3D8B6E]" : "bg-[#3E3E3E]"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${recurring ? "left-5" : "left-0.5"}`}
                  />
                </button>
                <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                  Monthly
                </span>
              </label>
              {recurring ? (
                <p className="font-sans text-[11px] uppercase text-[#959597]">
                  Next runs will be generated after create · Jul / Aug / Sep…
                </p>
              ) : null}
            </div>
          ),
        },
        {
          title: "Fleet & Assets",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardSelectField
                label="Truck"
                value={truck}
                onChange={(e) => setTruck(e.target.value)}
                options={options?.trucks ?? [{ value: "", label: "Select…" }]}
              />
              <DashboardSelectField
                label="Asset Package"
                value={assetPackage}
                onChange={(e) => setAssetPackage(e.target.value)}
                options={options?.assetPackages ?? []}
              />
              <div className="md:col-span-2 space-y-2">
                {[
                  { name: "Gas Monitor - MX6", status: "Ready", tone: "success" as const },
                  {
                    name: "SCBA Set x2",
                    status: "Expires soon",
                    tone: "warning" as const,
                  },
                  {
                    name: "Tripod & Winch",
                    status: "Assigned",
                    tone: "review" as const,
                  },
                ].map((a) => (
                  <div
                    key={a.name}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                      {a.name}
                    </span>
                    <DashboardBadge variant={a.tone} pill>
                      {a.status}
                    </DashboardBadge>
                  </div>
                ))}
              </div>
            </DashboardFormGrid>
          ),
        },
        {
          title: "Crew & Required Documents",
          content: (
            <div className="space-y-4">
              <div>
                <p className="mb-2 font-sans text-[11px] uppercase text-[#959597]">
                  Assign Technicians
                </p>
                <div className="flex flex-wrap gap-2">
                  {(options?.technicians ?? []).slice(0, 8).map((t) => {
                    const on = techIds.includes(t.value);
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => toggleTech(t.value)}
                        className={`rounded-full border px-3 py-1 font-sans text-[11px] uppercase ${on ? "border-[#FDFDFF] bg-[#FDFDFF] text-[#111]" : "border-[#3E3E3E] text-[#C8C8C8]"}`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                  <DashboardToolbarButton
                    onClick={() => {
                      const next = options?.technicians.find(
                        (t) => !techIds.includes(t.value),
                      );
                      if (next) toggleTech(next.value);
                    }}
                  >
                    + Add
                  </DashboardToolbarButton>
                </div>
              </div>
              <div>
                <p className="mb-2 font-sans text-[11px] uppercase text-[#959597]">
                  Required Forms
                </p>
                <ul className="space-y-2">
                  {(options?.requiredForms ?? []).map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={forms[f.id] ?? f.defaultChecked}
                          onChange={(e) =>
                            setForms((prev) => ({
                              ...prev,
                              [f.id]: e.target.checked,
                            }))
                          }
                        />
                        <span className="font-sans text-[11px] uppercase text-[#FDFDFF]">
                          {f.label}
                        </span>
                      </label>
                      <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
                        {f.gate}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <DashboardTextField
                label="Job Details / Scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="Describe the standby scope, hazards, client PTW requirements…"
                containerClassName="md:col-span-2"
              />
            </div>
          ),
        },
      ]}
    />
  );
}
