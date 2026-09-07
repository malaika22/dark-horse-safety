"use client";

import * as React from "react";
import {
  crmApi,
  type CrmLookupMap,
  type CrmLookupOption,
} from "@/lib/crm-api";

export type SelectOption = { value: string; label: string };

function asSelect(opts: CrmLookupOption[] | undefined): SelectOption[] {
  return (opts ?? []).map((o) => ({ value: o.value, label: o.label }));
}

function repLabel(r: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const name = [r.firstName, r.lastName].filter(Boolean).join(" ").trim();
  return name || r.email || "Rep";
}

export type CrmLookupsState = {
  loading: boolean;
  lookups: CrmLookupMap;
  customers: SelectOption[];
  locations: SelectOption[];
  reps: SelectOption[];
  /** Reload live lists (customers / locations / reps). */
  reloadEntities: (opts?: { customerId?: string }) => Promise<void>;
};

const EMPTY: CrmLookupMap = {};

/**
 * Loads static CRM lookup maps + customer / rep / location options for filters & forms.
 */
export function useCrmLookups(options?: {
  /** When set, locations are scoped to this customer. */
  customerId?: string;
  /** Skip locations fetch when not needed. */
  includeLocations?: boolean;
}): CrmLookupsState {
  const customerId = options?.customerId;
  const includeLocations = options?.includeLocations ?? true;

  const [loading, setLoading] = React.useState(true);
  const [lookups, setLookups] = React.useState<CrmLookupMap>(EMPTY);
  const [customers, setCustomers] = React.useState<SelectOption[]>([]);
  const [locations, setLocations] = React.useState<SelectOption[]>([]);
  const [reps, setReps] = React.useState<SelectOption[]>([]);

  const reloadEntities = React.useCallback(
    async (opts?: { customerId?: string }) => {
      const cid = opts?.customerId ?? customerId;
      try {
        const [custRes, repRes, locRes] = await Promise.all([
          crmApi.lookupCustomers(),
          crmApi.lookupReps(),
          includeLocations
            ? crmApi.lookupLocations(undefined, cid)
            : Promise.resolve({ data: [] as { id: string; name: string; code: string }[] }),
        ]);
        setCustomers(
          custRes.data.map((c) => ({
            value: c.id,
            label: c.name,
          })),
        );
        setReps(
          repRes.data.map((r) => ({
            value: r.id,
            label: repLabel(r),
          })),
        );
        setLocations(
          locRes.data.map((l) => ({
            value: l.id,
            label: l.name,
          })),
        );
      } catch {
        /* keep previous */
      }
    },
    [customerId, includeLocations],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [lookRes] = await Promise.all([
          crmApi.lookups(),
          reloadEntities({ customerId }),
        ]);
        if (!cancelled) setLookups(lookRes.data ?? EMPTY);
      } catch {
        if (!cancelled) setLookups(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, reloadEntities]);

  return {
    loading,
    lookups,
    customers,
    locations,
    reps,
    reloadEntities,
  };
}

/** Convenience getters for common filter option lists. */
export function lookupOptions(
  lookups: CrmLookupMap,
  key: string,
): SelectOption[] {
  return asSelect(lookups[key]);
}

export function labelsOf(options: SelectOption[]): string[] {
  return options.map((o) => o.label);
}

export function optionLabel(
  options: SelectOption[],
  value: string,
  fallback = value,
): string {
  if (!value) return fallback;
  return options.find((o) => o.value === value)?.label ?? fallback;
}
