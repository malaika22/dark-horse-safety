"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardMenuPopover,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";
import { ApiError } from "@dark-horse-safety/api-client";
import {
  crmApi,
  type CrmLocation,
  type CrmQuote,
  type CrmRouteRule,
  type CrmSalesActivity,
  type CrmWorkOrder,
} from "@/lib/crm-api";
import { latLngToMapPin } from "@/lib/crm-ui";
import {
  CrmDetailStateGate,
  CrmEmptyTabState,
  CrmTabLoadingState,
} from "@/features/crm/crm-states";
import { toastApiError, toastSuccess } from "@/lib/toast";
import {
  useSetHeaderActions,
  useSetHeaderBreadcrumb,
} from "@/features/app-shell/header-actions-context";
import {
  sessionDisplayName,
  useSession,
} from "@/features/app-shell/session-context";
import { CONTACT_DETAIL_TABS } from "./crm-constants";

type DetailTab = (typeof CONTACT_DETAIL_TABS)[number]["id"];

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

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="9"
        y="9"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M5 15V5a2 2 0 012-2h10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlassBtn({
  children,
  onClick,
  href,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const cls = `inline-flex h-8 items-center rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40 ${className ?? ""}`;
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

function DetailPair({
  label,
  value,
  trailing,
}: {
  label: string;
  value: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
        {label}
      </p>
      <div className="mt-1.5 flex min-w-0 items-center gap-2 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        <span className="min-w-0 truncate">{value}</span>
        {trailing}
      </div>
    </div>
  );
}

function RelatedRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
        {label}
      </span>
      <span
        className={`min-w-0 text-right font-sans text-[11px] uppercase tracking-[-0.02em] ${
          valueClassName ?? "text-[#FDFDFF]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  trailing,
  children,
  footer,
  className,
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-[#2D2D30] bg-panel ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
          {title}
        </p>
        {trailing}
      </div>
      <div className="flex-1 px-4 pb-4 sm:px-5">{children}</div>
      {footer ? (
        <div className="border-t border-[#2D2D30] px-4 py-3 sm:px-5">{footer}</div>
      ) : null}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
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

function formatActivityDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function formatShortDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function statusLabel(status?: string | null) {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}

function SiteLocationMap({
  name,
  latitude,
  longitude,
  radiusLabel,
}: {
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusLabel: string;
}) {
  const pin = latLngToMapPin("site", name, latitude ?? null, longitude ?? null, true);
  const left = pin ? `${pin.x}%` : "50%";
  const top = pin ? `${pin.y}%` : "48%";

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-[#2D2D30] bg-[#141414]">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(45,45,48,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(45,45,48,0.7) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="absolute h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#3B82F6]/80"
        style={{ left, top }}
      />
      <div
        className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#EF4444] shadow-[0_0_0_3px_rgba(239,68,68,0.25)]"
        style={{ left, top }}
      />
      <span
        className="absolute -translate-x-1/2 font-sans text-[9px] font-[510] uppercase tracking-[-0.02em] text-[#93C5FD]"
        style={{ left: `calc(${left} + 18%)`, top: `calc(${top} - 18%)` }}
      >
        {radiusLabel} Geofence
      </span>
    </div>
  );
}

export function LocationDetailPage({ locationId }: { locationId: string }) {
  const router = useRouter();
  const { user } = useSession();
  const [tab, setTab] = React.useState<DetailTab>("overview");
  const [location, setLocation] = React.useState<CrmLocation | null>(null);
  const [routeRule, setRouteRule] = React.useState<CrmRouteRule | null>(null);
  const [ruleSource, setRuleSource] = React.useState<
    "SITE_OVERRIDE" | "CUSTOMER_DEFAULT" | "SYSTEM_DEFAULT"
  >("SYSTEM_DEFAULT");
  const [flagInsight, setFlagInsight] = React.useState<{
    count: number;
    message: string;
    routeRuleId: string | null;
  } | null>(null);
  const [activities, setActivities] = React.useState<CrmSalesActivity[]>([]);
  const [activityTotal, setActivityTotal] = React.useState(0);
  const [quotes, setQuotes] = React.useState<CrmQuote[]>([]);
  const [workOrders, setWorkOrders] = React.useState<CrmWorkOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [forbidden, setForbidden] = React.useState(false);
  const [tabLoading, setTabLoading] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [neighborIds, setNeighborIds] = React.useState<string[]>([]);
  const [noteDraft, setNoteDraft] = React.useState("");
  const [noteBusy, setNoteBusy] = React.useState(false);
  const [addingNote, setAddingNote] = React.useState(false);
  const [titleMenuOpen, setTitleMenuOpen] = React.useState(false);
  const titleMenuRef = React.useRef<HTMLButtonElement>(null);

  useSetHeaderBreadcrumb("CRM / Locations / Wells");
  useSetHeaderActions(null, [locationId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      setForbidden(false);
      try {
        const [locRes, neighborsRes] = await Promise.all([
          crmApi.getLocation(locationId),
          crmApi.listLocations({ page: 1, pageSize: 100, sort: "name", direction: "asc" }),
        ]);
        if (cancelled) return;
        setLocation(locRes.data);
        setNeighborIds((neighborsRes.data.items ?? []).map((l) => l.id));

        const customerId = locRes.data.customerId;
        const [siteRules, customerRules, overview, acts, qts, wos] =
          await Promise.all([
            crmApi.listRouteRules({
              locationId,
              page: 1,
              pageSize: 5,
            }),
            customerId
              ? crmApi.listRouteRules({
                  customerId,
                  page: 1,
                  pageSize: 20,
                })
              : Promise.resolve(null),
            crmApi.routeRulesOverview(),
            customerId
              ? crmApi.listSalesActivities({
                  customerId,
                  page: 1,
                  pageSize: 12,
                  sort: "activityAt",
                  direction: "desc",
                })
              : Promise.resolve(null),
            customerId
              ? crmApi.listQuotes({
                  customerId,
                  page: 1,
                  pageSize: 50,
                })
              : Promise.resolve(null),
            crmApi.listWorkOrders({
              locationId,
              page: 1,
              pageSize: 50,
            }).catch(() =>
              customerId
                ? crmApi.listWorkOrders({
                    customerId,
                    page: 1,
                    pageSize: 50,
                  })
                : Promise.resolve(null),
            ),
          ]);

        if (cancelled) return;

        const siteRule =
          siteRules.data.items?.[0] ??
          (locRes.data.routeRules?.[0]
            ? ({
                ...locRes.data.routeRules[0],
                customerId: locRes.data.customerId,
                status: locRes.data.routeRules[0].status ?? "ACTIVE",
                code: locRes.data.routeRules[0].code ?? "",
              } as CrmRouteRule)
            : null);

        const customerDefault =
          customerRules?.data.items?.find((r) => !r.locationId) ?? null;

        if (siteRule) {
          setRouteRule(siteRule);
          setRuleSource("SITE_OVERRIDE");
        } else if (customerDefault) {
          setRouteRule(customerDefault);
          setRuleSource("CUSTOMER_DEFAULT");
        } else {
          setRouteRule(null);
          setRuleSource("SYSTEM_DEFAULT");
        }

        const siteFlags = (overview.data.flags ?? []).filter(
          (f) => f.siteId === locationId,
        );
        if (siteFlags.length > 0) {
          const accepted = siteFlags.filter((f) =>
            /accept/i.test(f.outcome),
          ).length;
          setFlagInsight({
            count: siteFlags.length,
            message: `${locRes.data.name} raised ${siteFlags.length} flags in 30 days — ${accepted} accepted. Consider increasing the radius.`,
            routeRuleId: siteRule?.id ?? null,
          });
        } else if (
          overview.data.insight?.locationId === locationId &&
          overview.data.insight
        ) {
          setFlagInsight({
            count: 1,
            message: overview.data.insight.message,
            routeRuleId: overview.data.insight.routeRuleId,
          });
        } else {
          setFlagInsight(null);
        }

        setActivities(acts?.data.items ?? []);
        setActivityTotal(acts?.data.total ?? acts?.data.items?.length ?? 0);
        setQuotes(qts?.data.items ?? []);
        setWorkOrders(wos?.data.items ?? locRes.data.workOrders?.map((w) => ({
          id: w.id,
          code: w.code ?? "",
          status: w.status ?? "OPEN",
          serviceDate: w.serviceDate,
          createdAt: w.createdAt ?? "",
        })) as CrmWorkOrder[] ?? []);
      } catch (err) {
        toastApiError(err);
        if (!cancelled) {
          setLocation(null);
          if (err instanceof ApiError && err.status === 403) {
            setForbidden(true);
          } else if (err instanceof ApiError && err.status !== 404) {
            setLoadError(err.message);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locationId, reloadKey]);

  React.useEffect(() => {
    if (!location || tab === "overview") return;
    let cancelled = false;
    (async () => {
      setTabLoading(true);
      try {
        if (tab === "activity" && location.customerId) {
          const res = await crmApi.listSalesActivities({
            customerId: location.customerId,
            page: 1,
            pageSize: 50,
            sort: "activityAt",
            direction: "desc",
          });
          if (!cancelled) {
            setActivities(res.data.items ?? []);
            setActivityTotal(res.data.total ?? res.data.items?.length ?? 0);
          }
        }
        if (tab === "quotes" && location.customerId) {
          const res = await crmApi.listQuotes({
            customerId: location.customerId,
            page: 1,
            pageSize: 50,
          });
          if (!cancelled) setQuotes(res.data.items ?? []);
        }
        if (tab === "work-orders") {
          try {
            const res = await crmApi.listWorkOrders({
              locationId,
              page: 1,
              pageSize: 50,
            });
            if (!cancelled) setWorkOrders(res.data.items ?? []);
          } catch {
            if (location.customerId) {
              const res = await crmApi.listWorkOrders({
                customerId: location.customerId,
                page: 1,
                pageSize: 50,
              });
              if (!cancelled) setWorkOrders(res.data.items ?? []);
            }
          }
        }
      } catch (err) {
        toastApiError(err);
      } finally {
        if (!cancelled) setTabLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, location, locationId]);

  const neighborIndex = neighborIds.indexOf(locationId);
  const prevId = neighborIndex > 0 ? neighborIds[neighborIndex - 1] : null;
  const nextId =
    neighborIndex >= 0 && neighborIndex < neighborIds.length - 1
      ? neighborIds[neighborIndex + 1]
      : null;
  const showingLabel =
    neighborIndex >= 0
      ? `Showing ${neighborIndex + 1} of ${neighborIds.length}`
      : null;

  const radiusLabel =
    routeRule?.geofenceRadius?.trim() ||
    location?.geofenceRadius?.trim() ||
    "500 FT";

  const lastVisited =
    workOrders[0]?.serviceDate ??
    workOrders[0]?.createdAt ??
    location?.workOrders?.[0]?.serviceDate ??
    location?.workOrders?.[0]?.createdAt ??
    location?.updatedAt ??
    null;

  const nextVisit = React.useMemo(() => {
    const upcoming = workOrders
      .filter((w) => {
        if (!w.serviceDate) return false;
        return new Date(w.serviceDate).getTime() >= Date.now() - 86400000;
      })
      .sort(
        (a, b) =>
          new Date(a.serviceDate!).getTime() -
          new Date(b.serviceDate!).getTime(),
      )[0];
    if (!upcoming?.serviceDate) return "—";
    const label = [
      formatShortDate(upcoming.serviceDate),
      upcoming.category ?? null,
    ]
      .filter(Boolean)
      .join(" · ");
    return label || formatShortDate(upcoming.serviceDate);
  }, [workOrders]);

  const recentPreview = activities.slice(0, 3);
  const moreActivityCount = Math.max(0, activityTotal - recentPreview.length);

  const padSubtitle = React.useMemo(() => {
    const pad = location?.wellPadNumber?.trim();
    if (pad) return pad;
    const bits = [location?.county, location?.state].filter(Boolean);
    return bits.length ? bits.join(", ") : "—";
  }, [location]);

  async function copyApiNumber(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toastSuccess("API number copied");
    } catch {
      toastApiError(new Error("Couldn't copy API number"));
    }
  }

  function openDirections() {
    if (location?.latitude == null || location?.longitude == null) {
      toastApiError(new Error("Coordinates not set for this site"));
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleAddNote() {
    if (!location || !noteDraft.trim()) return;
    setNoteBusy(true);
    try {
      const author = sessionDisplayName(user) || "You";
      const short =
        author.trim().split(/\s+/).length >= 2
          ? `${author.trim().split(/\s+/)[0]![0]}. ${author.trim().split(/\s+/).slice(-1)[0]}`
          : author;
      const stamp = new Date()
        .toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
        .toUpperCase();
      const entry = `${noteDraft.trim()}\n— ${short.toUpperCase()} · ${stamp}`;
      const nextNotes = location.accessNotes?.trim()
        ? `${location.accessNotes.trim()}\n\n${entry}`
        : entry;
      const res = await crmApi.updateLocation(location.id, {
        accessNotes: nextNotes,
      });
      setLocation(res.data);
      setNoteDraft("");
      setAddingNote(false);
      toastSuccess("Note added");
    } catch (err) {
      toastApiError(err);
    } finally {
      setNoteBusy(false);
    }
  }

  const sourceBadge =
    ruleSource === "SITE_OVERRIDE"
      ? { label: "Site Override", className: "bg-[#1E3A5F] text-[#93C5FD]" }
      : ruleSource === "CUSTOMER_DEFAULT"
        ? { label: "Customer Default", className: "bg-[#3B1F5C] text-[#D8B4FE]" }
        : { label: "System Default", className: "bg-[#2A2A2A] text-[#A1A1AA]" };

  return (
    <CrmDetailStateGate
      loading={loading}
      error={loadError}
      forbidden={forbidden}
      missing={!loading && !location && !loadError && !forbidden}
      missingTitle="Site Not Found"
      missingDescription="This location could not be found or is no longer available."
      onRetry={() => setReloadKey((k) => k + 1)}
    >
      {location ? (
        <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <GlassBtn
              className={!prevId ? "pointer-events-none opacity-40" : undefined}
              onClick={() => {
                if (prevId) router.push(`/crm/locations/${prevId}`);
              }}
            >
              Previous
            </GlassBtn>
            {showingLabel ? (
              <span className="inline-flex h-8 items-center rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {showingLabel}
              </span>
            ) : null}
            <GlassBtn
              className={!nextId ? "pointer-events-none opacity-40" : undefined}
              onClick={() => {
                if (nextId) router.push(`/crm/locations/${nextId}`);
              }}
            >
              Next
            </GlassBtn>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="font-sans text-[18px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[22px]">
                {location.name}
              </h1>
              <button
                ref={titleMenuRef}
                type="button"
                aria-label="Site actions"
                onClick={() => setTitleMenuOpen((o) => !o)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#959597] transition-colors hover:bg-white/5 hover:text-[#FDFDFF]"
              >
                <ChevronDownIcon />
              </button>
              <DashboardMenuPopover
                open={titleMenuOpen}
                onClose={() => setTitleMenuOpen(false)}
                anchorRef={titleMenuRef}
                items={[
                  {
                    id: "edit",
                    label: "Edit Site",
                    onSelect: () =>
                      router.push(`/crm/locations/${location.id}/edit`),
                  },
                  {
                    id: "map",
                    label: "View on Map",
                    onSelect: () =>
                      router.push(
                        `/crm/locations?site=${encodeURIComponent(location.id)}`,
                      ),
                  },
                  {
                    id: "wo",
                    label: "Create Work Order",
                    onSelect: () =>
                      router.push(
                        `/operations/work-orders/new?customerId=${encodeURIComponent(location.customerId)}&locationId=${encodeURIComponent(location.id)}`,
                      ),
                  },
                ]}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GlassBtn onClick={openDirections}>Get Directions</GlassBtn>
              <GlassBtn href={`/crm/locations/${location.id}/edit`}>
                Edit Site
              </GlassBtn>
              <GlassBtn
                href={`/crm/locations?site=${encodeURIComponent(location.id)}`}
              >
                View on Map
              </GlassBtn>
              <DashboardToolbarButton
                variant="primary"
                leftIcon={<ClipboardIcon className="shrink-0" />}
                onClick={() =>
                  router.push(
                    `/operations/work-orders/new?customerId=${encodeURIComponent(location.customerId)}&locationId=${encodeURIComponent(location.id)}`,
                  )
                }
              >
                Create Work Order
              </DashboardToolbarButton>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {CONTACT_DETAIL_TABS.map((t) => {
              const active = tab === t.id;
              const count =
                t.id === "activity"
                  ? activityTotal
                  : t.id === "quotes"
                    ? quotes.length
                    : t.id === "work-orders"
                      ? workOrders.length
                      : null;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-lg px-3.5 py-2 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] transition-colors ${
                    active
                      ? "bg-[#FDFDFF] text-[#0D0D0D]"
                      : "border border-[#2D2D30] bg-[#1A1A1A] text-[#959597] hover:bg-white/5 hover:text-[#FDFDFF]"
                  }`}
                >
                  {t.label}
                  {count != null && count > 0 ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <DashboardBadge
              variant={location.status === "ACTIVE" ? "success" : "neutral"}
              pill
            >
              {statusLabel(location.status)}
            </DashboardBadge>
            <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
              {location.customer?.name ?? "—"}
              <span aria-hidden> (Customer)</span>
            </p>
          </div>

          {tab === "overview" ? (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] lg:gap-5">
              <div className="space-y-4">
                <SectionCard title="Site Details">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2A2A2A] font-sans text-[13px] font-[510] text-[#FDFDFF]">
                      {initials(location.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-sans text-[14px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                        {location.name}
                      </p>
                      <p className="mt-1 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                        {padSubtitle}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
                    <DetailPair
                      label="Customer"
                      value={location.customer?.name ?? "—"}
                    />
                    <DetailPair
                      label="API Number"
                      value={location.apiNumber ?? "—"}
                      trailing={
                        location.apiNumber ? (
                          <button
                            type="button"
                            aria-label="Copy API number"
                            onClick={() => void copyApiNumber(location.apiNumber!)}
                            className="text-[#959597] transition-colors hover:text-[#FDFDFF]"
                          >
                            <CopyIcon />
                          </button>
                        ) : null
                      }
                    />
                    <DetailPair
                      label="Site Type"
                      value={location.siteType ?? "—"}
                    />
                    <DetailPair
                      label="Site Contact"
                      value={location.siteContact ?? "—"}
                    />
                    <DetailPair
                      label="Status"
                      value={
                        <DashboardBadge
                          variant={
                            location.status === "ACTIVE" ? "success" : "neutral"
                          }
                          pill
                        >
                          {statusLabel(location.status)}
                        </DashboardBadge>
                      }
                    />
                    <DetailPair
                      label="Last Visited"
                      value={formatFullDate(lastVisited)}
                    />
                    <DetailPair
                      label="Open Jobs"
                      value={String(location.openJobs ?? workOrders.length ?? 0)}
                    />
                    <DetailPair label="Next Visit" value={nextVisit} />
                    <DetailPair
                      label="Drive Time"
                      value={routeRule?.expectedTravelTime ?? "—"}
                    />
                  </div>
                </SectionCard>

                <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
                  <SectionCard
                    title="Recent Activity"
                    footer={
                      moreActivityCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => setTab("activity")}
                          className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:opacity-70"
                        >
                          + {moreActivityCount} More
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setTab("activity")}
                          className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
                        >
                          View Activity
                        </button>
                      )
                    }
                  >
                    {recentPreview.length === 0 ? (
                      <p className="font-sans text-[11px] uppercase text-[#959597]">
                        No activity logged yet
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {recentPreview.map((a) => {
                          const bits = [
                            a.activityCode ?? null,
                            a.type,
                            formatActivityDate(a.activityAt),
                            a.subject ?? a.notes ?? null,
                            a.outcome ?? null,
                          ].filter(Boolean);
                          return (
                            <li key={a.id}>
                              <Link
                                href={`/crm/sales/${a.id}`}
                                className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597] transition-colors hover:text-[#FDFDFF]"
                              >
                                {bits.join(" · ")}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </SectionCard>

                  <SectionCard
                    title="Notes"
                    footer={
                      addingNote ? (
                        <div className="space-y-2">
                          <textarea
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 py-2 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none focus:border-[#3E3E3E]"
                            placeholder="Add a note…"
                          />
                          <div className="flex gap-2">
                            <DashboardToolbarButton
                              disabled={noteBusy || !noteDraft.trim()}
                              onClick={() => void handleAddNote()}
                            >
                              Save
                            </DashboardToolbarButton>
                            <DashboardToolbarButton
                              onClick={() => {
                                setAddingNote(false);
                                setNoteDraft("");
                              }}
                            >
                              Cancel
                            </DashboardToolbarButton>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAddingNote(true)}
                          className="inline-flex h-8 items-center rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5"
                        >
                          + Add Note
                        </button>
                      )
                    }
                  >
                    {location.accessNotes?.trim() ? (
                      <p className="whitespace-pre-wrap font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF]">
                        {location.accessNotes}
                      </p>
                    ) : (
                      <p className="font-sans text-[11px] uppercase text-[#959597]">
                        No notes on file
                      </p>
                    )}
                  </SectionCard>
                </div>
              </div>

              <div className="space-y-4">
                <SectionCard title="Site Location">
                  <SiteLocationMap
                    name={location.name}
                    latitude={location.latitude}
                    longitude={location.longitude}
                    radiusLabel={radiusLabel}
                  />
                  <div className="mt-4 space-y-1 border-t border-[#2D2D30] pt-3">
                    <RelatedRow
                      label="Coordinates"
                      value={
                        location.latitude != null && location.longitude != null
                          ? `${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}`
                          : "—"
                      }
                    />
                    <RelatedRow label="County" value={location.county ?? "—"} />
                    <RelatedRow label="State" value={location.state ?? "—"} />
                    <RelatedRow
                      label="Drive Time"
                      value={routeRule?.expectedTravelTime ?? "—"}
                    />
                    <RelatedRow
                      label="Access Notes"
                      value={
                        location.accessNotes?.split("\n")[0]?.trim() || "—"
                      }
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  title="GPS Rule · Resolved"
                  trailing={
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] ${sourceBadge.className}`}
                    >
                      {sourceBadge.label}
                    </span>
                  }
                >
                  <div className="space-y-1">
                    <RelatedRow
                      label="Source"
                      value={sourceBadge.label}
                      valueClassName={
                        ruleSource === "SITE_OVERRIDE"
                          ? "text-[#60A5FA]"
                          : ruleSource === "CUSTOMER_DEFAULT"
                            ? "text-[#C084FC]"
                            : "text-[#A1A1AA]"
                      }
                    />
                    <RelatedRow label="Radius" value={radiusLabel} />
                    <RelatedRow
                      label="GPS Required"
                      value={
                        (routeRule?.gpsRequired ?? location.gpsRequired)
                          ? "Yes"
                          : "No"
                      }
                    />
                    <RelatedRow
                      label="Clock-In Window"
                      value={routeRule?.clockInWindow ?? "—"}
                    />
                    <RelatedRow
                      label="Route From"
                      value={routeRule?.routeFrom ?? "—"}
                    />
                    <RelatedRow
                      label="Travel Time"
                      value={routeRule?.expectedTravelTime ?? "—"}
                    />
                  </div>
                  {routeRule?.id ? (
                    <Link
                      href={`/crm/route-rules/${routeRule.id}/edit`}
                      className="mt-4 inline-flex items-center gap-1 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#4ADE80] hover:opacity-80"
                    >
                      Edit Rule <ChevronRightIcon />
                    </Link>
                  ) : (
                    <Link
                      href="/crm/route-rules/new"
                      className="mt-4 inline-flex items-center gap-1 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#4ADE80] hover:opacity-80"
                    >
                      Create Rule <ChevronRightIcon />
                    </Link>
                  )}
                  {flagInsight ? (
                    <div className="mt-4 rounded-lg border border-[#8B6914]/60 bg-[#1C160C] px-3 py-3">
                      <p className="font-sans text-[11px] uppercase leading-relaxed tracking-[-0.02em] text-[#E8C07A]">
                        {flagInsight.message}
                      </p>
                      <DashboardToolbarButton
                        variant="primary"
                        className="mt-3"
                        onClick={() => {
                          if (flagInsight.routeRuleId) {
                            router.push(
                              `/crm/route-rules/${flagInsight.routeRuleId}/edit`,
                            );
                          } else {
                            router.push("/crm/route-rules");
                          }
                        }}
                      >
                        Adjust Radius
                      </DashboardToolbarButton>
                    </div>
                  ) : null}
                </SectionCard>
              </div>
            </div>
          ) : null}

          {tab === "activity" ? (
            tabLoading ? (
              <CrmTabLoadingState />
            ) : activities.length === 0 ? (
              <CrmEmptyTabState title="No Activity" description="No sales activity for this customer yet." />
            ) : (
              <SectionCard title={`Activity · ${activityTotal} Entries`}>
                <ul className="divide-y divide-[#2D2D30]">
                  {activities.map((a) => (
                    <li key={a.id} className="py-3">
                      <Link
                        href={`/crm/sales/${a.id}`}
                        className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:opacity-80"
                      >
                        {[
                          a.activityCode,
                          a.type,
                          formatActivityDate(a.activityAt),
                          a.subject ?? a.notes,
                          a.outcome,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )
          ) : null}

          {tab === "quotes" ? (
            tabLoading ? (
              <CrmTabLoadingState />
            ) : quotes.length === 0 ? (
              <CrmEmptyTabState title="No Quotes" description="No quotes for this customer yet." />
            ) : (
              <SectionCard title={`Quotes · ${quotes.length}`}>
                <ul className="divide-y divide-[#2D2D30]">
                  {quotes.map((q) => (
                    <li key={q.id} className="py-3">
                      <Link
                        href={`/crm/quotes/${q.id}`}
                        className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:opacity-80"
                      >
                        {[q.quoteNumber, q.status, q.customer?.name]
                          .filter(Boolean)
                          .join(" · ")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )
          ) : null}

          {tab === "work-orders" ? (
            tabLoading ? (
              <CrmTabLoadingState />
            ) : workOrders.length === 0 ? (
              <CrmEmptyTabState
                title="No Work Orders"
                description="No work orders linked to this site yet."
              />
            ) : (
              <SectionCard title={`Work Orders · ${workOrders.length}`}>
                <ul className="divide-y divide-[#2D2D30]">
                  {workOrders.map((w) => (
                    <li key={w.id} className="py-3">
                      <Link
                        href={`/operations/work-orders/${w.id}`}
                        className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:opacity-80"
                      >
                        {[
                          w.code,
                          w.status,
                          formatShortDate(w.serviceDate ?? w.createdAt),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )
          ) : null}
        </div>
      ) : null}
    </CrmDetailStateGate>
  );
}
