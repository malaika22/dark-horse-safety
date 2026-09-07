"use client";

import * as React from "react";
import { ApiError } from "@dark-horse-safety/api-client";
import type { Paginated } from "@dark-horse-safety/types";
import { toastApiError } from "@/lib/toast";

type ListFn<TItem> = (params: {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: "asc" | "desc";
}) => Promise<{ data: Paginated<TItem> }>;

type KpiFn = () => Promise<{ data: Record<string, number> }>;

/**
 * Shared CRM list loader — fetches paginated rows + optional KPI on param change.
 */
export function useCrmList<TItem, TRow>(options: {
  list: ListFn<TItem>;
  mapRow: (item: TItem) => TRow;
  kpi?: KpiFn;
  q: string;
  page: number;
  pageSize: number;
  sort: string;
  direction: "asc" | "desc";
  extraParams?: Record<string, string | number | boolean | undefined>;
  enabled?: boolean;
}) {
  const {
    list,
    mapRow,
    kpi,
    q,
    page,
    pageSize,
    sort,
    direction,
    extraParams,
    enabled = true,
  } = options;

  const [rows, setRows] = React.useState<TRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [kpiData, setKpiData] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const reload = React.useCallback(() => setReloadKey((k) => k + 1), []);

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const [listRes, kpiRes] = await Promise.all([
          list({
            q: q || undefined,
            page,
            pageSize,
            sort,
            direction,
            ...extraParams,
          }),
          kpi ? kpi() : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setRows(listRes.data.items.map(mapRow));
        setTotal(listRes.data.total);
        if (kpiRes) setKpiData(kpiRes.data);
        setHasLoadedOnce(true);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError ? err.message : "Failed to load data";
        setError(message);
        setRows([]);
        setTotal(0);
        setHasLoadedOnce(true);
        toastApiError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- extraParams serialized
  }, [
    enabled,
    q,
    page,
    pageSize,
    sort,
    direction,
    reloadKey,
    JSON.stringify(extraParams ?? {}),
  ]);

  return {
    rows,
    total,
    kpiData,
    loading,
    /** True until the first list request finishes (success or error). */
    initialLoading: loading && !hasLoadedOnce,
    error,
    reload,
  };
}
