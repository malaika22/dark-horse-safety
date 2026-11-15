"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@dark-horse-safety/ui";

/** Same full-width body shell the operations screens use. */
export const settingsPageClass = "space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6";

const TABS = [
  { href: "/settings/business-rules", label: "Business Rules" },
  { href: "/settings/override-log", label: "Override Log" },
  { href: "/settings/data-retention", label: "Data Retention" },
  { href: "/settings/global-defaults", label: "Global Defaults" },
  { href: "/settings/notification-recipients", label: "Recipients" },
];

export function SettingsFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className={settingsPageClass}>
      <div className="flex gap-6 overflow-x-auto border-b border-white/10">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "shrink-0 border-b-2 pb-3 font-sans text-[11px] font-[510] uppercase tracking-[0.08em]",
                active ? "border-white text-[#FDFDFF]" : "border-transparent text-[#959597] hover:text-[#FDFDFF]",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}

const ACCESS_LINKS = [
  { id: "users", href: "/settings/access-control/users", label: "Users" },
  { id: "roles", href: "/settings/access-control/roles", label: "Roles" },
  { id: "audit", href: "/settings/access-control/audit", label: "Audit log" },
  { id: "teams", href: "/settings/access-control/teams", label: "Team access" },
] as const;

export function AccessSectionLinks({ current }: { current: (typeof ACCESS_LINKS)[number]["id"] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {ACCESS_LINKS.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          className={cn("font-sans text-[11px] uppercase", link.id === current ? "text-white" : "text-[#959597] hover:text-white")}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function SettingsPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-white/10 bg-[#1C1C1E]", className)}>{children}</section>;
}

export const fieldClass =
  "h-10 w-full rounded-lg border border-white/10 bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.01em] text-[#FDFDFF] outline-none focus:border-white/30";

export const labelClass = "mb-1.5 block font-sans text-[10px] font-[510] uppercase tracking-[0.08em] text-[#959597]";
