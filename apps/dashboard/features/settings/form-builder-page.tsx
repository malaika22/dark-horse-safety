"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError, toastError, toastSuccess } from "@/lib/toast";
import { settingsApi, type FormSection } from "@/lib/settings-api";
import { fieldClass } from "./settings-frame";

const blankField = (): FormSection["fields"][number] => ({ id: `fld-${Date.now()}`, label: "NEW FIELD", kind: "TEXT", placeholder: "" });

export function FormBuilderPage() {
  useSetHeaderBreadcrumb("Settings / Forms / Builder");
  const router = useRouter();
  const [title, setTitle] = React.useState("FORM");
  const [sections, setSections] = React.useState<FormSection[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    void settingsApi.formDraft().then((res) => {
      if (res.data) {
        setTitle(res.data.title);
        setSections(res.data.sections);
      }
      setReady(true);
    }).catch(toastApiError);
  }, []);

  function updateSection(id: string, patch: Partial<FormSection>) {
    setSections((current) => current.map((section) => section.id === id ? { ...section, ...patch } : section));
  }

  function updateField(sectionId: string, fieldId: string, patch: Partial<FormSection["fields"][number]>) {
    setSections((current) => current.map((section) => section.id === sectionId ? { ...section, fields: section.fields.map((field) => field.id === fieldId ? { ...field, ...patch } : field) } : section));
  }

  async function generate() {
    if (!title.trim() || sections.some((section) => !section.title.trim())) {
      toastError("Title is required on the form and each section");
      return;
    }
    try {
      await settingsApi.saveFormDraft({ title, sections });
      toastSuccess("Form generated");
      router.push("/settings/forms");
    } catch (error) {
      toastApiError(error);
    }
  }

  if (!ready) return null;

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => router.push("/settings/forms")} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">← Cancel</button>
        <button type="button" onClick={() => void generate()} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Generate</button>
      </div>
      <div className="rounded-xl border border-white/10 bg-[#1C1C1E] p-4">
        <p className="font-sans text-[10px] uppercase text-[#959597]">Title</p>
        <input className={`${fieldClass} mt-1`} value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      {sections.map((section) => (
        <div key={section.id} className="rounded-xl border border-white/10 bg-[#1C1C1E] p-4">
          <div className="flex items-center justify-between gap-3">
            <label className="font-sans text-[10px] uppercase text-[#959597]">Title
              <input className={`${fieldClass} mt-1`} value={section.title} onChange={(event) => updateSection(section.id, { title: event.target.value })} />
            </label>
            <button type="button" onClick={() => updateSection(section.id, { required: !section.required })} className={`mt-4 h-6 w-11 rounded-full ${section.required ? "bg-white" : "bg-[#3A3A3C]"}`}>
              <span className={`block h-5 w-5 rounded-full bg-black ${section.required ? "ml-5" : "ml-0.5"}`} />
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {section.fields.map((field) => (
              <div key={field.id} className="flex items-center gap-2">
                <select className={`${fieldClass} max-w-[140px]`} value={field.kind} onChange={(event) => updateField(section.id, field.id, { kind: event.target.value })}>
                  <option value="TEXT">TEXT</option>
                  <option value="DROPDOWN">DROPDOWN</option>
                  <option value="CHOICE">SINGLE CHOICE</option>
                </select>
                <input className={fieldClass} value={field.label} onChange={(event) => updateField(section.id, field.id, { label: event.target.value })} />
                <button type="button" onClick={() => updateSection(section.id, { fields: section.fields.filter((item) => item.id !== field.id) })} className="text-[#C8C8CC]">🗑</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => updateSection(section.id, { fields: [...section.fields, blankField()] })} className="mt-3 font-sans text-[11px] uppercase text-[#FDFDFF]">+ Add another field</button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setSections((current) => [...current, { id: `sec-${Date.now()}`, title: "NEW SECTION", required: false, fields: [blankField()] }])}
        className="mx-auto rounded-full border border-white/15 px-4 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]"
      >
        + Add another section
      </button>
    </div>
  );
}
