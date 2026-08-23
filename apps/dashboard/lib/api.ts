import { createApiClient } from "@dark-horse-safety/api-client";

const TOKEN_KEY = "dhs_access_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002",
  getToken: () => getAccessToken(),
});

export function googleOAuthStartUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
  return `${base.replace(/\/$/, "")}/auth/google`;
}
