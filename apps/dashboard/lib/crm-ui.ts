import type { KpiCell } from "@/features/crm/crm-types";
import { KPI_KEY_ORDER } from "@/features/crm/crm-constants";

/**
 * Display rule for CRM metrics: no data / zero → "—" (never show "0").
 */
export function formatKpiValue(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value === 0) return "—";
    return String(value);
  }
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === "0" || trimmed === "0.0" || trimmed === "$0") {
    return "—";
  }
  const asNum = Number(trimmed.replace(/[$,%\s]/g, ""));
  if (Number.isFinite(asNum) && asNum === 0) return "—";
  return trimmed;
}

/** Fill KPI shell cells from API count map (ordered keys, then remaining). */
export function kpiCellsFromApi(
  shell: KpiCell[],
  kpiData: Record<string, number | string>,
): KpiCell[] {
  const keys = [
    ...KPI_KEY_ORDER.filter((k) => k in kpiData),
    ...Object.keys(kpiData).filter(
      (k) => !KPI_KEY_ORDER.includes(k as (typeof KPI_KEY_ORDER)[number]),
    ),
  ];
  return shell.map((cell, i) => {
    const key = keys[i];
    if (!key) return { ...cell, value: "—" };
    return { ...cell, value: formatKpiValue(kpiData[key]) };
  });
}

/** @deprecated use kpiCellsFromApi */
export function mergeCrmKpi<T extends { value: string }>(
  fallback: T[],
  kpiData: Record<string, number>,
): T[] {
  return kpiCellsFromApi(
    fallback as unknown as KpiCell[],
    kpiData,
  ) as unknown as T[];
}

export function toApiStatus(status: string) {
  return status.trim().replace(/-/g, "_").toUpperCase();
}

export function parseMoney(value: string): number | undefined {
  const n = Number(String(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function toIsoDate(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

/** Project lat/lng into 0–100 map panel coords (rough Permian basin frame). */
export function latLngToMapPin(
  id: string,
  label: string,
  lat?: number | null,
  lng?: number | null,
  active = true,
) {
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  const x = Math.min(90, Math.max(10, ((lng + 104) / 4) * 100));
  const y = Math.min(90, Math.max(10, ((33.5 - lat) / 3) * 100));
  return { id, label, x, y, active };
}
