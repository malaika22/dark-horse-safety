"use client";

import * as React from "react";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { useCrmLookups, lookupOptions } from "@/lib/use-crm-lookups";

export type SiteCoords = { lat: number; lng: number };

type PlaceInfo = {
  county?: string | null;
  state?: string | null;
  displayName?: string | null;
};

function parseRadiusMiles(raw?: string | null): number {
  if (!raw) return 5;
  const n = Number.parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export function formatRadiusLabel(miles: number): string {
  const rounded = Math.round(miles * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} MI`;
}

/** Accept decimal degrees or simple DMS like `31°53'50.3"N 102°04'40.4"W`. */
export function parseLatLng(input: string): SiteCoords | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const dd = trimmed.match(
    /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/,
  );
  if (dd) {
    const lat = Number(dd[1]);
    const lng = Number(dd[2]);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180
    ) {
      return { lat, lng };
    }
  }

  const dmsParts = [
    ...trimmed.matchAll(
      /(\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)["\s]*([NSEW])/gi,
    ),
  ];
  if (dmsParts.length >= 2) {
    const toDec = (m: RegExpMatchArray) => {
      const deg = Number(m[1]);
      const min = Number(m[2]);
      const sec = Number(m[3]);
      const hemi = m[4].toUpperCase();
      let v = deg + min / 60 + sec / 3600;
      if (hemi === "S" || hemi === "W") v *= -1;
      return v;
    };
    const a = toDec(dmsParts[0]);
    const b = toDec(dmsParts[1]);
    const firstHemi = dmsParts[0][4].toUpperCase();
    if (firstHemi === "E" || firstHemi === "W") return { lat: b, lng: a };
    return { lat: a, lng: b };
  }

  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<PlaceInfo> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Reverse geocode failed");
  const data = (await res.json()) as {
    display_name?: string;
    address?: {
      county?: string;
      state?: string;
      city?: string;
      town?: string;
      "ISO3166-2-lvl4"?: string;
    };
  };
  const county =
    data.address?.county?.replace(/\s+County$/i, "") ??
    data.address?.city ??
    data.address?.town ??
    null;
  let state = data.address?.state ?? null;
  const iso = data.address?.["ISO3166-2-lvl4"];
  if (iso?.includes("-")) state = iso.split("-")[1] ?? state;
  if (state && state.length > 2) {
    const map: Record<string, string> = {
      Texas: "TX",
      "New Mexico": "NM",
      Oklahoma: "OK",
      Louisiana: "LA",
    };
    state = map[state] ?? state;
  }
  return { county, state, displayName: data.display_name ?? null };
}

async function searchPlace(query: string): Promise<(SiteCoords & PlaceInfo) | null> {
  const coords = parseLatLng(query);
  if (coords) {
    const place = await reverseGeocode(coords.lat, coords.lng);
    return { ...coords, ...place };
  }
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Search failed");
  const rows = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name?: string;
    address?: {
      county?: string;
      state?: string;
      city?: string;
      "ISO3166-2-lvl4"?: string;
    };
  }>;
  const hit = rows[0];
  if (!hit) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const county =
    hit.address?.county?.replace(/\s+County$/i, "") ?? hit.address?.city ?? null;
  let state = hit.address?.state ?? null;
  const iso = hit.address?.["ISO3166-2-lvl4"];
  if (iso?.includes("-")) state = iso.split("-")[1] ?? state;
  if (state && state.length > 2) {
    const map: Record<string, string> = {
      Texas: "TX",
      "New Mexico": "NM",
      Oklahoma: "OK",
      Louisiana: "LA",
    };
    state = map[state] ?? state;
  }
  return {
    lat,
    lng,
    county,
    state,
    displayName: hit.display_name ?? null,
  };
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function LocationDotIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.5" fill="#3B82F6" />
      <circle cx="12" cy="12" r="8.5" stroke="#3B82F6" strokeWidth="2" opacity="0.35" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#959597]">
      {children}
    </p>
  );
}

const AUTO_FLAG_OPTIONS = [
  { value: "AFTER 15MINS", label: "After 15 mins" },
  { value: "AFTER 30MINS", label: "After 30 mins" },
  { value: "AFTER 60MINS", label: "After 60 mins" },
];

export function CustomerSiteLocationPanel({
  latitude,
  longitude,
  radiusRaw,
  county: countyProp,
  state: stateProp,
  minBillableBlock: minBillableProp,
  autoFlagNoShow: autoFlagProp,
  onCoordsChange,
  onRadiusChange,
  onPlaceChange,
  onMetricsChange,
}: {
  latitude?: number | null;
  longitude?: number | null;
  radiusRaw?: string | null;
  county?: string | null;
  state?: string | null;
  minBillableBlock?: string | null;
  autoFlagNoShow?: string | null;
  onCoordsChange?: (coords: SiteCoords) => void | Promise<void>;
  onRadiusChange?: (miles: number, label: string) => void | Promise<void>;
  onPlaceChange?: (place: PlaceInfo) => void | Promise<void>;
  onMetricsChange?: (patch: {
    clockInRadius?: string;
    minBillableBlock?: string;
    autoFlagNoShow?: string;
  }) => void | Promise<void>;
}) {
  const [coords, setCoords] = React.useState<SiteCoords>({
    lat: latitude ?? 31.8973,
    lng: longitude ?? -102.0779,
  });
  const [radiusMiles, setRadiusMiles] = React.useState(parseRadiusMiles(radiusRaw));
  const [radiusInput, setRadiusInput] = React.useState(
    radiusRaw?.trim() || formatRadiusLabel(parseRadiusMiles(radiusRaw)),
  );
  const [minBillable, setMinBillable] = React.useState(minBillableProp ?? "15 MIN");
  const [autoFlag, setAutoFlag] = React.useState(autoFlagProp ?? "AFTER 30MINS");
  const { lookups } = useCrmLookups({ includeLocations: false });
  const autoFlagOptions =
    lookupOptions(lookups, "autoFlagNoShow").length > 0
      ? lookupOptions(lookups, "autoFlagNoShow")
      : AUTO_FLAG_OPTIONS;
  const [county, setCounty] = React.useState(countyProp ?? "");
  const [state, setState] = React.useState(stateProp ?? "");
  const [search, setSearch] = React.useState("");
  const [zoom, setZoom] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  const [geoBusy, setGeoBusy] = React.useState(false);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const dragMode = React.useRef<"pin" | "radius" | null>(null);
  const dragOrigin = React.useRef<{ x: number; y: number; lat: number; lng: number } | null>(
    null,
  );
  const liveCoords = React.useRef(coords);
  const liveRadius = React.useRef(radiusMiles);
  liveCoords.current = coords;
  liveRadius.current = radiusMiles;

  React.useEffect(() => {
    setCoords({
      lat: latitude ?? 31.8973,
      lng: longitude ?? -102.0779,
    });
  }, [latitude, longitude]);

  React.useEffect(() => {
    const miles = parseRadiusMiles(radiusRaw);
    setRadiusMiles(miles);
    setRadiusInput(radiusRaw?.trim() || formatRadiusLabel(miles));
  }, [radiusRaw]);

  React.useEffect(() => {
    setMinBillable(minBillableProp ?? "15 MIN");
  }, [minBillableProp]);

  React.useEffect(() => {
    setAutoFlag(autoFlagProp ?? "AFTER 30MINS");
  }, [autoFlagProp]);

  React.useEffect(() => {
    setCounty(countyProp ?? "");
    setState(stateProp ?? "");
  }, [countyProp, stateProp]);

  const radiusPx = Math.min(170, Math.max(52, 30 + radiusMiles * 16)) * zoom;
  const coordLabel = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  const radiusLabel = formatRadiusLabel(radiusMiles);

  async function applyPlace(next: SiteCoords, place?: PlaceInfo | null) {
    setCoords(next);
    await onCoordsChange?.(next);
    if (place?.county || place?.state) {
      if (place.county) setCounty(place.county);
      if (place.state) setState(place.state);
      await onPlaceChange?.(place);
      return;
    }
    try {
      setGeoBusy(true);
      const resolved = await reverseGeocode(next.lat, next.lng);
      if (resolved.county) setCounty(resolved.county);
      if (resolved.state) setState(resolved.state);
      await onPlaceChange?.(resolved);
    } catch {
      /* offline / rate limit — keep previous county/state */
    } finally {
      setGeoBusy(false);
    }
  }

  async function commitRadius(miles: number) {
    const clamped = Math.max(0.5, Math.min(50, miles));
    const label = formatRadiusLabel(clamped);
    setRadiusMiles(clamped);
    setRadiusInput(label);
    await onRadiusChange?.(clamped, label);
    await onMetricsChange?.({ clockInRadius: label });
  }

  async function applySearch() {
    const q = search.trim();
    if (!q) return;
    setBusy(true);
    try {
      const hit = await searchPlace(q);
      if (!hit) {
        toastApiError(new Error("No location found for that search"));
        return;
      }
      await applyPlace(
        { lat: Number(hit.lat.toFixed(4)), lng: Number(hit.lng.toFixed(4)) },
        hit,
      );
      toastSuccess("Location updated");
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toastApiError(new Error("Geolocation is not supported in this browser"));
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void (async () => {
          try {
            await applyPlace({
              lat: Number(pos.coords.latitude.toFixed(4)),
              lng: Number(pos.coords.longitude.toFixed(4)),
            });
            toastSuccess("Using your current location");
          } finally {
            setBusy(false);
          }
        })();
      },
      () => {
        setBusy(false);
        toastApiError(new Error("Couldn't access your location"));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function onMapPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = mapRef.current;
    if (!el) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-map-ui]")) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dist = Math.hypot(x - cx, y - cy);
    if (Math.abs(dist - radiusPx) < 18) {
      dragMode.current = "radius";
    } else {
      dragMode.current = "pin";
      dragOrigin.current = {
        x,
        y,
        lat: liveCoords.current.lat,
        lng: liveCoords.current.lng,
      };
    }
    el.setPointerCapture(e.pointerId);
  }

  function onMapPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragMode.current || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    if (dragMode.current === "radius") {
      const dist = Math.hypot(x - cx, y - cy);
      const nextMiles = Math.max(0.5, Math.min(50, (dist / zoom - 30) / 16));
      setRadiusMiles(nextMiles);
      setRadiusInput(formatRadiusLabel(nextMiles));
    } else if (dragOrigin.current) {
      const degPerPx = 0.0035 / zoom;
      setCoords({
        lat: Number(
          (dragOrigin.current.lat - (y - dragOrigin.current.y) * degPerPx).toFixed(4),
        ),
        lng: Number(
          (dragOrigin.current.lng + (x - dragOrigin.current.x) * degPerPx).toFixed(4),
        ),
      });
    }
  }

  function onMapPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const mode = dragMode.current;
    dragMode.current = null;
    dragOrigin.current = null;
    mapRef.current?.releasePointerCapture(e.pointerId);
    if (mode === "pin") void applyPlace(liveCoords.current);
    if (mode === "radius") void commitRadius(liveRadius.current);
  }

  return (
    <div className="space-y-5">
      {/* Metrics */}
      <div>
        <FieldLabel>Metrics</FieldLabel>
        <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <FieldLabel>Max Clock-In Radius</FieldLabel>
            <input
              value={radiusInput}
              onChange={(e) => setRadiusInput(e.target.value)}
              onBlur={() => {
                const miles = parseRadiusMiles(radiusInput);
                void commitRadius(miles);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none focus:border-[#3E3E3E]"
              placeholder="5 MI"
            />
          </div>
          <div>
            <FieldLabel>Min Billable Block</FieldLabel>
            <input
              value={minBillable}
              onChange={(e) => setMinBillable(e.target.value)}
              onBlur={() => {
                void onMetricsChange?.({
                  minBillableBlock: minBillable.trim() || undefined,
                });
              }}
              className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none focus:border-[#3E3E3E]"
              placeholder="15 MIN"
            />
          </div>
          <div>
            <FieldLabel>Auto-Flag No-Show</FieldLabel>
            <div className="relative">
              <select
                value={autoFlag}
                onChange={(e) => {
                  const next = e.target.value;
                  setAutoFlag(next);
                  void onMetricsChange?.({ autoFlagNoShow: next });
                }}
                className="h-10 w-full appearance-none rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 pr-8 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none focus:border-[#3E3E3E]"
              >
                {autoFlagOptions.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#1A1A1A]">
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#959597]">
                <ChevronDownIcon />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Site location */}
      <div>
        <FieldLabel>Site Location</FieldLabel>
        <p className="mt-0.5 font-sans text-[10px] uppercase tracking-[-0.01em] text-[#6F6F72]">
          Coordinate Format: Decimal Degrees (DD) · Pasted DMS Accepted
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#959597]">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={search}
              disabled={busy}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void applySearch();
                }
              }}
              placeholder="Search Address Or Paste Coordinates (DD Or DMS)"
              className="h-10 w-full rounded-lg border border-[#2D2D30] bg-[#1A1A1A] pl-9 pr-3 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A] focus:border-[#3E3E3E] disabled:opacity-60"
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={useCurrentLocation}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-white/5 disabled:opacity-60"
          >
            <LocationDotIcon />
            Use My Current Location
          </button>
        </div>

        <div
          ref={mapRef}
          className="relative mt-3 h-[300px] touch-none overflow-hidden rounded-xl border border-[#2D2D30] bg-[#0B1220] sm:h-[360px]"
          onPointerDown={onMapPointerDown}
          onPointerMove={onMapPointerMove}
          onPointerUp={onMapPointerUp}
          onPointerCancel={onMapPointerUp}
        >
          {/* Map atmosphere */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 30% 40%, #1a2740 0%, #0b1220 55%, #070b14 100%)",
            }}
            aria-hidden
          />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(#2a3a55 1px, transparent 1px), linear-gradient(90deg, #2a3a55 1px, transparent 1px)",
              backgroundSize: `${56 * zoom}px ${56 * zoom}px`,
              backgroundPosition: "center",
            }}
            aria-hidden
          />
          {/* Soft zone shapes */}
          <div
            className="pointer-events-none absolute left-[12%] top-[18%] h-[42%] w-[28%] rounded-[40%] bg-[#152238]/70"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-[14%] right-[10%] h-[36%] w-[34%] rounded-[36%] bg-[#121c30]/80"
            aria-hidden
          />

          {/* Radius ring + handle */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#60A5FA]"
            style={{ width: radiusPx * 2, height: radiusPx * 2 }}
          >
            <span
              className="absolute right-0 top-1/2 h-px w-[calc(50%)] origin-left bg-[#60A5FA]/70"
              style={{ transform: "translateY(-50%)" }}
            />
            <span className="absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-[#93C5FD] bg-[#FDFDFF] shadow" />
            <span className="absolute -right-2 top-1/2 translate-x-full -translate-y-1/2 whitespace-nowrap rounded-md bg-[#0D0D0D]/90 px-2 py-1 font-sans text-[9px] uppercase tracking-[-0.02em] text-[#E5E7EB]">
              Radius {radiusLabel}
            </span>
          </div>

          {/* Pin */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex flex-col items-center">
              <span className="absolute -top-8 rounded-md bg-[#0D0D0D]/95 px-2 py-1 font-sans text-[9px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {coordLabel}
              </span>
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className="absolute h-4 w-4 rounded-full bg-[#EF4444]/35" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-[#EF4444] ring-2 ring-white" />
              </span>
            </div>
          </div>

          <div
            data-map-ui
            className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-[#0D0D0D]/85 px-2.5 py-1.5 font-sans text-[9px] uppercase tracking-[-0.02em] text-[#C8C8C8]"
          >
            Drag Pin To Move · Drag Edge To Resize Radius
          </div>

          <div
            data-map-ui
            className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-md border border-[#2D2D30] bg-[#1A1A1A]"
          >
            <button
              type="button"
              aria-label="Zoom in"
              className="flex h-8 w-8 items-center justify-center text-[#FDFDFF] hover:bg-white/5"
              onClick={(e) => {
                e.stopPropagation();
                setZoom((z) => Math.min(2.4, +(z + 0.2).toFixed(1)));
              }}
            >
              +
            </button>
            <div className="h-px bg-[#2D2D30]" />
            <button
              type="button"
              aria-label="Zoom out"
              className="flex h-8 w-8 items-center justify-center text-[#FDFDFF] hover:bg-white/5"
              onClick={(e) => {
                e.stopPropagation();
                setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)));
              }}
            >
              −
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <FieldLabel>Location &amp; Radius</FieldLabel>
            <div className="flex h-10 items-center gap-2 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#EF4444]" />
              <span className="truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {coordLabel} · {radiusLabel}
              </span>
            </div>
          </div>
          <div>
            <FieldLabel>County</FieldLabel>
            <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3">
              <span className="truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {geoBusy ? "…" : county.trim() || "—"}
              </span>
              <span className="shrink-0 rounded bg-[#166534]/35 px-1.5 py-0.5 font-sans text-[9px] font-[510] uppercase tracking-[-0.02em] text-[#4ADE80]">
                Auto
              </span>
            </div>
          </div>
          <div>
            <FieldLabel>State</FieldLabel>
            <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3">
              <span className="truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {geoBusy ? "…" : state.trim() || "—"}
              </span>
              <span className="shrink-0 rounded bg-[#166534]/35 px-1.5 py-0.5 font-sans text-[9px] font-[510] uppercase tracking-[-0.02em] text-[#4ADE80]">
                Auto
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
