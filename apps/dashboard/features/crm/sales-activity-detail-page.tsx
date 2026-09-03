"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardBadge,
  DashboardField,
  DashboardModal,
  DashboardPanel,
  DashboardSelectField,
  DashboardTextField,
  DashboardToggle,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import {
  SALES_ACTIVITY_DETAIL,
  SALES_ACTIVITY_ROWS,
} from "./data/sales-activity.mock";

function PanelHeading({
  children,
  trailing,
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
        {children}
      </h2>
      {trailing}
    </div>
  );
}

function DetailPair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[10px] font-normal uppercase tracking-[-0.02em] text-[#959597] md:text-[11px]">
        {label}
      </p>
      <div className="mt-1 font-sans text-[12px] font-normal uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
        {value}
      </div>
    </div>
  );
}

export function LogFollowUpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [requiresFollowUp, setRequiresFollowUp] = React.useState(true);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Log Follow-up"
      widthClassName="max-w-xl"
      footer={
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              Daily Target · 3 of 5 Logged
            </p>
            <div className="mt-2 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-[#2A2A2A]">
              <div className="h-full w-[60%] rounded-full bg-[#22C55E]" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
            >
              Cancel
            </button>
            <DashboardToolbarButton onClick={onClose}>
              Log Follow-up
            </DashboardToolbarButton>
          </div>
        </div>
      }
    >
      <p className="-mt-2 mb-4 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
        Record a client activity, follow-up or expenditure
      </p>
      <div className="space-y-4">
        <DashboardTextField
          label="Client's Name"
          defaultValue="Permian Basin Energy"
        />
        <DashboardTextField label="Activity" defaultValue="Lunch" />
        <DashboardToggle
          label="Requires Follow-up / Expenditure"
          checked={requiresFollowUp}
          onCheckedChange={setRequiresFollowUp}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DashboardField label="Expenditure (USD)">
            <div className="relative">
              <input
                defaultValue="120.00"
                className="h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 pr-20 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none focus:border-[#5A5A5A] md:text-[13px]"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-sans text-[10px] uppercase text-[#959597]">
                Max 200
              </span>
            </div>
          </DashboardField>
          <DashboardTextField
            label="Next Follow-up"
            defaultValue="Jun 20, 2026"
          />
        </div>
        <DashboardField label="Upload Image or File">
          <button
            type="button"
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#3E3E3E] bg-[#2A2A2A] px-4 py-8 text-center transition-colors hover:bg-[#333]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="text-[#FDFDFF]">
              <path d="M12 16V4M7 9l5-5 5 5M5 20h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              Drop a file or click to upload
            </span>
            <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
              PNG · JPG · PDF · Max 10MB
            </span>
          </button>
        </DashboardField>
        <DashboardTextField
          label="Notes (Optional)"
          defaultValue="Discussed Q3 renewal; client wants revised quote"
        />
      </div>
    </DashboardModal>
  );
}

export function SalesActivityDetailPage({ activityId }: { activityId: string }) {
  const [followUpOpen, setFollowUpOpen] = React.useState(false);
  const row = SALES_ACTIVITY_ROWS.find((r) => r.id === activityId);
  const d = SALES_ACTIVITY_DETAIL;
  const titleId = row?.activityId ?? d.activityId;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-3">
          <h1 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
            Sales Activity · {titleId}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <DashboardBadge variant={d.status.variant} pill>
              {d.status.label}
            </DashboardBadge>
            <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
              {row
                ? `${row.activityId} · ${row.type} · ${row.date}, ${row.time}`
                : d.meta}
            </span>
          </div>
        </div>
        <DashboardToolbarButton showChevron>Create Task</DashboardToolbarButton>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <DashboardPanel>
            <div className="px-4 pt-4 pb-3">
              <PanelHeading
                trailing={
                  <button
                    type="button"
                    aria-label="Edit"
                    className="text-[#959597] hover:text-[#FDFDFF]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                }
              >
                Activity Details
              </PanelHeading>
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="space-y-5 p-4">
              <div>
                <p className="font-sans text-[15px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[17px]">
                  {d.customer}
                </p>
                <p className="mt-1 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
                  {d.type}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <DetailPair
                  label="Contact"
                  value={
                    <span className="inline-flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={d.contact.avatarUrl}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover"
                      />
                      {d.contact.name}
                    </span>
                  }
                />
                <DetailPair label="Rep" value={d.rep} />
                <DetailPair label="Subject" value={d.subject} />
                <DetailPair label="Duration" value={d.duration} />
                <DetailPair label="Date" value={d.date} />
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel>
            <div className="px-4 pt-4 pb-3">
              <PanelHeading>Outcome & Next Steps</PanelHeading>
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="space-y-4 p-4">
              <DetailPair
                label="Outcome"
                value={
                  <DashboardBadge variant={d.outcome.variant} pill>
                    {d.outcome.label}
                  </DashboardBadge>
                }
              />
              <DetailPair label="Follow-up" value={d.followUp} />
              <DetailPair label="Next Action" value={d.nextAction} />
            </div>
          </DashboardPanel>

          <DashboardPanel>
            <div className="px-4 pt-4 pb-3">
              <PanelHeading>Notes</PanelHeading>
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="space-y-4 p-4">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                  Previous Note · {d.previousNote.date}
                </p>
                <p className="mt-2 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#C8C8C8] md:text-[12px]">
                  {d.previousNote.text}
                </p>
              </div>
              <DashboardField label="Add Note">
                <input
                  placeholder="Add a new note"
                  className="h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase text-[#FDFDFF] outline-none placeholder:text-[#959597] focus:border-[#5A5A5A]"
                />
              </DashboardField>
            </div>
          </DashboardPanel>
        </div>

        <div className="space-y-4">
          <DashboardPanel>
            <div className="px-4 pt-4 pb-3">
              <PanelHeading>Linked Quote</PanelHeading>
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="space-y-3 p-4">
              <Link
                href={`/crm/quotes/${d.linkedQuote.id}`}
                className="font-sans text-[13px] uppercase tracking-[-0.02em] text-[#FDFDFF] underline underline-offset-2"
              >
                {d.linkedQuote.number}
              </Link>
              <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#C8C8C8]">
                {d.linkedQuote.title}
              </p>
              <DashboardBadge variant={d.linkedQuote.status.variant} pill>
                {d.linkedQuote.status.label}
              </DashboardBadge>
            </div>
          </DashboardPanel>

          <DashboardPanel>
            <div className="px-4 pt-4 pb-3">
              <PanelHeading>Related</PanelHeading>
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="space-y-3 p-4">
              {d.related.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3">
                  <span className="font-sans text-[11px] uppercase text-[#959597]">{item.label}</span>
                  <span className="font-sans text-[12px] uppercase text-[#FDFDFF]">{item.value}</span>
                </div>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel>
            <div className="px-4 pt-4 pb-3">
              <PanelHeading>Actions</PanelHeading>
            </div>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="flex flex-col gap-2 p-4">
              <DashboardToolbarButton
                className="w-full justify-center"
                onClick={() => setFollowUpOpen(true)}
              >
                Log Follow Up
              </DashboardToolbarButton>
              <DashboardToolbarButton className="w-full justify-center">
                Create Task
              </DashboardToolbarButton>
              <DashboardToolbarButton className="w-full justify-center">
                Edit
              </DashboardToolbarButton>
            </div>
          </DashboardPanel>
        </div>
      </div>

      <LogFollowUpModal open={followUpOpen} onClose={() => setFollowUpOpen(false)} />
    </div>
  );
}
