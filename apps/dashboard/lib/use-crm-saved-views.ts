"use client";

import * as React from "react";
import type { DashboardSavedView } from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Load / create / delete CRM saved views for a backend SavedViewScope. */
export function useCrmSavedViews(scope: string) {
  const [savedViews, setSavedViews] = React.useState<DashboardSavedView[]>([]);
  const [activeViewId, setActiveViewId] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    try {
      const res = await crmApi.listSavedViews(scope);
      setSavedViews(
        res.data.map((v) => ({
          id: v.id,
          label: v.name,
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

  async function createView(name: string) {
    try {
      const res = await crmApi.createSavedView({
        name,
        scope,
        payload: {},
      });
      toastSuccess("View saved");
      setSavedViews((prev) => [
        ...prev,
        { id: res.data.id, label: res.data.name },
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

  return {
    savedViews,
    setSavedViews,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
    reload,
  };
}
