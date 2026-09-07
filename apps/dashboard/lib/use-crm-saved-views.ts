"use client";

import * as React from "react";
import type { DashboardSavedView } from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";

export type CrmSavedViewItem = DashboardSavedView & {
  payload?: unknown;
};

/** Load / create / delete CRM saved views for a backend SavedViewScope. */
export function useCrmSavedViews(scope: string) {
  const [savedViews, setSavedViews] = React.useState<CrmSavedViewItem[]>([]);
  const [activeViewId, setActiveViewId] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    try {
      const res = await crmApi.listSavedViews(scope);
      setSavedViews(
        res.data.map((v) => ({
          id: v.id,
          label: v.name,
          payload: v.payload,
        })),
      );
    } catch (err) {
      toastApiError(err);
      setSavedViews([]);
    }
  }, [scope]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function createView(
    name: string,
    payload?: Record<string, unknown>,
  ) {
    try {
      const res = await crmApi.createSavedView({
        name,
        scope,
        payload: payload ?? {},
      });
      toastSuccess("View saved");
      setSavedViews((prev) => [
        ...prev,
        {
          id: res.data.id,
          label: res.data.name,
          payload: res.data.payload ?? payload ?? {},
        },
      ]);
      setActiveViewId(res.data.id);
      return res.data.id;
    } catch (err) {
      toastApiError(err);
      return null;
    }
  }

  async function deleteView(viewId: string) {
    try {
      await crmApi.deleteSavedView(viewId);
      toastSuccess("View deleted");
      setSavedViews((prev) => prev.filter((v) => v.id !== viewId));
      if (activeViewId === viewId) setActiveViewId(null);
    } catch (err) {
      toastApiError(err);
    }
  }

  function getActivePayload(): unknown | null {
    if (!activeViewId) return null;
    const view = savedViews.find((v) => v.id === activeViewId);
    return view?.payload ?? null;
  }

  return {
    savedViews,
    setSavedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
    getActivePayload,
    reload,
  };
}
