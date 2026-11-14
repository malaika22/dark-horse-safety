"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@dark-horse-safety/ui";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError, toastError, toastSuccess } from "@/lib/toast";
import { settingsApi, type PayrollRules, type TimeCategory, type TimeCategoryInput } from "@/lib/settings-api";
import { fieldClass, SettingsPanel } from "./settings-frame";

const CODES = ["ADP: REG", "ADP: OT", "ADP: OJT", "ADP: VAC", "ADP: SICK", "ADP: HOL", "ADP: UNP", "ADP: NB"];

const emptyDraft = (): TimeCategoryInput => ({
  name: "",
  paid: true,
  billable: false,
  countsToOt: false,
  payrollCode: "ADP: REG",
});

export function TimeCategoriesPage() {
  useSetHeaderBreadcrumb("Settings / Time Categories");
  const [items, setItems] = React.useState<TimeCategory[]>([]);
  const [rules, setRules] = React.useState<PayrollRules | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState<TimeCategoryInput>(emptyDraft());
  const [blocked, setBlocked] = React.useState<string | null>(null);
  const dragId = React.useRef<string | null>(null);

  const load = React.useCallback(() => {
    void Promise.all([settingsApi.timeCategories(), settingsApi.payrollRules()])
      .then(([categories, payroll]) => {
        setItems(categories.data.items);
        setRules(payroll.data);
      })
      .catch(toastApiError);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function beginEdit(row: TimeCategory) {
    setAdding(false);
    setEditingId(row.id);
    setDraft({
      name: row.name,
      paid: row.paid,
      billable: row.billable,
      countsToOt: row.countsToOt,
      payrollCode: row.payrollCode,
    });
  }

  async function save() {
    if (!draft.name.trim()) {
      toastError("Enter a category name");
      return;
    }
    try {
      if (adding) {
        await settingsApi.createTimeCategory(draft);
        toastSuccess("Category added");
      } else if (editingId) {
        await settingsApi.updateTimeCategory(editingId, draft);
        toastSuccess("Category saved");
      }
      setAdding(false);
      setEditingId(null);
      load();
    } catch (error) {
      toastApiError(error);
    }
  }

  async function remove(row: TimeCategory) {
    if (row.entryCount > 0) {
      setBlocked(row.id);
      return;
    }
    try {
      await settingsApi.deleteTimeCategory(row.id);
      toastSuccess("Category deleted");
      load();
    } catch (error) {
      toastApiError(error);
    }
  }

  async function dropOn(targetId: string) {
    const sourceId = dragId.current;
    dragId.current = null;
    if (!sourceId || sourceId === targetId) return;
    const next = [...items];
    const from = next.findIndex((row) => row.id === sourceId);
    const to = next.findIndex((row) => row.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    try {
      const res = await settingsApi.reorderTimeCategories(next.map((row) => row.id));
      setItems(res.data.items);
    } catch (error) {
      toastApiError(error);
      load();
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 py-6 sm:px-6">
      <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.14em] text-[#959597]">Settings / Time Categories</p>
      {rules ? (
        <SettingsPanel className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="font-sans text-[12px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">Payroll rules</p>
            <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.04em] text-[#C8C8CC]">
              Pay cycle: {rules.payCycleLength} · OT {rules.overtimeThreshold} · Round: {rules.roundClockEntries}
            </p>
            <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.04em] text-[#C8C8CC]">
              {rules.seventhDayRule ? "7th-day rule on" : "7th-day rule off"} · Grace period {rules.gracePeriod} · Minimum shift {rules.minimumShift} · Export to ADP
            </p>
          </div>
          <Link href="/settings/payroll-rules" className="shrink-0 rounded-lg border border-white/15 px-4 py-2 text-[11px] font-[590] uppercase text-[#FDFDFF]">
            Edit →
          </Link>
        </SettingsPanel>
      ) : null}

      <SettingsPanel>
        <div className="flex items-center justify-between px-5 py-4">
          <p className="font-sans text-[13px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">Time categories</p>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setAdding(true);
              setDraft(emptyDraft());
            }}
            className="rounded-lg border border-white/15 px-3 py-2 text-[11px] font-[590] uppercase text-[#FDFDFF]"
          >
            + Add category
          </button>
        </div>
        <div className="grid grid-cols-[1.4fr_90px_90px_120px_140px_72px] gap-2 border-y border-white/10 px-5 py-2 font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">
          <span>Category</span>
          <span>Paid</span>
          <span>Billable</span>
          <span>Counts to OT</span>
          <span>Payroll code</span>
          <span />
        </div>
        {adding ? <Editor draft={draft} setDraft={setDraft} onCancel={() => setAdding(false)} onSave={() => void save()} /> : null}
        {items.map((row) => (
          <div key={row.id}>
            <div
              draggable
              onDragStart={() => {
                dragId.current = row.id;
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void dropOn(row.id)}
              onClick={() => beginEdit(row)}
              className="grid cursor-pointer grid-cols-[1.4fr_90px_90px_120px_140px_72px] items-center gap-2 border-b border-white/5 px-5 py-3 hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <span className="text-[#6E6E73]">⋮⋮</span>
                <div>
                  <p className="font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">{row.name}</p>
                  <p className="font-sans text-[10px] uppercase tracking-[0.06em] text-[#959597]">{row.entryCount} entries</p>
                </div>
              </div>
              <Dot on={row.paid} />
              <Dot on={row.billable} />
              <Dot on={row.countsToOt} />
              <span className="w-fit rounded-full bg-[#5B4B8A] px-2 py-1 font-sans text-[10px] uppercase text-[#FDFDFF]">{row.payrollCode}</span>
              <div className="relative flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                <button type="button" aria-label={`Edit ${row.name}`} onClick={() => beginEdit(row)} className="text-[#C8C8CC]">✎</button>
                <button
                  type="button"
                  aria-label={`Delete ${row.name}`}
                  onClick={() => void remove(row)}
                  onMouseLeave={() => setBlocked(null)}
                  className="text-[#C8C8CC]"
                >
                  ⌫
                </button>
                {blocked === row.id ? (
                  <span className="absolute right-0 top-6 z-10 w-56 rounded-md bg-[#2A2A2A] px-2 py-1 text-right font-sans text-[10px] uppercase text-[#FDFDFF]">
                    Cannot delete — {row.entryCount} entries use this category
                  </span>
                ) : null}
              </div>
            </div>
            {editingId === row.id ? (
              <Editor draft={draft} setDraft={setDraft} onCancel={() => setEditingId(null)} onSave={() => void save()} />
            ) : null}
          </div>
        ))}
        <p className="px-5 py-3 font-sans text-[10px] uppercase tracking-[0.06em] text-[#959597]">
          Click a row to edit inline. Drag ⋮⋮ to reorder. A category with logged entries can’t be deleted.
        </p>
      </SettingsPanel>
    </div>
  );
}

function Dot({ on }: { on: boolean }) {
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", on ? "bg-[#3DDC84]" : "border border-white/25")} />;
}

function Editor({
  draft,
  setDraft,
  onCancel,
  onSave,
}: {
  draft: TimeCategoryInput;
  setDraft: React.Dispatch<React.SetStateAction<TimeCategoryInput>>;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="border-b border-white/10 bg-[#161618] px-5 py-4">
      <div className="grid items-end gap-4 md:grid-cols-[1.4fr_90px_90px_120px_140px]">
        <label className="font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">
          Category name
          <input className={`${fieldClass} mt-1 normal-case`} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <Switch label="Paid" on={draft.paid} onClick={() => setDraft({ ...draft, paid: !draft.paid })} />
        <Switch label="Billable" on={draft.billable} onClick={() => setDraft({ ...draft, billable: !draft.billable })} />
        <Switch label="Counts to OT" on={draft.countsToOt} onClick={() => setDraft({ ...draft, countsToOt: !draft.countsToOt })} />
        <label className="font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">
          ADP code
          <select className={`${fieldClass} mt-1`} value={draft.payrollCode} onChange={(event) => setDraft({ ...draft, payrollCode: event.target.value })}>
            {(CODES.includes(draft.payrollCode) ? CODES : [draft.payrollCode, ...CODES]).map((code) => (
              <option key={code} value={code}>{code.replace("ADP: ", "")}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.06em] text-[#959597]">Changes apply to new time entries. Existing entries keep their category.</p>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] font-[590] uppercase text-[#FDFDFF]">Cancel</button>
        <button type="button" onClick={onSave} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Save category</button>
      </div>
    </div>
  );
}

function Switch({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-start gap-2">
      <span className="font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">{label}</span>
      <span className={cn("relative h-6 w-11 rounded-full", on ? "bg-[#3DDC84]" : "bg-[#3A3A3C]")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white", on ? "left-5" : "left-0.5")} />
      </span>
    </button>
  );
}
