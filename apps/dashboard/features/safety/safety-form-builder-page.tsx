"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@dark-horse-safety/ui";
import {
  safetyApi,
  type SafetyFieldLibraryCategory,
  type SafetyFormDetail,
  type SafetyFormField,
  type SafetyFormSection,
} from "@/lib/safety-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import { OpsDetailStateGate } from "@/features/operations/operations-states";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function DragHandle() {
  return (
    <span
      className="mt-1 flex h-8 w-5 shrink-0 cursor-grab items-center justify-center text-[#6F6F72]"
      aria-hidden
    >
      <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
        <circle cx="2" cy="2" r="1.2" />
        <circle cx="8" cy="2" r="1.2" />
        <circle cx="2" cy="8" r="1.2" />
        <circle cx="8" cy="8" r="1.2" />
        <circle cx="2" cy="14" r="1.2" />
        <circle cx="8" cy="14" r="1.2" />
      </svg>
    </span>
  );
}

function TrashBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#6F6F72] transition hover:bg-[#2A2A2A] hover:text-[#FDFDFF]"
      aria-label="Delete"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H9a2 2 0 01-2-2V7h10z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function RequiredToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
        Required
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-5 w-9 rounded-full transition",
          value ? "bg-[#A1A1A1]" : "bg-[#3E3E3E]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition",
            value ? "left-4" : "left-0.5",
          )}
        />
      </button>
    </label>
  );
}

function FieldRow({
  field,
  selected,
  onSelect,
  onChange,
  onDelete,
}: {
  field: SafetyFormField;
  selected?: boolean;
  onSelect: () => void;
  onChange: (next: SafetyFormField) => void;
  onDelete: () => void;
}) {
  if (field.type === "SIGNATURE") {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-xl p-1",
          selected && "ring-1 ring-[#3B82F6]",
        )}
        onClick={onSelect}
      >
        <div className="relative min-h-[160px] flex-1 rounded-xl border border-[#3E3E3E] bg-[#141414] p-4">
          <p className="mb-3 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            {field.label || "Signature"}
          </p>
          <div className="absolute left-4 top-10 text-[#6F6F72]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 20l4.5-1.5L19 8l-3-3L5.5 15.5 4 20z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <button
            type="button"
            className="absolute right-4 top-4 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]"
          >
            Clear
          </button>
          <div className="absolute bottom-4 left-4">
            <button
              type="button"
              className="rounded-md border border-[#3E3E3E] bg-[#1F1F1F] px-3 py-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]"
            >
              Upload Image
            </button>
          </div>
          <button
            type="button"
            className="absolute bottom-4 right-4 rounded-md bg-[#2A2A2A] px-3 py-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]"
          >
            Submit →
          </button>
        </div>
        <TrashBtn onClick={onDelete} />
      </div>
    );
  }

  if (
    field.type === "PHOTO" ||
    field.type === "STATIC_IMAGE" ||
    field.type === "DRAWING"
  ) {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-xl p-1",
          selected && "ring-1 ring-[#3B82F6]",
        )}
        onClick={onSelect}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
            {field.label || "Image"}
          </p>
          <button
            type="button"
            className="flex h-14 w-full items-center justify-center rounded-xl border border-dashed border-[#3E3E3E] bg-[#1A1A1A] font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597]"
          >
            ↑ Upload Image
          </button>
        </div>
        <TrashBtn onClick={onDelete} />
      </div>
    );
  }

  const isDropdown =
    field.type === "DROPDOWN" ||
    field.type === "SINGLE_CHOICE" ||
    field.type === "MULTIPLE_CHOICES";
  const isTextArea =
    field.type === "TEXT" &&
    /description|notes|info/i.test(field.label + (field.placeholder ?? ""));

  return (
    <div
      className={cn(
        "space-y-1.5 rounded-xl p-1",
        selected && "ring-1 ring-[#3B82F6]",
      )}
      onClick={onSelect}
    >
      <input
        className="w-full bg-transparent font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597] outline-none"
        value={field.label}
        onChange={(e) => onChange({ ...field, label: e.target.value })}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {isDropdown ? (
            <select
              className="h-11 w-full appearance-none rounded-lg border border-[#3E3E3E] bg-[#1F1F1F] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#6F6F72] outline-none"
              defaultValue=""
              disabled
            >
              <option value="">
                {field.placeholder ?? "SELECT OPTION"}
              </option>
              {(field.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : isTextArea ? (
            <textarea
              className="min-h-[72px] w-full resize-none rounded-lg border border-[#3E3E3E] bg-[#1F1F1F] px-3 py-2.5 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#6F6F72]"
              placeholder={field.placeholder ?? "WRITE DESCRIPTION"}
              readOnly
            />
          ) : (
            <input
              className="h-11 w-full rounded-lg border border-[#3E3E3E] bg-[#1F1F1F] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#6F6F72]"
              placeholder={field.placeholder ?? "WRITE INFO"}
              readOnly
            />
          )}
        </div>
        <TrashBtn onClick={onDelete} />
      </div>
    </div>
  );
}

function SectionCard({
  section,
  selectedFieldId,
  onSelectField,
  onChange,
  onDelete,
}: {
  section: SafetyFormSection;
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onChange: (next: SafetyFormSection) => void;
  onDelete: () => void;
}) {
  function updateField(idx: number, next: SafetyFormField) {
    const fields = section.fields.slice();
    fields[idx] = next;
    onChange({ ...section, fields });
  }

  function deleteField(idx: number) {
    onChange({
      ...section,
      fields: section.fields.filter((_, i) => i !== idx),
    });
  }

  function addField() {
    const id = uid("f");
    onChange({
      ...section,
      fields: [
        ...section.fields,
        {
          id,
          type: "TEXT",
          label: "NEW FIELD",
          placeholder: "WRITE INFO",
        },
      ],
    });
    onSelectField(id);
  }

  return (
    <div className="flex gap-2 rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
      <DragHandle />
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <input
            className="w-full bg-transparent font-sans text-[13px] font-medium uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
          />
          <div className="flex shrink-0 items-center gap-2">
            <RequiredToggle
              value={!!section.required}
              onChange={(required) => onChange({ ...section, required })}
            />
            <TrashBtn onClick={onDelete} />
          </div>
        </div>

        <div className="space-y-3">
          {section.fields.map((field, idx) => (
            <FieldRow
              key={field.id}
              field={field}
              selected={selectedFieldId === field.id}
              onSelect={() => onSelectField(field.id)}
              onChange={(next) => updateField(idx, next)}
              onDelete={() => deleteField(idx)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addField}
          className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#3B82F6] hover:text-[#60A5FA]"
        >
          + Add Another Field
        </button>
      </div>
    </div>
  );
}

function FieldLibraryPanel({
  library,
  selectedField,
  onAdd,
  onUpdateField,
}: {
  library: SafetyFieldLibraryCategory[];
  selectedField: SafetyFormField | null;
  onAdd: (type: string, label: string) => void;
  onUpdateField: (next: SafetyFormField) => void;
}) {
  const [tab, setTab] = React.useState<"library" | "field" | "screen">(
    "library",
  );

  React.useEffect(() => {
    if (selectedField) setTab("field");
  }, [selectedField?.id]);

  return (
    <aside className="flex w-full shrink-0 flex-col rounded-2xl border border-[#2A2A2A] bg-[#141414] lg:sticky lg:top-3 lg:w-[280px] lg:self-start">
      <div className="flex border-b border-[#2A2A2A]">
        {(
          [
            ["library", "Field Library"],
            ["field", "Field Setting"],
            ["screen", "Screen Setting"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 px-2 py-3 font-sans text-[10px] uppercase tracking-[-0.02em]",
              tab === id
                ? "border-b-2 border-[#3B82F6] text-[#FDFDFF]"
                : "text-[#6F6F72]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "library" ? (
        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-4">
          {library.map((cat) => (
            <div key={cat.category}>
              <p className="mb-2 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                {cat.category}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {cat.items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => onAdd(item.type, item.label)}
                    className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-2.5 text-left font-sans text-[10px] uppercase tracking-[-0.02em] text-[#FDFDFF] transition hover:border-[#3B82F6]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : tab === "field" ? (
        <div className="space-y-3 p-4">
          {selectedField ? (
            <>
              <label className="block space-y-1">
                <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
                  Label
                </span>
                <input
                  className="h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none"
                  value={selectedField.label}
                  onChange={(e) =>
                    onUpdateField({ ...selectedField, label: e.target.value })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
                  Placeholder
                </span>
                <input
                  className="h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#1A1A1A] px-3 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none"
                  value={selectedField.placeholder ?? ""}
                  onChange={(e) =>
                    onUpdateField({
                      ...selectedField,
                      placeholder: e.target.value,
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
                  Type
                </span>
                <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">
                  {selectedField.type}
                </p>
              </label>
              <RequiredToggle
                value={!!selectedField.required}
                onChange={(required) =>
                  onUpdateField({ ...selectedField, required })
                }
              />
              {(selectedField.type === "DROPDOWN" ||
                selectedField.type === "SINGLE_CHOICE" ||
                selectedField.type === "MULTIPLE_CHOICES") && (
                <label className="block space-y-1">
                  <span className="font-sans text-[10px] uppercase text-[#6F6F72]">
                    Options (one per line)
                  </span>
                  <textarea
                    className="min-h-[100px] w-full rounded-lg border border-[#3E3E3E] bg-[#1A1A1A] px-3 py-2 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none"
                    value={(selectedField.options ?? []).join("\n")}
                    onChange={(e) =>
                      onUpdateField({
                        ...selectedField,
                        options: e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </label>
              )}
            </>
          ) : (
            <p className="font-sans text-[12px] text-[#6F6F72]">
              Select a field on the canvas to edit its settings.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 p-4 font-sans text-[12px] text-[#6F6F72]">
          <p>Screen layout settings</p>
          <p className="text-[11px] uppercase">
            Single column canvas · Dark theme · Mobile-ready
          </p>
        </div>
      )}
    </aside>
  );
}

export function SafetyFormBuilderPage({ formId }: { formId: string }) {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<SafetyFormDetail | null>(null);
  const [title, setTitle] = React.useState("");
  const [sections, setSections] = React.useState<SafetyFormSection[]>([]);
  const [advanced, setAdvanced] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [selectedFieldId, setSelectedFieldId] = React.useState<string | null>(
    null,
  );

  useSetHeaderBreadcrumb(
    form?.title
      ? `Safety & Comp. / Forms / ${form.title}`
      : "Safety & Comp. / Forms",
  );

  useSetHeaderActions(null, [formId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await safetyApi.getForm(formId);
      setForm(res.data);
      setTitle(res.data.title);
      setSections(res.data.sections);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load form");
    } finally {
      setLoading(false);
    }
  }, [formId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const res = await safetyApi.updateForm(form.id, {
        title: title.trim() || form.title,
        sections,
      });
      setForm(res.data);
      setTitle(res.data.title);
      setSections(res.data.sections);
      setDirty(false);
      toastSuccess("Form saved");
    } catch (err) {
      toastApiError(err);
    } finally {
      setSaving(false);
    }
  }

  function updateSection(idx: number, next: SafetyFormSection) {
    setSections((prev) => {
      const copy = prev.slice();
      copy[idx] = next;
      return copy;
    });
    setDirty(true);
  }

  function deleteSection(idx: number) {
    setSections((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  }

  function addSection() {
    setSections((prev) => [
      ...prev,
      {
        id: uid("sec"),
        title: "NEW SECTION",
        required: false,
        fields: [
          {
            id: uid("f"),
            type: "TEXT",
            label: "NEW FIELD",
            placeholder: "WRITE INFO",
          },
        ],
      },
    ]);
    setDirty(true);
  }

  function addLibraryField(type: string, label: string) {
    const id = uid("f");
    setSections((prev) => {
      if (prev.length === 0) {
        return [
          {
            id: uid("sec"),
            title: "NEW SECTION",
            required: false,
            fields: [
              {
                id,
                type,
                label,
                placeholder:
                  type === "DROPDOWN" ? "SELECT OPTION" : "WRITE INFO",
                options:
                  type === "DROPDOWN"
                    ? ["OPTION 1", "OPTION 2", "OPTION 3"]
                    : undefined,
              },
            ],
          },
        ];
      }
      const copy = prev.slice();
      const last = { ...copy[copy.length - 1]! };
      last.fields = [
        ...last.fields,
        {
          id,
          type,
          label,
          placeholder: type === "DROPDOWN" ? "SELECT OPTION" : "WRITE INFO",
          options:
            type === "DROPDOWN"
              ? ["OPTION 1", "OPTION 2", "OPTION 3"]
              : undefined,
        },
      ];
      copy[copy.length - 1] = last;
      return copy;
    });
    setSelectedFieldId(id);
    setDirty(true);
  }

  function updateSelectedField(next: SafetyFormField) {
    setSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => (f.id === next.id ? next : f)),
      })),
    );
    setDirty(true);
  }

  const selectedField =
    sections
      .flatMap((s) => s.fields)
      .find((f) => f.id === selectedFieldId) ?? null;

  return (
    <OpsDetailStateGate
      loading={loading}
      error={error}
      onRetry={() => void load()}
    >
      {form ? (
        <div className="bg-shell p-3 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => void save()}
              className={cn(
                "font-sans text-[12px] font-medium uppercase tracking-[-0.02em]",
                dirty && !saving
                  ? "text-[#FDFDFF] hover:text-[#3B82F6]"
                  : "text-[#6F6F72]",
              )}
            >
              {saving ? "← Saving…" : "← Save"}
            </button>
            <div className="flex items-center gap-2">
              <Link
                href={`/safety/forms/${formId}/preview`}
                className="rounded-lg border border-[#3E3E3E] px-3 py-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-[#2A2A2A]"
              >
                Print Preview
              </Link>
              <button
                type="button"
                onClick={() => setAdvanced((v) => !v)}
                className={cn(
                  "rounded-lg px-3 py-2 font-sans text-[11px] uppercase tracking-[-0.02em]",
                  advanced
                    ? "bg-[#2A2A2A] text-[#FDFDFF]"
                    : "border border-[#3E3E3E] text-[#FDFDFF] hover:bg-[#2A2A2A]",
                )}
              >
                {advanced ? "Simple Edit" : "Advance Edit"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/safety/forms")}
                className="rounded-lg border border-[#3E3E3E] px-3 py-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] hover:bg-[#2A2A2A] hover:text-[#FDFDFF]"
              >
                Back
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2A2A2A] text-[#959597]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M14 3v5h5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </span>
                <input
                  className="w-full bg-transparent font-sans text-[16px] font-medium uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>

              {sections.map((section, idx) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  selectedFieldId={selectedFieldId}
                  onSelectField={setSelectedFieldId}
                  onChange={(next) => updateSection(idx, next)}
                  onDelete={() => deleteSection(idx)}
                />
              ))}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={addSection}
                  className="rounded-lg border border-[#3E3E3E] px-4 py-2.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-[#2A2A2A]"
                >
                  + Add Section
                </button>
                <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                  {form.code} · {form.version} · {form.status}
                  {dirty ? " · Unsaved" : ""}
                </span>
              </div>
            </div>

            {advanced ? (
              <FieldLibraryPanel
                library={form.fieldLibrary}
                selectedField={selectedField}
                onAdd={addLibraryField}
                onUpdateField={updateSelectedField}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </OpsDetailStateGate>
  );
}
