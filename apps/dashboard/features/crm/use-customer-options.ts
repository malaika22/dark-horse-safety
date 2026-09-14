"use client";

import * as React from "react";
import type { DashboardSelectOption } from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { toastApiError } from "@/lib/toast";

function toOption(c: { id: string; name: string; code?: string | null }) {
  const code = c.code?.trim();
  return {
    value: c.id,
    label: code ? `${c.name} (${code})` : c.name,
  };
}

/**
 * Loads customer options for rule/entity forms.
 * Prefers lookup endpoint; falls back to customers list if lookup is empty.
 */
export function useCustomerOptions() {
  const [options, setOptions] = React.useState<DashboardSelectOption[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let items: { id: string; name: string; code?: string | null }[] = [];
        try {
          const res = await crmApi.lookupCustomers();
          items = Array.isArray(res.data) ? res.data : [];
        } catch {
          items = [];
        }

        if (items.length === 0) {
          const list = await crmApi.listCustomers({
            pageSize: 200,
            sort: "name",
            direction: "asc",
          });
          items = (list.data.items ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            code: c.code,
          }));
        }

        if (!cancelled) {
          setOptions(items.map(toOption));
        }
      } catch (err) {
        toastApiError(err);
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { options, loading };
}
