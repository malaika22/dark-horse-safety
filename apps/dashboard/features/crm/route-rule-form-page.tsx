"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  DashboardToggle,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { toApiStatus } from "@/lib/crm-ui";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";

export function RouteRuleFormPage({
  mode = "create",
  ruleId,
}: {
  mode?: "create" | "edit";
  ruleId?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);
  const [customers, setCustomers] = React.useState<DashboardSelectOption[]>([]);
  const [locations, setLocations] = React.useState<DashboardSelectOption[]>([]);
  const [customerId, setCustomerId] = React.useState("");
  const [locationId, setLocationId] = React.useState("");
  const [geofenceRadius, setGeofenceRadius] = React.useState("");
  const [gpsRequired, setGpsRequired] = React.useState(false);
  const [clockInWindow, setClockInWindow] = React.useState("");
  const [routeFrom, setRouteFrom] = React.useState("");
  const [expectedTravelTime, setExpectedTravelTime] = React.useState("");
  const [mileageRateOverride, setMileageRateOverride] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cust, locs] = await Promise.all([
          crmApi.lookupCustomers(),
          crmApi.listLocations({ pageSize: 100 }),
        ]);
        if (cancelled) return;
        setCustomers(cust.data.map((c) => ({ value: c.id, label: c.name })));
        setLocations(
          locs.data.items.map((l) => ({ value: l.id, label: l.name })),
        );
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        setGeofenceRadius(r.geofenceRadius ?? "");
        setGpsRequired(Boolean(r.gpsRequired));
        setClockInWindow(r.clockInWindow ?? "");
        setRouteFrom(r.routeFrom ?? r.routeLabel ?? "");
        setExpectedTravelTime(r.expectedTravelTime ?? "");
        setMileageRateOverride(r.mileageRateOverride ?? "");
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

  async function handleSave() {
    if (!customerId) {
      toastApiError(new Error("Customer is required"));
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        customerId,
        locationId: locationId || undefined,
        geofenceRadius: geofenceRadius.trim() || undefined,
        gpsRequired,
        clockInWindow: clockInWindow.trim() || undefined,
        routeFrom: routeFrom.trim() || undefined,
        expectedTravelTime: expectedTravelTime.trim() || undefined,
        mileageRateOverride: mileageRateOverride.trim() || undefined,
        status: toApiStatus("active"),
      };
      if (isEdit && ruleId) {
        await crmApi.updateRouteRule(ruleId, body);
        toastSuccess("Route rule updated");
      } else {
        await crmApi.createRouteRule(body);
        toastSuccess("Route rule created");
      }
      router.push("/crm/route-rules");
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="bg-shell p-6 font-sans text-sm text-[#959597]">Loading…</div>
    );
  }

  return (
    <CrmFormPageShell
      cancelHref="/crm/route-rules"
      submitLabel="Save"
      submitting={submitting}
      onSave={() => void handleSave()}
      sections={[
        {
          title: "Rule Details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardSelectField
                label="Customer *"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                options={customers}
              />
              <DashboardSelectField
                label="Site *"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                options={locations}
              />
              <DashboardTextField
                label="Geofence Radius *"
                value={geofenceRadius}
                onChange={(e) => setGeofenceRadius(e.target.value)}
                placeholder="500 FT"
              />
              <DashboardToggle
                label="GPS Required?"
                checked={gpsRequired}
                onCheckedChange={setGpsRequired}
              />
              <DashboardTextField
                label="Allowed Clock In Window"
                value={clockInWindow}
                onChange={(e) => setClockInWindow(e.target.value)}
                placeholder="Clock in window"
              />
              <DashboardTextField
                label="Route From"
                value={routeFrom}
                onChange={(e) => setRouteFrom(e.target.value)}
                placeholder="Route from"
              />
              <DashboardTextField
                label="Expected Travel Time"
                value={expectedTravelTime}
                onChange={(e) => setExpectedTravelTime(e.target.value)}
                placeholder="Travel time"
              />
              <DashboardTextField
                label="Mileage Rate Override"
                value={mileageRateOverride}
                onChange={(e) => setMileageRateOverride(e.target.value)}
                placeholder="$0.00/Mi"
              />
            </DashboardFormGrid>
          ),
        },
      ]}
    />
  );
}
