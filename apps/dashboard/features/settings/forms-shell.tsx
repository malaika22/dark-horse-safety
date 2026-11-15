"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@dark-horse-safety/ui";
import { settingsApi, type FormRule } from "@/lib/settings-api";
import { toastApiError } from "@/lib/toast";

const TABS = [
  { id: "library", href: "/settings/forms", label: "Form library" },
  { id: "submissions", href: "/settings/forms/submissions", label: "Submissions" },
  { id: "rules", href: "/settings/forms/rules", label: "Required form rules" },
  { id: "archived", href: "/settings/forms/archived", label: "Archived GoCanvas" },
] as const;

export function FormsShell({ tab, children }: { tab: (typeof TABS)[number]["id"]; children: ReactNode }) {
  const router = useRouter();
  async function payrollReport() {
    try {
      const res = await settingsApi.formRules({ windows: "ACTIVE,CURRENT,FUTURE" });
      const blocking = res.data.items.filter((rule: FormRule) => rule.payrollBloc === "YES");
      const header = "Rule,Applies to,Required forms,Payroll block,Billing";
      const lines = blocking.map((rule) => [rule.name, rule.appliesTo, rule.forms, rule.payrollBloc, rule.billing].join(","));
      const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "payroll-form-report.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toastApiError(error);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.14em] text-[#959597]">Settings</p>
          <h1 className="mt-2 font-sans text-[28px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">Forms</h1>
        </div>
        <button type="button" onClick={() => void payrollReport()} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Generate payroll report</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Link key={item.id} href={item.href} className={cn("rounded-full px-3 py-1 font-sans text-[11px] uppercase", item.id === tab ? "bg-white text-black" : "bg-[#2A2A2C] text-[#C8C8CC]")}>
            {item.label}
          </Link>
        ))}
        <button type="button" onClick={() => router.push("/settings/forms/builder")} className="rounded-full bg-[#2A2A2C] px-3 py-1 font-sans text-[11px] uppercase text-[#C8C8CC]">Form builder</button>
      </div>
      {children}
    </div>
  );
}
