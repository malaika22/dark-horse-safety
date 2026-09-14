"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@dark-horse-safety/api-client";
import type { SessionUser } from "@dark-horse-safety/types";
import { api, clearAccessToken, getAccessToken } from "@/lib/api";
import { toastInfo } from "@/lib/toast";

const BOOTSTRAP_USER_KEY = "dhs_session_user";

type SessionContextValue = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

/** Seed session user immediately after login so AppShell does not flash blank. */
export function seedSessionUser(user: SessionUser) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BOOTSTRAP_USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore quota / private mode */
  }
}

function readSeededUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(BOOTSTRAP_USER_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(BOOTSTRAP_USER_KEY);
    const parsed = JSON.parse(raw) as SessionUser;
    if (parsed && typeof parsed.id === "string") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

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

    const seeded = readSeededUser();
    if (seeded) {
      setUser(seeded);
    }

    try {
      const res = await api.me();
      setUser(res.data);
    } catch (err) {
      const unauthorized =
        err instanceof ApiError &&
        (err.status === 401 || err.status === 403 || err.code === "UNAUTHORIZED");

      if (unauthorized) {
        clearAccessToken();
        setUser(null);
        router.replace("/");
      } else if (!seeded) {
        // Network / transient error — keep token, show shell only after retry fails hard
        setUser(null);
        router.replace("/");
      }
      // If we have a seeded user from login, keep them and stay on the app
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
    try {
      window.sessionStorage.removeItem(BOOTSTRAP_USER_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
    toastInfo("Signed out successfully");
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
  if (user.email) return user.email.split("@")[0] || user.email;
  if (user.phone) return user.phone;
  return "User";
}

export function sessionRoleLabel(role?: string) {
  if (!role) return "";
  return role.replace(/_/g, " ");
}
