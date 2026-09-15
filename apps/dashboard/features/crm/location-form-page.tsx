"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  DashboardToolbarButton,
  cn,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { assetUrl } from "@/lib/api";
import { toApiStatus } from "@/lib/crm-ui";
import { toastApiError, toastSuccess, toastValidationError } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";
import { LocationGpsPanel } from "./location-gps-panel";
import { useCustomerOptions } from "./use-customer-options";

type FieldErrors = Record<string, string | undefined>;

type SitePhoto = {
  id: string;
  label: string;
  name?: string;
  url?: string;
  storagePath?: string;
  /** Local preview until upload finishes (or fallback). */
  preview?: string;
  uploading?: boolean;
};

const SUGGESTED_LABELS: string[] = [];

function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function geocodeQuery(
  query: string,
): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as { lat: string; lon: string }[];
  const row = rows[0];
  if (!row) return null;
  const lat = Number(row.lat);
  const lng = Number(row.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function estimateHospitalDriveTime(
  site: { lat: number; lng: number },
  hospitalQuery: string,
) {
  const hospital = await geocodeQuery(hospitalQuery);
  if (!hospital) return null;
  const miles = haversineMiles(site, hospital);
  // Rural West Texas average ~40 mph road speed
  const mins = Math.max(1, Math.round((miles / 40) * 60));
  const miLabel =
    miles >= 10 ? miles.toFixed(0) : miles.toFixed(1).replace(/\.0$/, "");
  return `${miLabel} MI · ${mins} MIN`;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

function parseSitePhotos(raw: unknown): SitePhoto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map((p, i) => {
      const url = typeof p.url === "string" ? p.url : undefined;
      const contentBase64 =
        typeof p.contentBase64 === "string" ? p.contentBase64 : undefined;
      return {
        id: String(p.id ?? p.kind ?? `photo-${i}`),
        label: String(p.label ?? "Landmark"),
        name: typeof p.name === "string" ? p.name : undefined,
        url,
        storagePath:
          typeof p.storagePath === "string" ? p.storagePath : undefined,
        preview: url ? assetUrl(url) : contentBase64,
      };
    })
    .filter((p) => p.url || p.preview);
}

function nextSuggestedLabel(_existing: SitePhoto[]) {
  return "";
}

/**
 * Shared Add / Edit Location screen — Figma layout + live API.
 */
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
  const { options: customerOptions, loading: customersLoading } =
    useCustomerOptions();

  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const [customerId, setCustomerId] = React.useState(
    searchParams.get("customerId") ?? "",
  );
  const [customerRadius, setCustomerRadius] = React.useState("");
  const [name, setName] = React.useState("");
  const [wellPadNumber, setWellPadNumber] = React.useState("");
  const [apiNumber, setApiNumber] = React.useState("");
  const [county, setCounty] = React.useState("");
  const [state, setState] = React.useState("");
  const [city, setCity] = React.useState("");
  const [latitude, setLatitude] = React.useState<number | null>(null);
  const [longitude, setLongitude] = React.useState<number | null>(null);
  const [siteType, setSiteType] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [accessNotes, setAccessNotes] = React.useState("");
  const [siteContact, setSiteContact] = React.useState("");
  const [geofenceRadius, setGeofenceRadius] = React.useState("");
  const [geofenceOverride, setGeofenceOverride] = React.useState(false);
  const [mapRadius, setMapRadius] = React.useState("");
  const [gpsRequired, setGpsRequired] = React.useState(false);
  const [nearestHospital, setNearestHospital] = React.useState("");
  const [hospitalPhone, setHospitalPhone] = React.useState("");
  const [hospitalAddress, setHospitalAddress] = React.useState("");
  const [hospitalDriveTime, setHospitalDriveTime] = React.useState("");
  const [fireEmergency, setFireEmergency] = React.useState("");
  const [fireNonEmergency, setFireNonEmergency] = React.useState("");
  const [policeEmergency, setPoliceEmergency] = React.useState("");
  const [policeNonEmergency, setPoliceNonEmergency] = React.useState("");
  const [ambulance, setAmbulance] = React.useState("");
  const [musterPoint, setMusterPoint] = React.useState("");
  const [sitePhotos, setSitePhotos] = React.useState<SitePhoto[]>([]);
  const [evacuationMapUrl, setEvacuationMapUrl] = React.useState<string | null>(
    null,
  );
  const [evacuationMeta, setEvacuationMeta] = React.useState<string | null>(
    null,
  );
  const [countyOptions, setCountyOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [stateOptions, setStateOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [siteTypeOptions, setSiteTypeOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [statusOptions, setStatusOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [contactOptions, setContactOptions] = React.useState<
    DashboardSelectOption[]
  >([]);

  const addPhotoRef = React.useRef<HTMLInputElement>(null);
  const evacuationRef = React.useRef<HTMLInputElement>(null);

  const customers = React.useMemo(() => {
    const opts = [...customerOptions];
    const qName = searchParams.get("customer");
    const qId = searchParams.get("customerId");
    if (qId && qName && !opts.some((o) => o.value === qId)) {
      opts.unshift({ value: qId, label: qName });
    }
    return opts;
  }, [customerOptions, searchParams]);

  function clearError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lookups = await crmApi.lookups();
        if (cancelled) return;
        const data = lookups.data;
        if (data.counties?.length) {
          setCountyOptions(
            data.counties.map((o) => ({
              value: o.value || o.label,
              label: o.label,
            })),
          );
        }
        if (data.states?.length) {
          setStateOptions(
            data.states.map((o) => ({ value: o.value, label: o.label })),
          );
        }
        if (data.siteTypes?.length) {
          setSiteTypeOptions(
            data.siteTypes.map((o) => ({
              value: o.value || o.label,
              label: o.label,
            })),
          );
        }
        if (data.locationStatuses?.length) {
          setStatusOptions(
            data.locationStatuses.map((o) => ({
              value: o.value,
              label: o.label,
            })),
          );
        }
      } catch {
        /* keep empty — selects still work */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!customerId) {
      setContactOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [contacts, customer] = await Promise.all([
          crmApi.listContacts({ customerId, pageSize: 100 }),
          crmApi.getCustomer(customerId).catch(() => null),
        ]);
        if (cancelled) return;
        setContactOptions(
          (contacts.data.items ?? []).map((c) => ({
            value: c.id,
            label: [c.fullName, c.roleTitle].filter(Boolean).join(" · "),
          })),
        );
        setSiteContact((prev) => {
          if (!prev) return prev;
          const opts = (contacts.data.items ?? []).map((c) => ({
            id: c.id,
            label: [c.fullName, c.roleTitle].filter(Boolean).join(" · "),
          }));
          if (opts.some((o) => o.id === prev)) return prev;
          const byLabel = opts.find(
            (o) => o.label.toLowerCase() === prev.toLowerCase(),
          );
          return byLabel?.id ?? prev;
        });
        const radius = customer?.data.clockInRadius?.trim();
        if (radius) setCustomerRadius(radius);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  React.useEffect(() => {
    if (geofenceOverride) return;
    if (customerRadius) setGeofenceRadius(customerRadius);
  }, [customerRadius, geofenceOverride]);

  React.useEffect(() => {
    if (latitude == null || longitude == null) return;
    const query = [hospitalAddress.trim(), nearestHospital.trim()]
      .filter(Boolean)
      .join(", ");
    if (query.length < 4) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const estimate = await estimateHospitalDriveTime(
            { lat: latitude, lng: longitude },
            query,
          );
          if (!cancelled && estimate) setHospitalDriveTime(estimate);
        } catch {
          /* keep manual value */
        }
      })();
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [latitude, longitude, hospitalAddress, nearestHospital]);

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
        setCity(l.city ?? "");
        setLatitude(l.latitude ?? null);
        setLongitude(l.longitude ?? null);
        setSiteType(l.siteType ?? "");
        setStatus((l.status ?? "ACTIVE").toUpperCase());
        setAccessNotes(l.accessNotes ?? "");
        setSiteContact(l.siteContactId || l.siteContact || "");
        setGeofenceRadius(l.geofenceRadius ?? "500 FT");
        setGeofenceOverride(Boolean(l.geofenceOverride));
        setGpsRequired(Boolean(l.gpsRequired));
        setNearestHospital(l.nearestHospital ?? "");
        setHospitalPhone(l.hospitalPhone ?? "");
        setHospitalAddress(l.hospitalAddress ?? "");
        setHospitalDriveTime(l.hospitalDriveTime ?? "");
        setFireEmergency(l.fireEmergency ?? "");
        setFireNonEmergency(l.fireNonEmergency ?? "");
        setPoliceEmergency(l.policeEmergency ?? "");
        setPoliceNonEmergency(l.policeNonEmergency ?? "");
        setAmbulance(l.ambulance ?? "");
        setMusterPoint(l.musterPoint ?? "");
        setSitePhotos(parseSitePhotos(l.sitePhotos));
        setEvacuationMapUrl(l.evacuationMapUrl ?? null);
        if (l.customer?.clockInRadius) {
          setCustomerRadius(l.customer.clockInRadius);
        }
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

  function validateClient(): FieldErrors {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Enter a location name.";
    if (!customerId) next.customerId = "Select a customer.";
    if (!county) next.county = "Select a county.";
    if (!state) next.state = "Select a state.";
    return next;
  }

  async function handleSave(addAnother = false) {
    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      toastValidationError();
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>("[aria-invalid='true']")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    setSubmitting(true);
    setSaveError(null);
    setErrors({});
    try {
      if (sitePhotos.some((p) => p.uploading)) {
        toastApiError(new Error("Wait for photo uploads to finish"));
        setSubmitting(false);
        return;
      }

      const photosPayload = sitePhotos
        .filter((p) => p.url || p.preview)
        .map((p) => ({
          id: p.id,
          label: p.label.trim() || "Landmark",
          name: p.name,
          url: p.url,
          storagePath: p.storagePath,
          // Fallback: API will persist base64 if URL missing
          ...(p.url
            ? {}
            : p.preview?.startsWith("data:")
              ? { contentBase64: p.preview }
              : {}),
        }));

      const body = {
        customerId,
        name: name.trim(),
        wellPadNumber: wellPadNumber.trim() || undefined,
        apiNumber: apiNumber.trim() || undefined,
        county: county || undefined,
        state: state || undefined,
        city: city.trim() || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        siteType: siteType || undefined,
        status: toApiStatus(status),
        accessNotes: accessNotes.trim() || undefined,
        siteContactId: siteContact.trim() || undefined,
        siteContact:
          contactOptions.find((o) => o.value === siteContact)?.label.split(" · ")[0] ||
          undefined,
        geofenceRadius: geofenceRadius.trim() || undefined,
        geofenceOverride,
        gpsRequired,
        nearestHospital: nearestHospital.trim() || undefined,
        hospitalPhone: hospitalPhone.trim() || undefined,
        hospitalAddress: hospitalAddress.trim() || undefined,
        hospitalDriveTime: hospitalDriveTime.trim() || undefined,
        fireEmergency: fireEmergency.trim() || undefined,
        fireNonEmergency: fireNonEmergency.trim() || undefined,
        policeEmergency: policeEmergency.trim() || undefined,
        policeNonEmergency: policeNonEmergency.trim() || undefined,
        ambulance: ambulance.trim() || undefined,
        musterPoint: musterPoint.trim() || undefined,
        sitePhotos: photosPayload.length ? photosPayload : [],
        evacuationMapUrl: evacuationMapUrl || undefined,
      };

      if (isEdit && locationId) {
        await crmApi.updateLocation(locationId, body);
        toastSuccess("Location updated");
        router.push(`/crm/locations/${locationId}`);
      } else {
        const created = await crmApi.createLocation(body);
        toastSuccess("Location created");
        if (addAnother) {
          setName("");
          setWellPadNumber("");
          setApiNumber("");
          setAccessNotes("");
          setSiteContact("");
          setNearestHospital("");
          setHospitalPhone("");
          setHospitalAddress("");
          setHospitalDriveTime("");
          setFireEmergency("");
          setFireNonEmergency("");
          setPoliceEmergency("");
          setPoliceNonEmergency("");
          setAmbulance("");
          setMusterPoint("");
          setSitePhotos([]);
          setEvacuationMapUrl(null);
          setErrors({});
        } else {
          router.push(`/crm/locations/${created.data.id}`);
        }
      }
    } catch (err) {
      toastApiError(err);
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function addSitePhoto(file: File) {
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/i)) {
      toastApiError(new Error("PNG or JPG only"));
      return;
    }
    const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const preview = await fileToDataUrl(file);
    setSitePhotos((prev) => [
      ...prev,
      {
        id,
        label: nextSuggestedLabel(prev),
        name: file.name,
        preview,
        uploading: true,
      },
    ]);
    try {
      const folder = locationId
        ? `locations/${locationId}/photos`
        : "locations/draft";
      const saved = await crmApi.uploadFile({
        folder,
        fileName: file.name,
        mimeType: file.type,
        contentBase64: preview,
      });
      setSitePhotos((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                url: saved.data.url,
                storagePath: saved.data.storagePath,
                preview: assetUrl(saved.data.url),
                uploading: false,
              }
            : p,
        ),
      );
    } catch (err) {
      toastApiError(err);
      setSitePhotos((prev) => prev.filter((p) => p.id !== id));
    }
  }

  async function uploadEvacuationMap(file: File) {
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/i)) {
      toastApiError(new Error("PNG or JPG only"));
      return;
    }
    const contentBase64 = await fileToDataUrl(file);
    setEvacuationMapUrl(contentBase64);
    setEvacuationMeta(`${file.name} · uploading…`);
    try {
      const folder = locationId
        ? `locations/${locationId}`
        : "locations/draft";
      const saved = await crmApi.uploadFile({
        folder,
        fileName: file.name || "evacuation-map.jpg",
        mimeType: file.type,
        contentBase64,
      });
      setEvacuationMapUrl(saved.data.url);
      setEvacuationMeta(
        `${file.name} · ${formatBytes(saved.data.sizeBytes)}`,
      );
    } catch (err) {
      toastApiError(err);
      setEvacuationMapUrl(null);
      setEvacuationMeta(null);
    }
  }

  if (!ready) {
    return (
      <div className="bg-shell p-6 font-sans text-sm text-[#959597]">
        Loading…
      </div>
    );
  }

  const inheritHint = `Inherits ${customerRadius} from ${
    customers.find((c) => c.value === customerId)?.label ?? "customer"
  } unless overridden here.`;

  return (
    <CrmFormPageShell
      cancelHref={
        isEdit && locationId ? `/crm/locations/${locationId}` : "/crm/locations"
      }
      submitLabel="Save"
      submitting={submitting}
      saveError={saveError}
      showTopCancel={false}
      onDiscardSave={() => setSaveError(null)}
      onRetrySave={() => void handleSave(false)}
      onSave={() => void handleSave(false)}
      onSaveAndAddAnother={isEdit ? undefined : () => void handleSave(true)}
      sections={[
        {
          title: "Site Photos",
          content: (
            <div className="space-y-4">
              <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                Photos of the gate, access road, or other landmarks help a
                technician find the site after dark.
              </p>
              <div className="flex flex-wrap gap-3">
                {sitePhotos.map((photo) => (
                  <div key={photo.id} className="w-[140px] space-y-2 sm:w-[156px]">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-[#2D2D30] bg-[#1A2740]">
                      {photo.preview || photo.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo.preview || assetUrl(photo.url)}
                          alt={photo.label}
                          className={cn(
                            "h-full w-full object-cover",
                            photo.uploading && "opacity-50",
                          )}
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3B82F6]/40 bg-[#1E3A5F]">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#60A5FA] border-t-transparent" />
                          </span>
                        </span>
                      )}
                      {photo.uploading ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-[#1A2740]/50">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3B82F6]/40 bg-[#1E3A5F]">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#60A5FA] border-t-transparent" />
                          </span>
                        </span>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Remove ${photo.label}`}
                        onClick={() =>
                          setSitePhotos((prev) =>
                            prev.filter((p) => p.id !== photo.id),
                          )
                        }
                        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 font-sans text-[14px] leading-none text-[#FDFDFF] hover:bg-black"
                      >
                        ×
                      </button>
                    </div>
                    <input
                      type="text"
                      value={photo.label}
                      onChange={(e) =>
                        setSitePhotos((prev) =>
                          prev.map((p) =>
                            p.id === photo.id
                              ? { ...p, label: e.target.value }
                              : p,
                          ),
                        )
                      }
                      aria-label="Photo name"
                      placeholder="Photo name"
                      className="w-full rounded-md border border-[#2D2D30] bg-[#1A1A1A] px-2 py-1.5 text-center font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none focus:border-[#5A5A5A]"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addPhotoRef.current?.click()}
                  className="flex aspect-[4/3] w-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#3E3E3E] text-[#959597] hover:border-[#5A5A5A] hover:text-[#FDFDFF] sm:w-[156px]"
                >
                  <span className="text-lg leading-none">+</span>
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em]">
                    Add Photo
                  </span>
                </button>
                <input
                  ref={addPhotoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    void addSitePhoto(file);
                  }}
                />
              </div>
              <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                PNG or JPG. Add as many as are useful — gate, access road, tank
                battery, landmarks.
              </p>
            </div>
          ),
        },
        {
          title: "Location Details",
          content: (
            <div className="space-y-5">
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardTextField
                  label="Location Name *"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearError("name");
                  }}
                  error={errors.name}
                  placeholder="Wolfcamp 12-4H"
                />
                <DashboardTextField
                  label="Well / Pad Number"
                  value={wellPadNumber}
                  onChange={(e) => setWellPadNumber(e.target.value)}
                  placeholder="WPC-1204"
                />
                <DashboardTextField
                  label="API Number"
                  value={apiNumber}
                  onChange={(e) => setApiNumber(e.target.value)}
                  placeholder="42-329-35421"
                />
                <DashboardSelectField
                  label="Customer *"
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    clearError("customerId");
                  }}
                  options={customers}
                  loading={customersLoading}
                  placeholder="Select customer"
                  error={errors.customerId}
                />
                <DashboardSelectField
                  label="County *"
                  value={county}
                  onChange={(e) => {
                    setCounty(e.target.value);
                    clearError("county");
                  }}
                  options={countyOptions}
                  placeholder="Select county"
                  error={errors.county}
                />
                <DashboardSelectField
                  label="State *"
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    clearError("state");
                  }}
                  options={stateOptions}
                  placeholder="Select state"
                  error={errors.state}
                />
                <DashboardSelectField
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={statusOptions}
                />
                <DashboardTextField
                  label="Access Notes"
                  value={accessNotes}
                  onChange={(e) => setAccessNotes(e.target.value)}
                  placeholder="Gate code: 4521. Use south entrance."
                />
                <DashboardSelectField
                  label="Site Contact"
                  value={siteContact}
                  onChange={(e) => setSiteContact(e.target.value)}
                  options={contactOptions}
                  placeholder={
                    customerId ? "Select contact" : "Select customer first"
                  }
                  emptyMessage="No contacts for this customer"
                  containerClassName="md:col-span-2"
                />
                <div className="space-y-1.5 md:col-span-2">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    Geofence Radius
                  </span>
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3">
                    <input
                      value={geofenceRadius}
                      onChange={(e) => {
                        setGeofenceRadius(e.target.value);
                        setGeofenceOverride(true);
                      }}
                      disabled={!geofenceOverride}
                      className="min-w-0 flex-1 bg-transparent font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none disabled:opacity-60 md:text-[13px]"
                    />
                    <button
                      type="button"
                      onClick={() => setGeofenceOverride(true)}
                      className="shrink-0 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#60A5FA] hover:text-[#93C5FD]"
                    >
                      Site Override
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGeofenceRadius(customerRadius);
                        setGeofenceOverride(false);
                      }}
                      className="shrink-0 rounded-md border border-[#3E3E3E] px-2 py-1 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
                    >
                      Reset
                    </button>
                  </div>
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    {inheritHint}
                  </p>
                </div>
                <div className="flex items-center gap-3 py-1 md:col-span-2">
                  <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                    GPS Required?
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={gpsRequired}
                    onClick={() => setGpsRequired(!gpsRequired)}
                    className={cn(
                      "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                      gpsRequired ? "bg-[#22C55E]" : "bg-[#3E3E3E]",
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
                <DashboardSelectField
                  label="Site Type"
                  value={siteType}
                  onChange={(e) => setSiteType(e.target.value)}
                  options={siteTypeOptions}
                  placeholder="Select site type"
                  containerClassName="md:col-span-2"
                />
              </DashboardFormGrid>

              <div className="border-t border-[#2D2D30] pt-5">
                <LocationGpsPanel
                  latitude={latitude}
                  longitude={longitude}
                  radiusRaw={mapRadius}
                  county={county}
                  state={state}
                  onCoordsChange={(c) => {
                    setLatitude(c.lat);
                    setLongitude(c.lng);
                  }}
                  onRadiusChange={(_miles, label) => {
                    setMapRadius(label);
                  }}
                  onPlaceChange={(place) => {
                    if (place.county) setCounty(place.county);
                    if (place.state) setState(place.state);
                    if (place.city) setCity(place.city);
                    clearError("county");
                    clearError("state");
                  }}
                />
              </div>
            </div>
          ),
        },
        {
          title: "Emergency Information",
          content: (
            <div className="space-y-5">
              <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                Required for every site. Distance/drive time is calculated from
                the coordinates above.
              </p>
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardTextField
                  label="Nearest Hospital"
                  value={nearestHospital}
                  onChange={(e) => setNearestHospital(e.target.value)}
                  placeholder="Midland Memorial Hospital"
                />
                <DashboardTextField
                  label="Hospital Phone"
                  value={hospitalPhone}
                  onChange={(e) => setHospitalPhone(e.target.value)}
                  placeholder="(432) 221-1000"
                />
                <DashboardTextField
                  label="Hospital Address"
                  value={hospitalAddress}
                  onChange={(e) => setHospitalAddress(e.target.value)}
                  placeholder="400 Rosalind Redfern Grover Pkwy, Midland, TX 79701"
                  containerClassName="md:col-span-2"
                />
                <div className="space-y-1.5 md:col-span-2">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    Distance / Drive Time
                  </span>
                  <div className="relative flex h-10 items-center rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 pr-14">
                    <input
                      value={hospitalDriveTime}
                      onChange={(e) => setHospitalDriveTime(e.target.value)}
                      placeholder="e.g. 8.2 MI · 14 MIN"
                      className="min-w-0 flex-1 bg-transparent font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none md:text-[13px]"
                    />
                    {hospitalDriveTime ? (
                      <span className="absolute top-1/2 right-2 -translate-y-1/2 rounded bg-[#166534] px-1.5 py-0.5 font-sans text-[9px] uppercase text-[#86EFAC]">
                        Auto
                      </span>
                    ) : null}
                  </div>
                </div>
                <DashboardTextField
                  label="Fire — Emergency"
                  value={fireEmergency}
                  onChange={(e) => setFireEmergency(e.target.value)}
                  placeholder="911"
                />
                <DashboardTextField
                  label="Fire — Non-Emergency"
                  value={fireNonEmergency}
                  onChange={(e) => setFireNonEmergency(e.target.value)}
                  placeholder="(432) 685-7530"
                />
                <DashboardTextField
                  label="Police — Emergency"
                  value={policeEmergency}
                  onChange={(e) => setPoliceEmergency(e.target.value)}
                  placeholder="911"
                />
                <DashboardTextField
                  label="Police — Non-Emergency"
                  value={policeNonEmergency}
                  onChange={(e) => setPoliceNonEmergency(e.target.value)}
                  placeholder="(432) 685-7108"
                />
                <DashboardTextField
                  label="Ambulance"
                  value={ambulance}
                  onChange={(e) => setAmbulance(e.target.value)}
                  placeholder="911"
                />
                <div className="space-y-1.5">
                  <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                    Muster Point
                  </span>
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3">
                    <input
                      value={musterPoint}
                      onChange={(e) => setMusterPoint(e.target.value)}
                      placeholder="North parking lot, by the flagpole"
                      className="min-w-0 flex-1 bg-transparent font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none md:text-[13px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (latitude != null && longitude != null) {
                          setMusterPoint(
                            `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                          );
                        } else {
                          toastApiError(
                            new Error("Set GPS coordinates first"),
                          );
                        }
                      }}
                      className="shrink-0 rounded-md border border-[#3E3E3E] bg-[#1A1A1A] px-2.5 py-1 font-sans text-[10px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-white/5"
                    >
                      Set Pin
                    </button>
                  </div>
                  <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                    Optional — pin it on the map above for a precise spot.
                  </p>
                </div>
              </DashboardFormGrid>

              <div className="space-y-2">
                <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597] md:text-[12px]">
                  Evacuation Route Map
                </span>
                <button
                  type="button"
                  onClick={() => evacuationRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("border-[#5A5A5A]");
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove("border-[#5A5A5A]");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-[#5A5A5A]");
                    const file = e.dataTransfer.files?.[0];
                    if (file) void uploadEvacuationMap(file);
                  }}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#3E3E3E] px-4 py-10 text-center transition-colors hover:border-[#5A5A5A]"
                >
                  {evacuationMapUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        evacuationMapUrl.startsWith("data:")
                          ? evacuationMapUrl
                          : assetUrl(evacuationMapUrl)
                      }
                      alt=""
                      className="max-h-40 rounded object-contain"
                    />
                  ) : (
                    <>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3E3E3E] text-[#959597]">
                        ↑
                      </span>
                      <span className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                        Click or drag to upload evacuation map
                      </span>
                      <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
                        PNG or JPG — a marked-up satellite screenshot works for
                        now.
                      </span>
                      <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#60A5FA]">
                        Phase 2: generated automatically from the site
                        coordinates.
                      </span>
                    </>
                  )}
                  {evacuationMeta ? (
                    <span className="font-sans text-[10px] uppercase text-[#959597]">
                      {evacuationMeta}
                    </span>
                  ) : null}
                </button>
                <input
                  ref={evacuationRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    void uploadEvacuationMap(file);
                  }}
                />
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
