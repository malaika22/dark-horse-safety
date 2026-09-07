"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardField,
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

function MapPinIcon({ className }: { className?: string }) {
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
        d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

const controlClass =
  "h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] outline-none transition-colors placeholder:text-[#959597] focus:border-[#5A5A5A] md:text-[13px]";

const LOCATION_FORM = {
  counties: [
    { value: "Midland", label: "Midland" },
    { value: "Ector", label: "Ector" },
    { value: "Reeves", label: "Reeves" },
  ] as DashboardSelectOption[],
  states: [
    { value: "TX", label: "TX" },
    { value: "NM", label: "NM" },
    { value: "OK", label: "OK" },
  ] as DashboardSelectOption[],
  siteTypes: [
    { value: "well", label: "Well" },
    { value: "pad", label: "Pad" },
    { value: "facility", label: "Facility" },
  ] as DashboardSelectOption[],
  statuses: [
    { value: "active", label: "Active" },
    { value: "idle", label: "Idle" },
  ] as DashboardSelectOption[],
};

export function LocationFormPage({
  mode = "create",
  locationId,
}: {
  mode?: "create" | "edit";
  locationId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit";
  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);
  const [customers, setCustomers] = React.useState<DashboardSelectOption[]>([]);
  const [customerId, setCustomerId] = React.useState(
    searchParams.get("customerId") ?? "",
  );
  const [gpsRequired, setGpsRequired] = React.useState(false);
  const [name, setName] = React.useState("");
  const [wellPadNumber, setWellPadNumber] = React.useState("");
  const [apiNumber, setApiNumber] = React.useState("");
  const [county, setCounty] = React.useState("");
  const [state, setState] = React.useState("");
  const [coordinates, setCoordinates] = React.useState("");
  const [siteType, setSiteType] = React.useState("");
  const [status, setStatus] = React.useState("active");
  const [accessNotes, setAccessNotes] = React.useState("");
  const [siteContact, setSiteContact] = React.useState("");
  const [geofenceRadius, setGeofenceRadius] = React.useState("");
  const [nearestHospital, setNearestHospital] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.lookupCustomers();
        if (cancelled) return;
        const opts = res.data.map((c) => ({ value: c.id, label: c.name }));
        const qName = searchParams.get("customer");
        const qId = searchParams.get("customerId");
        if (qId && qName && !opts.some((o) => o.value === qId)) {
          opts.unshift({ value: qId, label: qName });
        }
        setCustomers(opts);
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  React.useEffect(() => {
    if (!isEdit || !locationId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.getLocation(locationId);
        if (cancelled) return;
        const l = res.data;
        setCustomerId(l.customerId);
        setName(l.name ?? "");
        setWellPadNumber(l.wellPadNumber ?? "");
        setApiNumber(l.apiNumber ?? "");
        setCounty(l.county ?? "");
        setState(l.state ?? "");
        setCoordinates(
          l.latitude != null && l.longitude != null
            ? `${l.latitude}, ${l.longitude}`
            : "",
        );
        setSiteType(l.siteType ?? "");
        setStatus((l.status ?? "ACTIVE").toLowerCase().replace(/_/g, "-"));
        setAccessNotes(l.accessNotes ?? "");
        setSiteContact(l.siteContact ?? "");
        setGeofenceRadius(l.geofenceRadius ?? "");
        setGpsRequired(Boolean(l.gpsRequired));
        setNearestHospital(l.nearestHospital ?? "");
        setReady(true);
      } catch (err) {
        toastApiError(err);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, locationId]);

  async function handleSave() {
    if (!customerId || !name.trim()) {
      toastApiError(new Error("Customer and location name are required"));
      return;
    }
    const [latRaw, lngRaw] = coordinates.split(",").map((p) => p.trim());
    const latitude = latRaw ? Number(latRaw) : undefined;
    const longitude = lngRaw ? Number(lngRaw) : undefined;
    setSubmitting(true);
    try {
      const body = {
        customerId,
        name: name.trim(),
        wellPadNumber: wellPadNumber.trim() || undefined,
        apiNumber: apiNumber.trim() || undefined,
        county: county || undefined,
        state: state || undefined,
        latitude: Number.isFinite(latitude) ? latitude : undefined,
        longitude: Number.isFinite(longitude) ? longitude : undefined,
        siteType: siteType || undefined,
        status: toApiStatus(status),
        accessNotes: accessNotes.trim() || undefined,
        siteContact: siteContact.trim() || undefined,
        geofenceRadius: geofenceRadius.trim() || undefined,
        gpsRequired,
        nearestHospital: nearestHospital.trim() || undefined,
      };
      if (isEdit && locationId) {
        await crmApi.updateLocation(locationId, body);
        toastSuccess("Location updated");
      } else {
        await crmApi.createLocation(body);
        toastSuccess("Location created");
      }
      router.push("/crm/locations");
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
      cancelHref="/crm/locations"
      submitLabel="Save"
      submitting={submitting}
      onSave={() => void handleSave()}
      sections={[
        {
          title: "Location Details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="Location Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Location name"
              />
              <DashboardTextField
                label="Well / Pad Number"
                value={wellPadNumber}
                onChange={(e) => setWellPadNumber(e.target.value)}
                placeholder="WPC-0000"
              />
              <DashboardTextField
                label="API Number"
                value={apiNumber}
                onChange={(e) => setApiNumber(e.target.value)}
                placeholder="API number"
              />
              <DashboardSelectField
                label="Customer *"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                options={customers}
              />
              <DashboardSelectField
                label="County *"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                options={LOCATION_FORM.counties}
              />
              <DashboardSelectField
                label="State *"
                value={state}
                onChange={(e) => setState(e.target.value)}
                options={LOCATION_FORM.states}
              />
              <DashboardField label="Coordinates *">
                <div className="relative">
                  <input
                    className={`${controlClass} pr-9`}
                    value={coordinates}
                    onChange={(e) => setCoordinates(e.target.value)}
                    placeholder="Lat, Long"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#959597]">
                    <MapPinIcon />
                  </span>
                </div>
              </DashboardField>
              <DashboardSelectField
                label="Site Type"
                value={siteType}
                onChange={(e) => setSiteType(e.target.value)}
                options={LOCATION_FORM.siteTypes}
              />
              <DashboardSelectField
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={LOCATION_FORM.statuses}
              />
              <DashboardTextField
                label="Access Notes"
                value={accessNotes}
                onChange={(e) => setAccessNotes(e.target.value)}
                placeholder="Access notes"
              />
              <DashboardTextField
                label="Site Contact"
                value={siteContact}
                onChange={(e) => setSiteContact(e.target.value)}
                placeholder="Site contact"
              />
              <DashboardTextField
                label="Geofence Radius"
                value={geofenceRadius}
                onChange={(e) => setGeofenceRadius(e.target.value)}
                placeholder="Geofence radius"
              />
              <DashboardToggle
                label="GPS Required?"
                checked={gpsRequired}
                onCheckedChange={setGpsRequired}
              />
              <DashboardTextField
                label="Nearest Hospital"
                value={nearestHospital}
                onChange={(e) => setNearestHospital(e.target.value)}
                placeholder="Hospital name"
              />
            </DashboardFormGrid>
          ),
        },
      ]}
    />
  );
}
