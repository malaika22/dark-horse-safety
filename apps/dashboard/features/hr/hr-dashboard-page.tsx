"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardPanelTitle,
  DashboardStatCell,
  DashboardStatGrid,
  DashboardStatRow,
  cn,
} from "@dark-horse-safety/ui";
import { hrApi } from "@/lib/hr-api";
import { toastApiError } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";

type DashState = {
  employees: {
    active: number;
    pendingRequests: number;
    trainingFlags: number;
    hoursThisCycle: number;
  };
  timeEntries: {
    pending: number;
    missingClockOut: number;
    gpsFlagged: number;
    editRequests: number;
  };
  timeOff: {
    pending: number;
    upcoming: number;
    coverageNeeded: number;
  };
  payroll: {
    exceptions: number;
    cycleLabel: string;
    banner: string;
  };
  training: {
    recordsOnFile: number;
    expiringSoon: number;
  };
  gps: {
    openFlags: number;
    oldestFlag: string;
  };
  onCall: {
    onCallToday: string;
    unassignedDays: number;
    swapRequests: number;
  };
};

const LINKS: Array<{ href: string; label: string; hint: string }> = [
  { href: "/hr/employees", label: "Employees", hint: "Roster & profiles" },
  { href: "/hr/time-entries", label: "Time Entries", hint: "Approve & edit" },
  {
    href: "/hr/time-edit-requests",
    label: "Time Edit Requests",
    hint: "Correction queue",
  },
  { href: "/hr/time-off", label: "Time Off", hint: "PTO & coverage" },
  { href: "/hr/payroll-review", label: "Payroll Review", hint: "Exceptions" },
  { href: "/hr/payroll-export", label: "Payroll Export", hint: "ADP handoff" },
  {
    href: "/hr/supervisor-routing",
    label: "Supervisor Routing",
    hint: "Approval routes",
  },
  { href: "/hr/training", label: "Training", hint: "Records & certs" },
  { href: "/hr/sse-programme", label: "SSE Programme", hint: "Mentor pairs" },
  {
    href: "/hr/on-call-rotation",
    label: "On-Call Rotation",
    hint: "Coverage calendar",
  },
  {
    href: "/hr/gps-flag-review",
    label: "GPS Flag Review",
    hint: "Geofence flags",
  },
  {
    href: "/hr/pay-cycle",
    label: "Pay Cycle Setting",
    hint: "Cycles & OT rules",
  },
];

export function HrDashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<DashState | null>(null);

  useSetHeaderBreadcrumb("Employees & HR / HR Dashboard");
  useSetHeaderActions(null, []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [
          employees,
          timeEntries,
          timeOff,
          payroll,
          training,
          gps,
          onCall,
        ] = await Promise.all([
          hrApi.employeesKpi(),
          hrApi.timeEntriesKpi(),
          hrApi.timeOffKpi(),
          hrApi.payrollReviewKpi(),
          hrApi.trainingDashboard(),
          hrApi.gpsFlagsOverview(),
          hrApi.onCallMonth(),
        ]);
        if (cancelled) return;
        setData({
          employees: {
            active: employees.data.active,
            pendingRequests: employees.data.pendingRequests,
            trainingFlags: employees.data.trainingFlags,
            hoursThisCycle: employees.data.hoursThisCycle,
          },
          timeEntries: {
            pending: timeEntries.data.pending,
            missingClockOut: timeEntries.data.missingClockOut,
            gpsFlagged: timeEntries.data.gpsFlagged,
            editRequests: timeEntries.data.editRequests,
          },
          timeOff: {
            pending: timeOff.data.pending,
            upcoming: timeOff.data.upcoming,
            coverageNeeded: timeOff.data.coverageNeeded,
          },
          payroll: {
            exceptions: payroll.data.exceptions,
            cycleLabel: payroll.data.cycleLabel,
            banner: payroll.data.banner,
          },
          training: {
            recordsOnFile: training.data.kpis.recordsOnFile,
            expiringSoon: training.data.kpis.expiringSoon,
          },
          gps: {
            openFlags: gps.data.kpis.openFlags,
            oldestFlag: gps.data.kpis.oldestFlag,
          },
          onCall: {
            onCallToday: onCall.data.kpis.onCallToday,
            unassignedDays: onCall.data.kpis.unassignedDays,
            swapRequests: onCall.data.kpis.swapRequests,
          },
        });
      } catch (err) {
        toastApiError(err);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell">
        <BrandLoader />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="overflow-x-hidden bg-shell p-3 sm:p-6">
        <p className="font-sans text-[12px] uppercase text-[#959597]">
          Failed to load HR dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-6">
      <DashboardStatGrid>
        <DashboardStatRow columns={4}>
          <DashboardStatCell
            title="Active Employees"
            value={String(data.employees.active)}
            meta={`${data.employees.hoursThisCycle.toFixed(1)}H This Cycle`}
            icon="customers"
          />
          <DashboardStatCell
            title="Pending Time"
            value={String(data.timeEntries.pending)}
            meta={`${data.timeEntries.missingClockOut} Missing C/O`}
            icon="time"
          />
          <DashboardStatCell
            title="Time Off Queue"
            value={String(data.timeOff.pending)}
            meta={`${data.timeOff.coverageNeeded} Need Coverage`}
            icon="folder"
          />
          <DashboardStatCell
            title="Payroll Exceptions"
            value={String(data.payroll.exceptions)}
            meta={data.payroll.cycleLabel}
            icon="document"
          />
        </DashboardStatRow>
        <DashboardStatRow columns={4}>
          <DashboardStatCell
            title="Open GPS Flags"
            value={String(data.gps.openFlags)}
            meta={`Oldest ${data.gps.oldestFlag}`}
            icon="lightning"
          />
          <DashboardStatCell
            title="Training Expiring"
            value={String(data.training.expiringSoon)}
            meta={`${data.training.recordsOnFile} Records On File`}
            icon="document"
          />
          <DashboardStatCell
            title="On Call Today"
            value={data.onCall.onCallToday}
            meta={`${data.onCall.unassignedDays} Unassigned Days`}
            icon="time"
          />
          <DashboardStatCell
            title="Edit Requests"
            value={String(data.timeEntries.editRequests)}
            meta={`${data.employees.pendingRequests} Total Pending`}
            icon="folder"
          />
        </DashboardStatRow>
      </DashboardStatGrid>

      {data.payroll.banner ? (
        <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
          {data.payroll.banner}
        </p>
      ) : null}

      <section className="rounded-xl border border-[#2D2D30] bg-panel">
        <div className="border-b border-[#2A2A2A] px-4 py-3">
          <DashboardPanelTitle icon="lightning" title="HR Modules" />
        </div>
        <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex min-w-0 flex-col gap-1 rounded-lg border border-[#2D2D30] bg-[#161616] px-3 py-3 transition-colors",
                "hover:border-[#3E3E3E] hover:bg-[#1A1A1A]",
              )}
            >
              <span className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {link.label}
              </span>
              <span className="font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
                {link.hint}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
