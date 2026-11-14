"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@dark-horse-safety/ui";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError } from "@/lib/toast";
import { settingsApi, type FormLibraryPage } from "@/lib/settings-api";

const TABS = [
  { id: "library", href: "/settings/forms", label: "Form library" },
  { id: "submissions", href: "/settings/forms/submissions", label: "Submissions" },
  { id: "rules", href: "/settings/forms/rules", label: "Required form rules" },
  { id: "archived", href: "/settings/forms/archived", label: "Archived GoCanvas" },
];

const CHIPS = ["ALL", "FIELD SAFETY", "FLEET & ASSETS", "OPERATIONS", "PURCHASING", "ARCHIVED"];

export function FormLibraryPage() {
  useSetHeaderBreadcrumb("Settings");
  const router = useRouter();
  const [category, setCategory] = React.useState("ALL");
  const [data, setData] = React.useState<FormLibraryPage | null>(null);

  React.useEffect(() => {
    if (category === "ARCHIVED") return;
    void settingsApi.formLibrary(category === "ALL" ? undefined : category).then((res) => setData(res.data)).catch(toastApiError);
  }, [category]);

  const summary = data?.summary;

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="font-sans text-[28px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">Settings</h1>
      <section className="rounded-xl border border-white/10 bg-[#1C1C1E] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-sans text-[13px] font-[590] uppercase text-[#FDFDFF]">Form templates</p>
          <button type="button" onClick={() => router.push("/settings/forms/builder")} className="rounded-full border border-white/15 px-3 py-1.5 font-sans text-[11px] uppercase text-[#FDFDFF]">New template</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <Link key={tab.id} href={tab.href} className={cn("rounded-full px-3 py-1 font-sans text-[10px] uppercase", tab.id === "library" ? "bg-white text-black" : "text-[#959597]")}>
              {tab.label}
            </Link>
          ))}
        </div>
        {summary ? (
          <div className="mt-4 grid grid-cols-2 divide-x divide-white/10 overflow-hidden rounded-lg border border-white/10 sm:grid-cols-5">
            <Stat value={summary.activeTemplates} label="Active templates" />
            <Stat value={summary.submissions} label="Submissions" />
            <Stat value={summary.missingRequired} label="Missing required" />
            <Stat value={summary.failedImports} label="Failed imports" />
            <Stat value={summary.pendingReview} label="Pending review" />
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                if (chip === "ARCHIVED") {
                  router.push("/settings/forms/archived");
                  return;
                }
                setCategory(chip);
              }}
              className={cn("rounded-full px-3 py-1 font-sans text-[10px] uppercase", category === chip ? "bg-white text-black" : "bg-[#2A2A2C] text-[#C8C8CC]")}
            >
              {chip}
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {data?.items.map((item) => (
            <button key={item.id} type="button" onClick={() => router.push("/settings/forms/builder")} className="text-left">
              <FolderIcon />
              <p className="mt-2 truncate font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">{item.name}</p>
              <p className="font-sans text-[10px] uppercase text-[#959597]">{item.submissions} submissions</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-[#141416] px-4 py-3">
      <p className="font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">{label}</p>
      <p className="font-sans text-[28px] font-[590] text-[#FDFDFF]">{value}</p>
    </div>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 120 78" className="h-16 w-24" aria-hidden="true">
      <path d="M8 18h38l8 8h58v44H8V18z" fill="#2A2A2C" stroke="#3A3A3C" />
      <path d="M8 30h104v40H8V30z" fill="#3A3A3C" />
      <path d="M14 26h28l6 6H14V26z" fill="#4A4A4E" />
    </svg>
  );
}
