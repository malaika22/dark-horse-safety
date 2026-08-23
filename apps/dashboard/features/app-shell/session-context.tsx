"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@dark-horse-safety/types";
import { api, clearAccessToken, getAccessToken } from "@/lib/api";

type SessionContextValue = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      router.replace("/");
      return;
    }

    try {
      const res = await api.me();
      setUser(res.data);
    } catch {
      clearAccessToken();
      setUser(null);
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    // Mount-only session bootstrap — refresh updates auth state from storage/API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = React.useCallback(() => {
    clearAccessToken();
    setUser(null);
    router.replace("/");
  }, [router]);

  const value = React.useMemo(
    () => ({ user, loading, refresh, logout }),
    [user, loading, refresh, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = React.useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}

export function sessionDisplayName(
  user: SessionUser | null | undefined,
): string {
  if (!user) return "User";
  if (user.displayName?.trim()) return user.displayName.trim();
  const combined = [user.firstName, user.lastName].filter(Boolean).join(" ");
  if (combined) return combined;
  return user.email?.split("@")[0] || user.email || "User";
}

export function sessionRoleLabel(role?: string) {
  if (!role) return "";
  return role.replace(/_/g, " ");
}
