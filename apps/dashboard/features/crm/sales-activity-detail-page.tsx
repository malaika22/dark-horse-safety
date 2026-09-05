"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardBadge,
  DashboardField,
  DashboardModal,
  DashboardPanel,
  DashboardTextField,
  DashboardToggle,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmSalesActivity } from "@/lib/crm-api";
import { toastApiError } from "@/lib/toast";

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

function userLabel(
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null,
) {
  if (!user) return "—";
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.email ||
    "—"
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
          <div className="min-w-0 flex-1" />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
            >
              Cancel
            </button>
            <DashboardToolbarButton onClick={onClose}>Log Follow-up</DashboardToolbarButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <DashboardTextField label="Client's Name" defaultValue="" />
        <DashboardTextField label="Activity" defaultValue="" />
        <DashboardToggle
          label="Requires Follow-up / Expenditure"
          checked={requiresFollowUp}
          onCheckedChange={setRequiresFollowUp}
        />
        <DashboardTextField label="Notes (Optional)" defaultValue="" />
      </div>
    </DashboardModal>
  );
}

export function SalesActivityDetailPage({ activityId }: { activityId: string }) {
  const [followUpOpen, setFollowUpOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<CrmSalesActivity | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await crmApi.getSalesActivity(activityId);
        if (!cancelled) setDetail(res.data);
      } catch (err) {
        toastApiError(err);
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  if (loading) {
    return <div className="bg-shell p-6 text-sm text-[#959597]">Loading activity…</div>;
  }
  if (!detail) {
    return <div className="bg-shell p-6 text-sm text-[#959597]">Activity not found</div>;
  }

  const at = new Date(detail.activityAt);
  const meta = `${detail.activityCode} · ${detail.type} · ${Number.isNaN(at.getTime()) ? "—" : at.toLocaleString()}`;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-3">
          <h1 className="font-sans text-[18px] font-normal uppercase leading-none tracking-[-0.02em] text-foreground md:text-[24px]">
            Sales Activity · {detail.activityCode}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <DashboardBadge variant="success" pill>
              {detail.status}
            </DashboardBadge>
            <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
              {meta}
            </span>
          </div>
        </div>
        <DashboardToolbarButton onClick={() => setFollowUpOpen(true)} showChevron>
          Log Follow-up
        </DashboardToolbarButton>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <DashboardPanel>
          <div className="px-4 pt-4 pb-3">
            <PanelHeading>Activity Details</PanelHeading>
          </div>
          <div className="grid grid-cols-1 gap-4 px-4 pb-4 sm:grid-cols-2">
            <DetailPair label="Customer" value={detail.customer?.name ?? "—"} />
            <DetailPair label="Contact" value={detail.contact?.fullName ?? "—"} />
            <DetailPair label="Rep" value={userLabel(detail.rep)} />
            <DetailPair label="Subject" value={detail.subject ?? "—"} />
            <DetailPair label="Outcome" value={detail.outcome ?? "—"} />
            <DetailPair label="Duration" value={detail.duration ?? "—"} />
            <DetailPair
              label="Follow-up"
              value={detail.followUpAt ? detail.followUpAt.slice(0, 10) : "—"}
            />
            <DetailPair label="Notes" value={detail.notes ?? "—"} />
          </div>
        </DashboardPanel>
        <DashboardPanel>
          <div className="px-4 pt-4 pb-3">
            <PanelHeading>Quick Links</PanelHeading>
          </div>
          <div className="space-y-2 px-4 pb-4">
            <Link href="/crm/sales" className="block font-sans text-[11px] uppercase text-[#959597] hover:text-[#FDFDFF]">
              Back to Sales Activity
            </Link>
            <Link href="/crm/quotes/new" className="block font-sans text-[11px] uppercase text-[#959597] hover:text-[#FDFDFF]">
              Create Quote
            </Link>
          </div>
        </DashboardPanel>
      </div>

      <LogFollowUpModal open={followUpOpen} onClose={() => setFollowUpOpen(false)} />
    </div>
  );
}
