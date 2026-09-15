"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  DashboardToolbarButton,
  cn,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { toIsoDate } from "@/lib/crm-ui";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";
import { toastApiError, toastSuccess, toastValidationError } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";
import { useCustomerOptions } from "./use-customer-options";

function parseRadiusFt(raw: string): number {
  const m = raw.match(/([\d.]+)/);
  return m ? Number(m[1]) : 0;
}

function formatRadius(ft: number): string {
  return `${Math.round(ft)} ft`;
}

function parseCoords(raw: string): { lat: number; lng: number } | null {
  const m = raw
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/**
 * Add / Edit Route Rule — Figma layout + live API.
 */
export function RouteRuleFormPage({
  mode = "create",
  ruleId,
}: {
  mode?: "create" | "edit";
  ruleId?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const { options: customers, loading: customersLoading } = useCustomerOptions();
  const { lookups } = useCrmLookups({ includeLocations: false });
  const originTypeOptions = lookupOptions(lookups, "routeOriginTypes");
  const gpsUnavailableOptions = lookupOptions(
    lookups,
    "gpsUnavailableBehaviors",
  );

  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);
  const [sites, setSites] = React.useState<DashboardSelectOption[]>([]);
  const [yards, setYards] = React.useState<DashboardSelectOption[]>([]);
  const [sitesLoading, setSitesLoading] = React.useState(false);

  const [customerId, setCustomerId] = React.useState("");
  const [locationId, setLocationId] = React.useState("");
  const [geofenceRadius, setGeofenceRadius] = React.useState("");
  const [geofenceIsOverride, setGeofenceIsOverride] = React.useState(false);
  const [gpsRequired, setGpsRequired] = React.useState(false);
  const [clockInBeforeMin, setClockInBeforeMin] = React.useState("");
  const [clockInAfterMin, setClockInAfterMin] = React.useState("");
  const [originType, setOriginType] = React.useState("");
  const [originLocationId, setOriginLocationId] = React.useState("");
  const [preferredRoute, setPreferredRoute] = React.useState("");
  const [expectedTravelTime, setExpectedTravelTime] = React.useState("");
  const [travelTimeAuto, setTravelTimeAuto] = React.useState(false);
  const [mileageRate, setMileageRate] = React.useState("");
  const [mileageRateIsOverride, setMileageRateIsOverride] =
    React.useState(false);
  const [gpsAccuracy, setGpsAccuracy] = React.useState("");
  const [gpsAccuracyIsOverride, setGpsAccuracyIsOverride] =
    React.useState(false);
  const [gpsUnavailableBehavior, setGpsUnavailableBehavior] =
    React.useState("");
  const [effectiveFrom, setEffectiveFrom] = React.useState("");
  const [effectiveTo, setEffectiveTo] = React.useState("");

  const [inheritedRadius, setInheritedRadius] = React.useState("");
  const [systemDefaultRadius, setSystemDefaultRadius] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [siteName, setSiteName] = React.useState("");
  const [originName, setOriginName] = React.useState("");
  const [autoTravelMinutes, setAutoTravelMinutes] = React.useState<
    number | null
  >(null);
  const [systemMileageRate, setSystemMileageRate] = React.useState("");
  const [systemGpsAccuracy, setSystemGpsAccuracy] = React.useState("");

  const [siteLat, setSiteLat] = React.useState<number | null>(null);
  const [siteLng, setSiteLng] = React.useState<number | null>(null);
  const [testCoords, setTestCoords] = React.useState("");
  const [testResult, setTestResult] = React.useState<{
    inside: boolean;
    message: string;
  } | null>(null);
  const [testing, setTesting] = React.useState(false);
  const mapRef = React.useRef<HTMLDivElement>(null);

  const radiusFt = parseRadiusFt(geofenceRadius) || 500;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!customerId) {
        setSites([]);
        setYards([]);
        return;
      }
      setSitesLoading(true);
      try {
        const locs = await crmApi.lookupLocations(undefined, customerId);
        if (cancelled) return;
        const rows = locs.data ?? [];
        const opts = rows.map((l) => ({
          value: l.id,
          label: [l.name, l.county].filter(Boolean).join(" · "),
        }));
        setSites(opts);
        const yardRows = rows.filter((l) => {
          const t = (l.siteType ?? "").toLowerCase();
          return (
            t.includes("yard") ||
            t.includes("facility") ||
            t.includes("office") ||
            t.includes("pad")
          );
        });
        setYards(
          (yardRows.length ? yardRows : rows).map((l) => ({
            value: l.id,
            label: [l.name, l.county].filter(Boolean).join(" · "),
          })),
        );
      } catch (err) {
        toastApiError(err);
        if (!cancelled) {
          setSites([]);
          setYards([]);
        }
      } finally {
        if (!cancelled) setSitesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  React.useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.routeRuleDefaults({
          customerId,
          locationId: locationId || undefined,
          originLocationId: originLocationId || undefined,
        });
        if (cancelled) return;
        const d = res.data;
        setSystemDefaultRadius(d.systemDefaultRadius);
        setInheritedRadius(d.customerInheritedRadius ?? d.systemDefaultRadius);
        setCustomerName(d.customerName);
        setSiteName(d.siteName);
        setOriginName(d.originName);
        setAutoTravelMinutes(d.autoTravelMinutes);
        setSystemMileageRate(d.systemMileageRate);
        setSystemGpsAccuracy(d.systemGpsAccuracy);
        setSiteLat(d.siteLat ?? null);
        setSiteLng(d.siteLng ?? null);
        if (!geofenceIsOverride && d.customerInheritedRadius) {
          setGeofenceRadius(d.customerInheritedRadius);
        }
        if (travelTimeAuto && d.autoTravelMinutes != null) {
          setExpectedTravelTime(String(d.autoTravelMinutes));
        }
        if (!mileageRateIsOverride) {
          setMileageRate(d.systemMileageRate);
        }
        if (!gpsAccuracyIsOverride) {
          setGpsAccuracy(d.systemGpsAccuracy);
        }
        if (!isEdit) {
          if (d.systemGpsUnavailableBehavior) {
            setGpsUnavailableBehavior(d.systemGpsUnavailableBehavior);
          }
          if (d.defaultClockInBeforeMin != null) {
            setClockInBeforeMin(String(d.defaultClockInBeforeMin));
          }
          if (d.defaultClockInAfterMin != null) {
            setClockInAfterMin(String(d.defaultClockInAfterMin));
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, locationId, originLocationId]);

  React.useEffect(() => {
    if (!customerId) {
      setSiteLat(null);
      setSiteLng(null);
      setTestCoords("");
      setTestResult(null);
    }
  }, [customerId]);

  React.useEffect(() => {
    setTestCoords("");
    setTestResult(null);
  }, [locationId]);

  React.useEffect(() => {
    if (parseRadiusFt(geofenceRadius) > 0) {
      setGpsRequired(true);
    }
  }, [geofenceRadius]);

  React.useEffect(() => {
    if (!isEdit || !ruleId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.getRouteRule(ruleId);
        if (cancelled) return;
        const r = res.data;
        setCustomerId(r.customerId);
        setLocationId(r.locationId ?? "");
        setGeofenceRadius(r.geofenceRadius ?? "500 ft");
        setGeofenceIsOverride(r.geofenceIsOverride !== false);
        setGpsRequired(Boolean(r.gpsRequired));
        setClockInBeforeMin(
          r.clockInBeforeMin != null ? String(r.clockInBeforeMin) : "15",
        );
        setClockInAfterMin(
          r.clockInAfterMin != null ? String(r.clockInAfterMin) : "15",
        );
        setOriginType(r.originType ?? "YARD");
        setOriginLocationId(r.originLocationId ?? "");
        setPreferredRoute(r.preferredRoute ?? r.routeLabel ?? "");
        setExpectedTravelTime(
          (r.expectedTravelTime ?? "45").replace(/[^\d]/g, "") || "45",
        );
        setTravelTimeAuto(r.travelTimeAuto !== false);
        setMileageRate(r.mileageRateOverride ?? "$0.67/mi");
        setMileageRateIsOverride(Boolean(r.mileageRateIsOverride));
        setGpsAccuracy(r.gpsAccuracyMeters ?? "15 m");
        setGpsAccuracyIsOverride(Boolean(r.gpsAccuracyIsOverride));
        setGpsUnavailableBehavior(
          r.gpsUnavailableBehavior ?? "BLOCK_CLOCK_IN",
        );
        setEffectiveFrom(
          r.effectiveFrom ? String(r.effectiveFrom).slice(0, 10) : "",
        );
        setEffectiveTo(r.effectiveTo ? String(r.effectiveTo).slice(0, 10) : "");
        setReady(true);
      } catch (err) {
        toastApiError(err);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, ruleId]);

  function resetGeofenceInherited() {
    setGeofenceIsOverride(false);
    setGeofenceRadius(inheritedRadius || systemDefaultRadius);
  }

  async function handleTest() {
    if (!locationId) {
      toastValidationError("Select a site first");
      return;
    }
    const coords = parseCoords(testCoords);
    if (!coords) {
      toastValidationError("Paste coordinates as lat, lng");
      return;
    }
    setTesting(true);
    try {
      const res = await crmApi.testRouteGeofence({
        locationId,
        geofenceRadius,
        lat: coords.lat,
        lng: coords.lng,
      });
      setTestResult({
        inside: res.data.inside,
        message: res.data.message,
      });
    } catch (err) {
      toastApiError(err);
    } finally {
      setTesting(false);
    }
  }

  function onMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!mapRef.current || !locationId) return;
    if (siteLat == null || siteLng == null) {
      toastValidationError(
        "Selected site has no GPS coordinates — paste lat, lng to test",
      );
      return;
    }
    const rect = mapRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const lat = siteLat + (0.5 - y) * 0.02;
    const lng = siteLng + (x - 0.5) * 0.02;
    setTestCoords(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  }

  async function handleSave(addAnother = false) {
    if (!customerId || !locationId || !geofenceRadius.trim()) {
      toastValidationError();
      return;
    }
    setSubmitting(true);
    try {
      const before = Number.parseInt(clockInBeforeMin, 10);
      const after = Number.parseInt(clockInAfterMin, 10);
      const body = {
        customerId,
        locationId,
        geofenceRadius: geofenceRadius.trim(),
        geofenceIsOverride,
        gpsRequired,
        clockInBeforeMin: Number.isFinite(before) ? before : 15,
        clockInAfterMin: Number.isFinite(after) ? after : 15,
        clockInWindow: `${clockInBeforeMin || 15} min before · ${clockInAfterMin || 15} min after`,
        originType: originType || undefined,
        originLocationId: originLocationId || undefined,
        routeFrom: originName || yards.find((y) => y.value === originLocationId)?.label,
        preferredRoute: preferredRoute.trim() || undefined,
        expectedTravelTime: `${expectedTravelTime.trim() || "45"} min`,
        travelTimeAuto,
        mileageRateOverride: mileageRate.trim() || undefined,
        mileageRateIsOverride,
        gpsAccuracyMeters: gpsAccuracy.trim() || undefined,
        gpsAccuracyIsOverride,
        gpsUnavailableBehavior: gpsUnavailableBehavior || undefined,
        effectiveFrom: toIsoDate(effectiveFrom),
        effectiveTo: toIsoDate(effectiveTo),
        status: "ACTIVE",
      };

      if (isEdit && ruleId) {
        await crmApi.updateRouteRule(ruleId, body);
        toastSuccess("Route rule updated");
      } else {
        await crmApi.createRouteRule(body);
        toastSuccess("Route rule created");
      }

      if (addAnother && !isEdit) {
        setLocationId("");
        setPreferredRoute("");
        setTestResult(null);
        setTestCoords("");
      } else {
        router.push("/crm/route-rules");
      }
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="bg-shell p-6 font-sans text-sm text-[#959597]">
        Loading…
      </div>
    );
  }

  const displaySite =
    siteName || sites.find((s) => s.value === locationId)?.label || "Site";
  const displayOrigin =
    originName ||
    yards.find((y) => y.value === originLocationId)?.label ||
    "Yard";
  const travelLabel = `${expectedTravelTime || "—"} min`;
  const geofenceScale = Math.min(0.42, Math.max(0.12, radiusFt / 2000));

  function ModeButton({
    active,
    onClick,
    children,
    variant = "default",
  }: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    variant?: "default" | "auto";
  }) {
    if (variant === "auto" && active) {
      return (
        <span className="inline-flex shrink-0 items-center rounded-md bg-[#166534] px-2.5 py-1.5 font-sans text-[10px] font-[510] uppercase text-[#86EFAC]">
          {children}
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "shrink-0 rounded-md border px-2.5 py-1.5 font-sans text-[10px] uppercase tracking-[-0.02em]",
          active
            ? "border-[#1E3A5F] bg-[#1E3A5F] text-[#60A5FA]"
            : "border-[#3E3E3E] bg-[#2A2A2A] text-[#959597] hover:text-[#FDFDFF]",
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <CrmFormPageShell
      cancelHref="/crm/route-rules"
      submitLabel="Save"
      submitting={submitting}
      showTopCancel={false}
      onSave={() => void handleSave(false)}
      onSaveAndAddAnother={
        isEdit ? undefined : () => void handleSave(true)
      }
      sections={[
        {
          title: "Rule Details",
          content: (
            <div className="space-y-5">
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                {/* Row 1 */}
                <DashboardSelectField
                  label="Customer *"
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    setLocationId("");
                    setOriginLocationId("");
                  }}
                  options={customers}
                  loading={customersLoading}
                  placeholder="Select customer"
                  emptyMessage="No record found"
                />
                <DashboardSelectField
                  label="Site *"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  options={sites}
                  loading={sitesLoading}
                  placeholder={
                    customerId ? "Select site" : "Select customer first"
                  }
                  emptyMessage="No record found"
                />

                {/* Row 2: Geofence | GPS Required */}
                <div className="space-y-1.5">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    Geofence Radius <span className="text-[#E5484D]">*</span>
                  </span>
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3">
                    <input
                      value={geofenceRadius}
                      onChange={(e) => {
                        setGeofenceRadius(e.target.value);
                        setGeofenceIsOverride(true);
                      }}
                      placeholder="500 ft"
                      className="min-w-0 flex-1 bg-transparent font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none md:text-[13px]"
                    />
                    <button
                      type="button"
                      onClick={() => setGeofenceIsOverride(true)}
                      className={cn(
                        "shrink-0 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em]",
                        geofenceIsOverride
                          ? "text-[#60A5FA]"
                          : "text-[#60A5FA]/70 hover:text-[#60A5FA]",
                      )}
                    >
                      Site Override
                    </button>
                    <button
                      type="button"
                      onClick={resetGeofenceInherited}
                      className="shrink-0 rounded-md border border-[#3E3E3E] px-2 py-1 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
                    >
                      Reset to Inherited
                    </button>
                  </div>
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    Inherited: {inheritedRadius} from{" "}
                    {customerName || "customer"}. System default:{" "}
                    {systemDefaultRadius}.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    GPS Required
                  </span>
                  <div className="flex h-10 items-center justify-between gap-3 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3">
                    <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {gpsRequired ? "Yes" : "No"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={gpsRequired}
                      onClick={() => setGpsRequired(!gpsRequired)}
                      className={cn(
                        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                        gpsRequired ? "bg-[#3B82F6]" : "bg-[#3E3E3E]",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                          gpsRequired && "translate-x-4",
                        )}
                      />
                    </button>
                  </div>
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    A geofence cannot be enforced without GPS. On automatically
                    because a geofence radius is set.
                  </p>
                </div>

                {/* Row 3: Clock-in window | Origin type */}
                <div className="space-y-2">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    Allowed Clock-in Window
                  </span>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-sans text-[11px] uppercase text-[#959597]">
                        Allowed from
                      </span>
                      <input
                        value={clockInBeforeMin}
                        onChange={(e) =>
                          setClockInBeforeMin(
                            e.target.value.replace(/[^\d]/g, ""),
                          )
                        }
                        className="h-9 w-14 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-2 text-center font-sans text-[12px] uppercase text-[#FDFDFF] outline-none focus:border-[#5A5A5A]"
                      />
                      <span className="font-sans text-[11px] uppercase text-[#959597]">
                        min before
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-sans text-[11px] uppercase text-[#959597]">
                        Until
                      </span>
                      <input
                        value={clockInAfterMin}
                        onChange={(e) =>
                          setClockInAfterMin(
                            e.target.value.replace(/[^\d]/g, ""),
                          )
                        }
                        className="h-9 w-14 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-2 text-center font-sans text-[12px] uppercase text-[#FDFDFF] outline-none focus:border-[#5A5A5A]"
                      />
                      <span className="font-sans text-[11px] uppercase text-[#959597]">
                        min after
                      </span>
                    </div>
                  </div>
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    Reference point: the dispatched job start time (not shift
                    start, which isn&apos;t a defined moment in this product).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <DashboardSelectField
                    label="Origin Type"
                    value={originType}
                    onChange={(e) => setOriginType(e.target.value)}
                    options={
                      originTypeOptions.length
                        ? originTypeOptions
                        : [
                            { value: "YARD", label: "Yard" },
                            { value: "HOME", label: "Home" },
                            {
                              value: "PREVIOUS_JOB",
                              label: "Previous Job",
                            },
                          ]
                    }
                  />
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    Determines whether travel is billable. Home is usually a
                    commute; yard or previous job is usually billable. Feeds
                    time categories and billing.
                  </p>
                </div>

                {/* Row 4: Location | Preferred route */}
                <DashboardSelectField
                  label="Location"
                  value={originLocationId}
                  onChange={(e) => setOriginLocationId(e.target.value)}
                  options={yards.length ? yards : sites}
                  loading={sitesLoading}
                  placeholder="Select yard / origin"
                  emptyMessage="No record found"
                />
                <div className="space-y-1.5">
                  <DashboardTextField
                    label="Preferred Route (Optional)"
                    value={preferredRoute}
                    onChange={(e) => setPreferredRoute(e.target.value)}
                    placeholder="Highway 349"
                  />
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    The way techs actually drive. Informational only — does not
                    affect billing.
                  </p>
                </div>

                {/* Row 5: Travel time | Mileage */}
                <div className="space-y-1.5">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    Expected Travel Time
                  </span>
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3">
                    <input
                      value={expectedTravelTime}
                      onChange={(e) => {
                        setExpectedTravelTime(
                          e.target.value.replace(/[^\d]/g, ""),
                        );
                        setTravelTimeAuto(false);
                      }}
                      placeholder="45"
                      className="min-w-0 flex-1 bg-transparent font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none md:text-[13px]"
                    />
                    <span className="shrink-0 font-sans text-[11px] uppercase text-[#959597]">
                      min
                    </span>
                    <ModeButton
                      variant="auto"
                      active={travelTimeAuto}
                      onClick={() => {
                        setTravelTimeAuto(true);
                        if (autoTravelMinutes != null) {
                          setExpectedTravelTime(String(autoTravelMinutes));
                        }
                      }}
                    >
                      Auto
                    </ModeButton>
                    <ModeButton
                      active={!travelTimeAuto}
                      onClick={() => setTravelTimeAuto(false)}
                    >
                      Override
                    </ModeButton>
                  </div>
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    Calculated from route from and the site&apos;s coordinates.
                    Same pattern as hospital distance on Add Location.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    Mileage Rate Override
                  </span>
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3">
                    <input
                      value={mileageRate}
                      onChange={(e) => {
                        setMileageRate(e.target.value);
                        setMileageRateIsOverride(true);
                      }}
                      placeholder="$0.67/mi"
                      className="min-w-0 flex-1 bg-transparent font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none md:text-[13px]"
                    />
                    <ModeButton
                      active={!mileageRateIsOverride}
                      onClick={() => {
                        setMileageRateIsOverride(false);
                        setMileageRate(systemMileageRate);
                      }}
                    >
                      System Default
                    </ModeButton>
                    <ModeButton
                      active={mileageRateIsOverride}
                      onClick={() => setMileageRateIsOverride(true)}
                    >
                      Override
                    </ModeButton>
                  </div>
                </div>

                {/* Row 6: GPS accuracy | Behavior */}
                <div className="space-y-1.5">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    GPS Accuracy Requirement
                  </span>
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3">
                    <input
                      value={gpsAccuracy}
                      onChange={(e) => {
                        setGpsAccuracy(e.target.value);
                        setGpsAccuracyIsOverride(true);
                      }}
                      placeholder="15 m"
                      className="min-w-0 flex-1 bg-transparent font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none md:text-[13px]"
                    />
                    <ModeButton
                      active={!gpsAccuracyIsOverride}
                      onClick={() => {
                        setGpsAccuracyIsOverride(false);
                        setGpsAccuracy(systemGpsAccuracy);
                      }}
                    >
                      System Default
                    </ModeButton>
                    <ModeButton
                      active={gpsAccuracyIsOverride}
                      onClick={() => setGpsAccuracyIsOverride(true)}
                    >
                      Override
                    </ModeButton>
                  </div>
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    Mobile flags a clock-in as &apos;accuracy too low&apos;
                    beyond this threshold.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <DashboardSelectField
                    label="Behavior when GPS Unavailable"
                    value={gpsUnavailableBehavior}
                    onChange={(e) => setGpsUnavailableBehavior(e.target.value)}
                    options={
                      gpsUnavailableOptions.length
                        ? gpsUnavailableOptions
                        : [
                            {
                              value: "BLOCK_CLOCK_IN",
                              label: "Block Clock-In",
                            },
                            {
                              value: "PROCEED_WITH_FLAG",
                              label: "Proceed With Flag",
                            },
                          ]
                    }
                  />
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    Options: Block Clock-In · Proceed With Flag. Inherited from
                    system default unless overridden.
                  </p>
                </div>

                {/* Row 7: Effective dates */}
                <DashboardTextField
                  label="Effective From"
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
                <div className="space-y-1.5">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    Effective To
                  </span>
                  <div className="relative">
                    <input
                      type="date"
                      value={effectiveTo}
                      onChange={(e) => setEffectiveTo(e.target.value)}
                      className={cn(
                        "h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none focus:border-[#5A5A5A] md:text-[13px]",
                        !effectiveTo && "text-transparent",
                      )}
                    />
                    {!effectiveTo ? (
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597] md:text-[13px]">
                        No end date
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEffectiveTo("")}
                        className="absolute top-1/2 right-3 -translate-y-1/2 font-sans text-[10px] uppercase text-[#60A5FA] hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </DashboardFormGrid>
            </div>
          ),
        },
        {
          title: "Map Preview",
          content: (
            <div className="space-y-3">
              <div
                ref={mapRef}
                role="presentation"
                onClick={onMapClick}
                className="relative h-[300px] overflow-hidden rounded-xl border border-[#2D2D30] bg-[#0B1220] sm:h-[360px]"
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse at 30% 40%, #1a2740 0%, #0b1220 55%, #070b14 100%)",
                  }}
                  aria-hidden
                />
                <div
                  className="absolute inset-0 opacity-35"
                  style={{
                    backgroundImage:
                      "linear-gradient(#2a3a55 1px, transparent 1px), linear-gradient(90deg, #2a3a55 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                    backgroundPosition: "center",
                  }}
                  aria-hidden
                />

                {/* Origin pin */}
                <div className="absolute top-[28%] left-[16%] z-10 flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full border-2 border-[#FDFDFF] bg-[#E8B84A]" />
                  <span className="mt-1 max-w-[110px] truncate rounded bg-[#0D0D0D]/90 px-1.5 py-0.5 font-sans text-[9px] uppercase text-[#FDFDFF]">
                    {displayOrigin}
                  </span>
                </div>

                {/* Route line */}
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <line
                    x1="18"
                    y1="30"
                    x2="62"
                    y2="55"
                    stroke="#E8B84A"
                    strokeWidth="0.7"
                    strokeDasharray="2.2 1.6"
                    opacity="0.9"
                  />
                </svg>
                <span className="absolute top-[40%] left-[38%] rounded-md bg-[#3A2E1C] px-1.5 py-0.5 font-sans text-[9px] uppercase text-[#E8B84A]">
                  ≈{travelLabel}
                </span>

                {/* Site + geofence */}
                <div
                  className="absolute top-1/2 left-[62%] z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{ width: `${geofenceScale * 100}%`, aspectRatio: "1" }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const move = (ev: MouseEvent) => {
                      const el = e.currentTarget;
                      if (!el) return;
                      const rect = el.getBoundingClientRect();
                      const cx = rect.left + rect.width / 2;
                      const cy = rect.top + rect.height / 2;
                      const dx = ev.clientX - cx;
                      const dy = ev.clientY - cy;
                      const dist = Math.sqrt(dx * dx + dy * dy);
                      const next = Math.max(
                        100,
                        Math.min(2000, Math.round(dist * 4)),
                      );
                      setGeofenceIsOverride(true);
                      setGeofenceRadius(formatRadius(next));
                    };
                    const up = () => {
                      window.removeEventListener("mousemove", move);
                      window.removeEventListener("mouseup", up);
                    };
                    window.addEventListener("mousemove", move);
                    window.addEventListener("mouseup", up);
                  }}
                >
                  <div className="absolute inset-0 rounded-full border border-dashed border-[#60A5FA] bg-[#3B82F6]/10" />
                  <span className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#0D0D0D]/95 px-1.5 py-0.5 font-sans text-[9px] uppercase text-[#FDFDFF]">
                    {formatRadius(radiusFt)}
                  </span>
                  <div className="absolute top-1/2 left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                    <span className="relative flex h-4 w-4 items-center justify-center">
                      <span className="absolute h-4 w-4 rounded-full bg-[#EF4444]/35" />
                      <span className="relative h-2.5 w-2.5 rounded-full bg-[#EF4444] ring-2 ring-white" />
                    </span>
                    <span className="mt-1 max-w-[120px] truncate rounded bg-[#0D0D0D]/90 px-1.5 py-0.5 font-sans text-[9px] uppercase text-[#FDFDFF]">
                      {displaySite}
                    </span>
                  </div>
                </div>

                <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/70 px-2 py-1.5 font-sans text-[9px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  Drag edge to resize — updates geofence radius above
                </div>
                <div className="absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-lg border border-[#2D2D30] bg-black/80">
                  <button
                    type="button"
                    className="h-8 w-8 text-[#FDFDFF] hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGeofenceRadius(
                        formatRadius(Math.min(2000, radiusFt + 50)),
                      );
                      setGeofenceIsOverride(true);
                    }}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="h-8 w-8 border-t border-[#2D2D30] text-[#FDFDFF] hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGeofenceRadius(
                        formatRadius(Math.max(100, radiusFt - 50)),
                      );
                      setGeofenceIsOverride(true);
                    }}
                  >
                    −
                  </button>
                </div>
              </div>
            </div>
          ),
        },
        {
          title: "Test This Rule",
          content: (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={testCoords}
                  onChange={(e) => setTestCoords(e.target.value)}
                  placeholder="Drop a point on the map, or paste coordinates"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A] focus:border-[#5A5A5A]"
                />
                <DashboardToolbarButton
                  variant="primary"
                  disabled={testing}
                  onClick={() => void handleTest()}
                >
                  {testing ? "Testing…" : "Test"}
                </DashboardToolbarButton>
              </div>
              {testResult ? (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em]",
                    testResult.inside
                      ? "border-[#166534] bg-[#0F2A1A] text-[#86EFAC]"
                      : "border-[#7F1D1D] bg-[#2A1212] text-[#FCA5A5]",
                  )}
                >
                  <span aria-hidden>{testResult.inside ? "✓" : "×"}</span>
                  {testResult.message}
                </div>
              ) : (
                <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                  Example shown. A point inside the radius instead reads:
                  &apos;✓ Inside geofence (312 ft from centre)&apos; in green.
                </p>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
