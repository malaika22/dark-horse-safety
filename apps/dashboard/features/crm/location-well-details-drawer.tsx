"use client";

import * as React from "react";
import Link from "next/link";
import {
  DashboardBadge,
  DashboardToolbarButton,
  useScrollLock,
  type DashboardBadgeVariant,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmLocation } from "@/lib/crm-api";
import { toastApiError } from "@/lib/toast";
import { CrmTabLoadingState } from "@/features/crm/crm-states";

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="shrink-0 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
        {label}
      </span>
      <div className="min-w-0 text-right font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        {children}
      </div>
    </div>
  );
}

function formatFullDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

function relativeDaysAgo(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.max(
    0,
    Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)),
  );
  if (days === 0) return "Today";
  if (days === 1) return "1 Day Ago";
  return `${days} Days Ago`;
}

function statusPill(
  label: string,
  variant: DashboardBadgeVariant,
): React.ReactNode {
  return (
    <DashboardBadge variant={variant} pill>
      {label}
    </DashboardBadge>
  );
}

export function LocationWellDetailsDrawer({
  open,
  locationId,
  onClose,
  onViewOnMap,
}: {
  open: boolean;
  locationId: string | null;
  onClose: () => void;
  onViewOnMap?: (id: string) => void;
}) {
  useScrollLock(open);
  const [detail, setDetail] = React.useState<CrmLocation | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !locationId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await crmApi.getLocation(locationId);
        if (!cancelled) setDetail(res.data);
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          toastApiError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, locationId]);

  if (!open) return null;

  const hasCoords = detail?.latitude != null && detail?.longitude != null;
  const gpsSet =
    Boolean(detail?.gpsRequired) ||
    (hasCoords && !/missing|not set|unset/i.test(detail?.gpsStatus ?? ""));
  const hasGeo = Boolean(detail?.geofenceRadius?.trim());
  const hasApi = Boolean(detail?.apiNumber?.trim());
  const score = [gpsSet, hasGeo, hasApi].filter(Boolean).length;
  const reqMet =
    score === 3 ? "MET" : score === 0 ? "MISSING" : ("PARTIAL" as const);
  const lastWo = detail?.workOrders?.[0];
  const lastVisited =
    lastWo?.serviceDate ?? lastWo?.createdAt ?? detail?.updatedAt ?? detail?.createdAt;
  const route = detail?.routeRules?.[0];
  const coordsLabel =
    hasCoords && detail
      ? `${Number(detail.latitude).toFixed(4)}, ${Number(detail.longitude).toFixed(4)}`
      : "—";
  const countyState = [detail?.county, detail?.state].filter(Boolean).join(", ") || "—";
  const ago = relativeDaysAgo(lastVisited);

  return (
    <>
      <button
        type="button"
        aria-label="Close well details backdrop"
        className="fixed inset-0 z-[90] bg-black/60"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Well Details"
        className="fixed inset-y-0 right-0 z-[91] flex w-full max-w-[400px] flex-col border-l border-[#2D2D30] bg-[#0D0D0D] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2D2D30] px-5 py-4">
          <h2 className="font-sans text-[12px] font-[510] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
            Well Details
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#FDFDFF] transition-colors hover:bg-white/5"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-hidden">
          {loading ? (
            <CrmTabLoadingState />
          ) : !detail ? (
            <p className="font-sans text-[11px] uppercase text-[#959597]">
              Well not found.
            </p>
          ) : (
            <div className="divide-y divide-[#2D2D30]/80">
              <DetailRow label="Well Name">{detail.name}</DetailRow>
              <DetailRow label="Status">
                {statusPill(
                  detail.status.replace(/_/g, " "),
                  detail.status === "ACTIVE" ? "success" : "neutral",
                )}
              </DetailRow>
              <DetailRow label="Customer">
                {detail.customer?.name ?? "—"}
              </DetailRow>
              <DetailRow label="County / State">{countyState}</DetailRow>
              <DetailRow label="API Number">{detail.apiNumber ?? "—"}</DetailRow>
              <DetailRow label="Coordinates">{coordsLabel}</DetailRow>
              <DetailRow label="Geofence Radius">
                {detail.geofenceRadius ?? "—"}
              </DetailRow>
              <DetailRow label="GPS Status">
                {statusPill(
                  gpsSet ? "Set" : "Missing",
                  gpsSet ? "success" : "error",
                )}
              </DetailRow>
              <DetailRow label="Open Jobs">{detail.openJobs ?? 0}</DetailRow>
              <DetailRow label="Last Visited">
                {formatFullDate(lastVisited)}
                {ago ? ` · ${ago}` : ""}
              </DetailRow>
              <DetailRow label="Site Contact">
                {detail.siteContact ?? "—"}
              </DetailRow>
              <DetailRow label="Requirements Met">
                {statusPill(
                  reqMet === "MET"
                    ? "Met"
                    : reqMet === "PARTIAL"
                      ? "Partial"
                      : "Missing",
                  reqMet === "MET"
                    ? "success"
                    : reqMet === "PARTIAL"
                      ? "warning"
                      : "error",
                )}
              </DetailRow>
              <DetailRow label="Route / GPS Rule">
                {route?.routeLabel ?? route?.code ?? "—"}
              </DetailRow>
              <div className="py-2.5">
                <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
                  Notes
                </p>
                <p className="mt-2 font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF]">
                  {detail.accessNotes?.trim() || "No notes on file."}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#2D2D30] px-5 py-4">
          <DashboardToolbarButton onClick={onClose}>Close</DashboardToolbarButton>
          <div className="flex items-center gap-2">
            {locationId ? (
              <Link href={`/crm/locations/${locationId}/edit`}>
                <DashboardToolbarButton>Edit</DashboardToolbarButton>
              </Link>
            ) : null}
            <DashboardToolbarButton
              variant="primary"
              disabled={!locationId}
              onClick={() => {
                if (locationId) onViewOnMap?.(locationId);
              }}
            >
              View On Map
            </DashboardToolbarButton>
          </div>
        </div>
      </aside>
    </>
  );
}
