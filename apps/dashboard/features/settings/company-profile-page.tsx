"use client";

import * as React from "react";
import { settingsApi, type CompanyProfile } from "@/lib/settings-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { fieldClass, labelClass, SettingsPanel } from "./settings-frame";

const NAICS = [
  "213112 - SUPPORT ACTIVITIES FOR OIL AND GAS OPERATIONS",
  "213111 - DRILLING OIL AND GAS WELLS",
];
const SIC = [
  "1389 - OIL AND GAS FIELD SERVICES, NEC",
  "1381 - DRILLING OIL AND GAS WELLS",
];
const EXECUTIVES = ["R. CRAWFORD - CEO", "M. TORRES - OPERATIONS"];
const CONTACTS = ["D. REED - SAFETY", "L. NGUYEN - PAYROLL"];

export function CompanyProfilePage() {
  useSetHeaderBreadcrumb("Settings / Company Profile");
  const [form, setForm] = React.useState<CompanyProfile | null>(null);

  React.useEffect(() => {
    void settingsApi.companyProfile().then((res) => setForm(res.data)).catch(toastApiError);
  }, []);

  function set<K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!form) return;
    const { id: _id, ...body } = form;
    try {
      const res = await settingsApi.saveCompanyProfile(body);
      setForm(res.data);
      toastSuccess("Company profile saved");
    } catch (error) {
      toastApiError(error);
    }
  }

  if (!form) return null;

  return (
    <div className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6">
      <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.14em] text-[#959597]">Settings / Company Profile</p>
      <SettingsPanel className="mt-4 p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="font-sans text-[13px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">Company profile</p>
            <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">Establishment · used on OSHA 300, compliance packets and report headers</p>
          </div>
          <button type="button" onClick={() => void save()} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Save profile</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>Company name<input className={fieldClass} value={form.companyName} onChange={(event) => set("companyName", event.target.value)} /></label>
          <label className={labelClass}>Establishment name<input className={fieldClass} value={form.establishmentName} onChange={(event) => set("establishmentName", event.target.value)} /></label>
          <label className={labelClass}>Street address<input className={fieldClass} value={form.streetAddress} onChange={(event) => set("streetAddress", event.target.value)} /></label>
          <label className={labelClass}>City · state · zip<input className={fieldClass} value={form.cityStateZip} onChange={(event) => set("cityStateZip", event.target.value)} /></label>
          <label className={labelClass}>Phone<input className={fieldClass} value={form.phone} onChange={(event) => set("phone", event.target.value)} /></label>
          <label className={labelClass}>EIN<input className={fieldClass} value={form.ein} onChange={(event) => set("ein", event.target.value)} /></label>
          <label className={labelClass}>NAICS code
            <select className={fieldClass} value={form.naicsCode} onChange={(event) => set("naicsCode", event.target.value)}>
              {[form.naicsCode, ...NAICS.filter((item) => item !== form.naicsCode)].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className={labelClass}>SIC code
            <select className={fieldClass} value={form.sicCode} onChange={(event) => set("sicCode", event.target.value)}>
              {[form.sicCode, ...SIC.filter((item) => item !== form.sicCode)].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className={labelClass}>Annual average employees<input className={fieldClass} value={form.annualAverageEmployees} onChange={(event) => set("annualAverageEmployees", event.target.value)} /></label>
          <label className={labelClass}>Total hours worked<input className={fieldClass} value={form.totalHoursWorked} onChange={(event) => set("totalHoursWorked", event.target.value)} /></label>
          <label className={labelClass}>Company executive (certifies 300A)
            <select className={fieldClass} value={form.companyExecutive} onChange={(event) => set("companyExecutive", event.target.value)}>
              {[form.companyExecutive, ...EXECUTIVES.filter((item) => item !== form.companyExecutive)].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className={labelClass}>Recordkeeping contact
            <select className={fieldClass} value={form.recordkeepingContact} onChange={(event) => set("recordkeepingContact", event.target.value)}>
              {[form.recordkeepingContact, ...CONTACTS.filter((item) => item !== form.recordkeepingContact)].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-4 font-sans text-[10px] uppercase tracking-[0.06em] text-[#959597]">Changes apply to new reports. Posted and certified forms keep the values they were generated with.</p>
      </SettingsPanel>
    </div>
  );
}
