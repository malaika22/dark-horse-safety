"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@dark-horse-safety/ui";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";

const TABS = [
  { href: "/settings/business-rules", label: "Business Rules" },
  { href: "/settings/override-log", label: "Override Log" },
  { href: "/settings/data-retention", label: "Data Retention" },
  { href: "/settings/global-defaults", label: "Global Defaults" },
  { href: "/settings/notification-recipients", label: "Recipients" },
];

export function SettingsFrame({
  title,
  eyebrow,
  description,
  breadcrumb,
  children,
}: {
  title: string;
  eyebrow: string;
  description?: string;
  breadcrumb: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  useSetHeaderBreadcrumb(breadcrumb);
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4 py-6 sm:px-6">
      <div>
        <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.14em] text-[#959597]">{eyebrow}</p>
        <h1 className="mt-2 font-sans text-[28px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl font-sans text-[13px] leading-relaxed text-[#959597]">{description}</p>
        ) : null}
      </div>
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
    <div className="mt-1 flex flex-wrap gap-3">
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
