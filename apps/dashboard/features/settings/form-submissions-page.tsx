"use client";

import * as React from "react";
import { cn } from "@dark-horse-safety/ui";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { settingsApi, type FormSubmissionsPage } from "@/lib/settings-api";
import { fieldClass, SettingsPanel } from "./settings-frame";
import { FormsShell } from "./forms-shell";

export function FormSubmissionsPage() {
  useSetHeaderBreadcrumb("Settings / Forms / Submissions");
  const [query, setQuery] = React.useState("");
  const [review, setReview] = React.useState("ALL");
  const [data, setData] = React.useState<FormSubmissionsPage | null>(null);

  const load = React.useCallback(() => {
    void settingsApi.formSubmissions({ q: query || undefined, review: review === "ALL" ? undefined : review }).then((res) => setData(res.data)).catch(toastApiError);
  }, [query, review]);

  React.useEffect(() => { load(); }, [load]);

  async function markReviewed() {
    try {
      const res = await settingsApi.markSubmissionsReviewed();
      setData(res.data);
      toastSuccess("Pending submissions marked reviewed");
    } catch (error) {
      toastApiError(error);
    }
  }

  function exportCsv() {
    if (!data) return;
    const header = "Submitted,Form type,Form #,Customer,Submitted by,Attachments,Review,Source,Linked";
    const lines = data.items.map((row) => [row.submittedLabel, row.formType, row.formNumber, row.customer, row.submittedBy, row.attachments, row.review, row.source, row.linked].join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "form-submissions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <FormsShell tab="submissions">
      <div className="flex flex-wrap items-center gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search form, number or customer" className={`${fieldClass} max-w-sm`} />
        <button type="button" onClick={markReviewed} className="ml-auto rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">Marked reviewed</button>
        <button type="button" onClick={exportCsv} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">Export</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setReview("ALL")} className={cn("rounded-full border px-3 py-1 font-sans text-[10px] uppercase", review === "ALL" ? "border-white bg-white text-black" : "border-white/15 text-[#959597]")}>All</button>
        <button type="button" onClick={() => setReview(review === "REJECTED" ? "ALL" : "REJECTED")} className={cn("rounded-full border px-3 py-1 font-sans text-[10px] uppercase", review === "REJECTED" ? "border-white bg-white text-black" : "border-white/15 text-[#959597]")}>Rejected · {data?.rejected ?? 0}</button>
        <button type="button" onClick={() => { setReview("ALL"); setQuery(""); }} className="font-sans text-[10px] uppercase text-[#959597]">× Clear all</button>
      </div>
      <SettingsPanel className="overflow-x-auto">
        <div className="grid min-w-[980px] grid-cols-[120px_1.2fr_110px_1.3fr_120px_50px_140px_90px_100px] gap-2 border-b border-white/10 px-4 py-2 font-sans text-[10px] uppercase text-[#959597]">
          <span>Submitted</span><span>Form type</span><span>Form #</span><span>Customer / location</span><span>Submitted by</span><span>Att</span><span>Review</span><span>Source</span><span>Linked</span>
        </div>
        {data?.items.map((row) => (
          <div key={row.id} className="grid min-w-[980px] grid-cols-[120px_1.2fr_110px_1.3fr_120px_50px_140px_90px_100px] items-center gap-2 border-b border-white/5 px-4 py-3 font-sans text-[11px] uppercase text-[#C8C8CC]">
            <span>{row.submittedLabel}</span>
            <span className="text-[#FDFDFF]">{row.formType}</span>
            <span>{row.formNumber}</span>
            <span>{row.customer}</span>
            <span>{row.submittedBy}</span>
            <span>{row.attachments}</span>
            <Review value={row.review} />
            <span className="w-fit rounded-full bg-[#14532D] px-2 py-1 text-[10px] text-[#86EFAC]">{row.source}</span>
            <span>{row.linked}</span>
          </div>
        ))}
      </SettingsPanel>
    </FormsShell>
  );
}

function Review({ value }: { value: string }) {
  const tone = value === "APPROVED" ? "bg-[#14532D] text-[#86EFAC]" : value === "REJECTED" || value === "NEEDS CORRECTION" ? "bg-[#6B2430] text-[#FFB4B4]" : "bg-[#3F3514] text-[#F5C451]";
  return <span className={cn("w-fit rounded-full px-2 py-1 text-[10px]", tone)}>{value}</span>;
}
