"use client";

import * as React from "react";

type HeaderActionsContextValue = {
  /** When set, replaces static list CTAs (even if node is null). */
  actionsOverride: React.ReactNode | null | undefined;
  setActionsOverride: (node: React.ReactNode | null | undefined) => void;
  breadcrumbOverride: string | null;
  setBreadcrumbOverride: (value: string | null) => void;
  pageTitleOverride: string | null;
  setPageTitleOverride: (value: string | null) => void;
};

const HeaderActionsContext =
  React.createContext<HeaderActionsContextValue | null>(null);

export function HeaderActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [actionsOverride, setActionsOverride] = React.useState<
    React.ReactNode | null | undefined
  >(undefined);
  const [breadcrumbOverride, setBreadcrumbOverride] = React.useState<
    string | null
  >(null);
  const [pageTitleOverride, setPageTitleOverride] = React.useState<
    string | null
  >(null);

  const value = React.useMemo(
    () => ({
      actionsOverride,
      setActionsOverride,
      breadcrumbOverride,
      setBreadcrumbOverride,
      pageTitleOverride,
      setPageTitleOverride,
    }),
    [actionsOverride, breadcrumbOverride, pageTitleOverride],
  );

  return (
    <HeaderActionsContext.Provider value={value}>
      {children}
    </HeaderActionsContext.Provider>
  );
}

export function useHeaderActionsSlot() {
  const ctx = React.useContext(HeaderActionsContext);
  if (!ctx) {
    throw new Error("useHeaderActionsSlot must be used within HeaderActionsProvider");
  }
  return ctx;
}

/**
 * Register dynamic header row-2 actions for the current page.
 * Clears only on unmount (not when deps change) to avoid update loops.
 */
export function useSetHeaderActions(
  actions: React.ReactNode | null,
  deps: React.DependencyList = [],
) {
  const { setActionsOverride } = useHeaderActionsSlot();
  const actionsRef = React.useRef(actions);
  actionsRef.current = actions;

  React.useEffect(() => {
    setActionsOverride(actionsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  React.useEffect(() => {
    return () => setActionsOverride(undefined);
  }, [setActionsOverride]);
}

/** Override breadcrumb trail (e.g. include entity name on detail). Clears on unmount. */
export function useSetHeaderBreadcrumb(breadcrumb: string | null) {
  const { setBreadcrumbOverride } = useHeaderActionsSlot();
  React.useEffect(() => {
    setBreadcrumbOverride(breadcrumb);
  }, [breadcrumb, setBreadcrumbOverride]);

  React.useEffect(() => {
    return () => setBreadcrumbOverride(null);
  }, [setBreadcrumbOverride]);
}

/** Override page title (e.g. drill-down views). Clears on unmount. */
export function useSetHeaderPageTitle(pageTitle: string | null) {
  const { setPageTitleOverride } = useHeaderActionsSlot();
  React.useEffect(() => {
    setPageTitleOverride(pageTitle);
  }, [pageTitle, setPageTitleOverride]);

  React.useEffect(() => {
    return () => setPageTitleOverride(null);
  }, [setPageTitleOverride]);
}
