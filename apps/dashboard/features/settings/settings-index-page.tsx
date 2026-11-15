"use client";

import * as React from "react";
import Link from "next/link";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { settingsApi } from "@/lib/settings-api";
import { SettingsPanel } from "./settings-frame";

const SECTIONS: { href: string; title: string; detail: string }[] = [
  { href: "/settings/company-profile", title: "Company Profile", detail: "Legal name, yards, and contact details" },
  { href: "/settings/payroll-rules", title: "Payroll Rules", detail: "Pay periods, overtime, and ADP export" },
  { href: "/settings/time-categories", title: "Time Categories", detail: "Pay codes used on time entries" },
  { href: "/settings/business-rules", title: "Business Rules", detail: "Enforcement, owners, and hard gates" },
  { href: "/settings/override-log", title: "Override Log", detail: "Approved exceptions to business rules" },
  { href: "/settings/data-retention", title: "Data Retention", detail: "Record classes and legal hold" },
  { href: "/settings/global-defaults", title: "Global Defaults", detail: "Escalation and generation defaults" },
  { href: "/settings/notification-recipients", title: "Notification Recipients", detail: "Who is copied on each trigger" },
  { href: "/settings/notifications", title: "Notifications", detail: "In-app, email, and SMS channels" },
  { href: "/settings/mobile-sync", title: "Mobile Sync", detail: "Field devices, queues, and failed syncs" },
  { href: "/settings/access-control/users", title: "Access Control", detail: "Users, invites, and account status" },
  { href: "/settings/access-control/roles", title: "Roles", detail: "Module visibility and role defaults" },
  { href: "/settings/access-control/teams", title: "Team Access", detail: "Crews, owners, and member access" },
  { href: "/settings/access-control/audit", title: "Audit Log", detail: "Permission, user, and login events" },
  { href: "/settings/on-call-rules", title: "On-Call Rules", detail: "Rest days, lead time, and limits" },
  { href: "/settings/forms", title: "Form Library", detail: "Active templates and submission counts" },
  { href: "/settings/forms/submissions", title: "Form Submissions", detail: "Review queue for submitted forms" },
  { href: "/settings/forms/rules", title: "Required Form Rules", detail: "Which forms a job must include" },
  { href: "/settings/forms/archived", title: "Archived Forms", detail: "Retired GoCanvas templates" },
  { href: "/settings/forms/builder", title: "Form Builder", detail: "Draft sections and generated templates" },
  { href: "/settings/integrations", title: "Integrations", detail: "Mobile Sync, NetSuite, and ADP" },
];

export function SettingsIndexPage() {
  useSetHeaderBreadcrumb("Settings");
  const [counts, setCounts] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    const next: Record<string, string> = {};
    void Promise.allSettled([
      settingsApi.businessRules({}).then((res) => {
        next["/settings/business-rules"] = `${res.data.summary.activeRules} active`;
      }),
      settingsApi.accessUsers({ page: "1", pageSize: "1" }).then((res) => {
        next["/settings/access-control/users"] = `${res.data.summary.total} users`;
      }),
      settingsApi.accessTeams({}).then((res) => {
        next["/settings/access-control/teams"] = `${res.data.summary.teams} teams`;
      }),
      settingsApi.accessRoles().then((res) => {
        next["/settings/access-control/roles"] = `${res.data.items.length} roles`;
      }),
      settingsApi.accessAudit({ page: "1", pageSize: "1" }).then((res) => {
        next["/settings/access-control/audit"] = `${res.data.summary.week} this week`;
      }),
      settingsApi.formLibrary().then((res) => {
        next["/settings/forms"] = `${res.data.summary.activeTemplates} templates`;
      }),
      settingsApi.formSubmissions({}).then((res) => {
        const pending = res.data.items.filter((row) => row.review === "PENDING REVIEW").length;
        next["/settings/forms/submissions"] = `${pending} pending`;
      }),
      settingsApi.formRules({ windows: "ACTIVE,CURRENT,FUTURE" }).then((res) => {
        next["/settings/forms/rules"] = `${res.data.items.length} rules`;
      }),
      settingsApi.archivedForms({ windows: "ACTIVE,CURRENT,FUTURE" }).then((res) => {
        next["/settings/forms/archived"] = `${res.data.items.length} archived`;
      }),
      settingsApi.mobileSync({ page: "1", pageSize: "1" }).then((res) => {
        next["/settings/mobile-sync"] = `${res.data.summary.devices} devices`;
      }),
      settingsApi.notificationPreferences().then((res) => {
        next["/settings/notifications"] = `${res.data.items.length} events`;
      }),
      settingsApi.dataIntegrations().then((res) => {
        next["/settings/integrations"] = `${res.data.items.length} connections`;
      }),
    ]).then(() => {
      if (!cancelled) setCounts(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4 py-6 sm:px-6">
      <div>
        <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.14em] text-[#959597]">Settings</p>
        <h1 className="mt-2 font-sans text-[28px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">Settings</h1>
        <p className="mt-2 max-w-3xl font-sans text-[13px] leading-relaxed text-[#959597]">
          Company policy, access, forms, and the connections those screens already save through the API.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href} className="block">
            <SettingsPanel className="h-full p-4 transition hover:border-white/25">
              <p className="font-sans text-[13px] font-[590] uppercase tracking-[0.08em] text-[#FDFDFF]">{section.title}</p>
              <p className="mt-2 font-sans text-[13px] text-[#959597]">{section.detail}</p>
              {counts[section.href] ? (
                <p className="mt-3 font-sans text-[11px] uppercase tracking-[0.12em] text-[#7EB6FF]">{counts[section.href]}</p>
              ) : null}
            </SettingsPanel>
          </Link>
        ))}
      </div>
    </div>
  );
}
