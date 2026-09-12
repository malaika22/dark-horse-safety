"use client";

import * as React from "react";
import { cn } from "@dark-horse-safety/ui";
import { toastApiError } from "@/lib/toast";
import {
  formatRadiusLabel,
  parseLatLng,
  type SiteCoords,
} from "./customer-site-location";

type PlaceInfo = {
  county?: string | null;
  state?: string | null;
  city?: string | null;
};

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
    address?: {
      county?: string;
      state?: string;
      city?: string;
      town?: string;
      village?: string;
      "ISO3166-2-lvl4"?: string;
    };
  };
  const county =
    data.address?.county?.replace(/\s+County$/i, "") ?? null;
  const city =
    data.address?.city ??
    data.address?.town ??
    data.address?.village ??
    null;
  let state = data.address?.state ?? null;
  const iso = data.address?.["ISO3166-2-lvl4"];
  if (iso?.includes("-")) state = iso.split("-")[1] ?? state;
  if (state && state.length > 2) {
    const map: Record<string, string> = {
      Texas: "TX",
      "New Mexico": "NM",
      Oklahoma: "OK",
    };
    state = map[state] ?? state;
  }
  return { county, state, city };
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
  if (!res.ok) return null;
  const rows = (await res.json()) as {
    lat: string;
    lon: string;
    address?: { county?: string; state?: string; "ISO3166-2-lvl4"?: string };
  }[];
  const row = rows[0];
  if (!row) return null;
  const lat = Number(row.lat);
  const lng = Number(row.lon);
  const place = await reverseGeocode(lat, lng);
  return { lat, lng, ...place };
}

function parseRadiusMiles(raw?: string | null): number {
  if (!raw) return 5;
  const n = Number.parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  const miles = /ft/i.test(String(raw)) ? n / 5280 : n;
  return Number.isFinite(miles) && miles > 0 ? miles : 5;
}

/** GPS search + map + auto county/state — Figma Add Location. */
export function LocationGpsPanel({
  latitude,
  longitude,
  radiusRaw,
  county,
  state,
  onCoordsChange,
  onRadiusChange,
  onPlaceChange,
}: {
  latitude?: number | null;
  longitude?: number | null;
  radiusRaw?: string | null;
  county?: string | null;
  state?: string | null;
  onCoordsChange?: (coords: SiteCoords) => void;
  onRadiusChange?: (miles: number, label: string) => void;
  onPlaceChange?: (place: PlaceInfo) => void;
}) {
  const [coords, setCoords] = React.useState<SiteCoords>({
    lat: latitude ?? 31.8973,
    lng: longitude ?? -102.0779,
  });
  const [radiusMiles, setRadiusMiles] = React.useState(
    parseRadiusMiles(radiusRaw),
  );
  const [search, setSearch] = React.useState("");
  const [zoom, setZoom] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  const [autoCounty, setAutoCounty] = React.useState(false);
  const [autoState, setAutoState] = React.useState(false);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const dragMode = React.useRef<"pin" | "radius" | null>(null);
  const dragOrigin = React.useRef<{
    x: number;
    y: number;
    lat: number;
    lng: number;
  } | null>(null);
  const liveCoords = React.useRef(coords);
  const liveRadius = React.useRef(radiusMiles);
  liveCoords.current = coords;
  liveRadius.current = radiusMiles;

  React.useEffect(() => {
    if (latitude != null && longitude != null) {
      setCoords({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  React.useEffect(() => {
    setRadiusMiles(parseRadiusMiles(radiusRaw));
  }, [radiusRaw]);

  const radiusPx = Math.min(170, Math.max(52, 30 + radiusMiles * 16)) * zoom;
  const coordLabel = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  const radiusLabel = formatRadiusLabel(radiusMiles);

  async function applyPlace(next: SiteCoords, place?: PlaceInfo | null) {
    setCoords(next);
    onCoordsChange?.(next);
    let resolved = place;
    if (!resolved?.county && !resolved?.state) {
      try {
        resolved = await reverseGeocode(next.lat, next.lng);
      } catch {
        resolved = null;
      }
    }
    if (resolved?.county || resolved?.state) {
      if (resolved.county) setAutoCounty(true);
      if (resolved.state) setAutoState(true);
      onPlaceChange?.(resolved);
    }
  }

  async function applySearch() {
    if (!search.trim()) return;
    setBusy(true);
    try {
      const found = await searchPlace(search.trim());
      if (!found) {
        toastApiError(new Error("No results for that search"));
        return;
      }
      await applyPlace(
        { lat: found.lat, lng: found.lng },
        { county: found.county, state: found.state },
      );
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toastApiError(new Error("Geolocation is not available"));
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void applyPlace({
          lat: Number(pos.coords.latitude.toFixed(4)),
          lng: Number(pos.coords.longitude.toFixed(4)),
        }).finally(() => setBusy(false));
      },
      (err) => {
        setBusy(false);
        toastApiError(err);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  function onMapPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
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
    mapRef.current?.setPointerCapture(e.pointerId);
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
    } else if (dragOrigin.current) {
      const degPerPx = 0.0035 / zoom;
      setCoords({
        lat: Number(
          (
            dragOrigin.current.lat -
            (y - dragOrigin.current.y) * degPerPx
          ).toFixed(4),
        ),
        lng: Number(
          (
            dragOrigin.current.lng +
            (x - dragOrigin.current.x) * degPerPx
          ).toFixed(4),
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
    if (mode === "radius") {
      onRadiusChange?.(liveRadius.current, formatRadiusLabel(liveRadius.current));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          Add Coordinates
        </p>
        <p className="mt-0.5 font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
          Coordinate Format: Decimal Degrees (DD) — Pasted DMS Accepted
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#959597]">
            ⌕
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
            placeholder="Search address or paste coordinates (DD or DMS)"
            className="h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] pr-3 pl-9 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A] focus:border-[#5A5A5A] disabled:opacity-60"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={useCurrentLocation}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF] hover:bg-white/5 disabled:opacity-60"
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#3B82F6]/30 text-[10px] text-[#93C5FD]">
            ●
          </span>
          Use My Current Location
        </button>
      </div>

      <div
        ref={mapRef}
        className="relative h-[280px] touch-none overflow-hidden rounded-xl border border-[#2D2D30] bg-[#0B1220] sm:h-[340px]"
        onPointerDown={onMapPointerDown}
        onPointerMove={onMapPointerMove}
        onPointerUp={onMapPointerUp}
        onPointerCancel={onMapPointerUp}
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
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(#2a3a55 1px, transparent 1px), linear-gradient(90deg, #2a3a55 1px, transparent 1px)",
            backgroundSize: `${56 * zoom}px ${56 * zoom}px`,
            backgroundPosition: "center",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#60A5FA]"
          style={{ width: radiusPx * 2, height: radiusPx * 2 }}
        >
          <span className="absolute top-1/2 right-0 h-3.5 w-3.5 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#93C5FD] bg-[#FDFDFF]" />
          <span className="absolute top-1/2 -right-2 translate-x-full -translate-y-1/2 whitespace-nowrap rounded-md bg-[#0D0D0D]/90 px-2 py-1 font-sans text-[9px] uppercase text-[#E5E7EB]">
            Radius {radiusLabel}
          </span>
        </div>
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="relative flex flex-col items-center">
            <span className="absolute -top-8 rounded-md bg-[#0D0D0D]/95 px-2 py-1 font-sans text-[9px] uppercase text-[#FDFDFF]">
              {coordLabel}
            </span>
            <span className="relative flex h-4 w-4 items-center justify-center">
              <span className="absolute h-4 w-4 rounded-full bg-[#EF4444]/35" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-[#EF4444] ring-2 ring-white" />
            </span>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/70 px-2 py-1.5 font-sans text-[9px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
          Drag pin to move · Drag edge to resize radius
        </div>
        <div className="absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-lg border border-[#2D2D30] bg-black/80">
          <button
            type="button"
            className="h-8 w-8 text-[#FDFDFF] hover:bg-white/10"
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
          >
            +
          </button>
          <button
            type="button"
            className="h-8 w-8 border-t border-[#2D2D30] text-[#FDFDFF] hover:bg-white/10"
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.25))}
          >
            −
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
            Location & Radius
          </span>
          <div className="flex h-10 items-center gap-2 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3">
            <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
            <span className="truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {coordLabel} · {radiusLabel}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
            County
          </span>
          <div className="relative flex h-10 items-center rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 pr-14">
            <span className="truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {county || "—"}
            </span>
            {autoCounty && county ? (
              <span className="absolute top-1/2 right-2 -translate-y-1/2 rounded bg-[#166534] px-1.5 py-0.5 font-sans text-[9px] uppercase text-[#86EFAC]">
                Auto
              </span>
            ) : null}
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#6F6F72]">
            State
          </span>
          <div className="relative flex h-10 items-center rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 pr-14">
            <span className="truncate font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {state || "—"}
            </span>
            {autoState && state ? (
              <span className="absolute top-1/2 right-2 -translate-y-1/2 rounded bg-[#166534] px-1.5 py-0.5 font-sans text-[9px] uppercase text-[#86EFAC]">
                Auto
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AutoBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span
      className={cn(
        "rounded bg-[#166534] px-1.5 py-0.5 font-sans text-[9px] uppercase text-[#86EFAC]",
      )}
    >
      Auto
    </span>
  );
}
