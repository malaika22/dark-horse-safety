"use client";

import * as React from "react";
import {
  DashboardBadge,
  DashboardPanel,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { EOD_REPORT_DETAIL, EOD_REPORTS_ROWS } from "./data/eod-reports.mock";

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M9 5h6l1 2h3v13a1 1 0 01-1 1H6a1 1 0 01-1-1V7h3l1-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <rect
        x="9"
        y="3"
        width="6"
        height="3.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
      {children}
    </h2>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[11px]">
        {label}
      </p>
      <p className="mt-1.5 font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[14px]">
        {value}
      </p>
    </div>
  );
}

export function EodReportDetailPage({ reportId }: { reportId: string }) {
  const row = EOD_REPORTS_ROWS.find((r) => r.id === reportId);
  const detail = EOD_REPORT_DETAIL;
  const titleId = row?.reportId ?? detail.reportId;
  const meta = row
    ? `${row.rep} · ${row.date} · ${row.submittedTime}`
    : detail.meta;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-3">
          <h1 className="font-sans text-[18px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[24px]">
            EOD Report · {titleId}
          </h1>
          <div className="flex flex-wrap items-center gap-2.5">
            <DashboardBadge variant="success" pill>
              {detail.status.label}
            </DashboardBadge>
            <span className="font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
              {meta}
            </span>
          </div>
        </div>
        <DashboardToolbarButton
          variant="primary"
          leftIcon={<ClipboardIcon className="shrink-0" />}
          showChevron
          className="!rounded-full"
        >
          Create Work Order
        </DashboardToolbarButton>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-3 sm:px-5">
            <PanelHeading>Summary</PanelHeading>
          </div>
          <div className="space-y-5 px-4 pb-5 sm:px-5">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={detail.rep.avatarUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[14px]">
                  {detail.rep.name}
                </p>
                <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                  {detail.rep.date}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              {detail.summary.map((item) => (
                <Metric key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-3 sm:px-5">
            <PanelHeading>Pipeline</PanelHeading>
          </div>
          <div className="space-y-3.5 px-4 pb-5 sm:px-5">
            {detail.pipeline.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3"
              >
                <span className="font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                  {item.label}
                </span>
                <span className="shrink-0 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(260px,0.85fr)]">
        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-3 sm:px-5">
            <PanelHeading>Activities Today</PanelHeading>
          </div>
          <div className="space-y-3 px-4 pb-5 sm:px-5">
            {detail.activities.map((line) => (
              <p
                key={line}
                className="font-sans text-[11px] font-normal uppercase leading-relaxed tracking-[-0.02em] text-[#C8C8C8] md:text-[12px]"
              >
                {line}
              </p>
            ))}
            <p className="font-sans text-[11px] font-normal uppercase tracking-[-0.02em] text-[#959597]">
              + {detail.moreActivities} more activities
            </p>
          </div>
        </DashboardPanel>

        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-3 sm:px-5">
            <PanelHeading>End-of-Day Notes</PanelHeading>
          </div>
          <div className="px-4 pb-5 sm:px-5">
            <p className="font-sans text-[11px] font-normal uppercase leading-relaxed tracking-[-0.02em] text-[#C8C8C8] md:text-[12px]">
              {detail.notes}
            </p>
          </div>
        </DashboardPanel>

        <DashboardPanel className="overflow-hidden">
          <div className="px-4 pt-4 pb-3 sm:px-5">
            <PanelHeading>Actions</PanelHeading>
          </div>
          <div className="flex flex-col gap-2.5 px-4 pb-5 sm:px-5">
            <DashboardToolbarButton
              variant="primary"
              className="w-full justify-center !rounded-full"
            >
              Approve
            </DashboardToolbarButton>
            <DashboardToolbarButton className="w-full justify-center !rounded-full">
              Request Detail
            </DashboardToolbarButton>
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}
