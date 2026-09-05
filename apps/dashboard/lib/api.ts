"use client";

import { createApiClient, ApiClient } from "@dark-horse-safety/api-client";
import { trackApiPromise } from "@/lib/api-loading";

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

const rawApi = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002",
  getToken: () => getAccessToken(),
});

function wrapMethod<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
) {
  return (...args: TArgs) => trackApiPromise(fn(...args));
}

/** API client with global loader tracking on every request. */
export const api = {
  request: wrapMethod(rawApi.request.bind(rawApi)),
  get: wrapMethod(rawApi.get.bind(rawApi)),
  post: wrapMethod(rawApi.post.bind(rawApi)),
  put: wrapMethod(rawApi.put.bind(rawApi)),
  patch: wrapMethod(rawApi.patch.bind(rawApi)),
  delete: wrapMethod(rawApi.delete.bind(rawApi)),
  login: wrapMethod(rawApi.login.bind(rawApi)),
  loginWithGoogle: wrapMethod(rawApi.loginWithGoogle.bind(rawApi)),
  me: wrapMethod(rawApi.me.bind(rawApi)),
  forgotPassword: wrapMethod(rawApi.forgotPassword.bind(rawApi)),
  resendReset: wrapMethod(rawApi.resendReset.bind(rawApi)),
  resetPassword: wrapMethod(rawApi.resetPassword.bind(rawApi)),
  getInvite: wrapMethod(rawApi.getInvite.bind(rawApi)),
  acceptInvite: wrapMethod(rawApi.acceptInvite.bind(rawApi)),
  requestInvite: wrapMethod(rawApi.requestInvite.bind(rawApi)),
  resendInvite: wrapMethod(rawApi.resendInvite.bind(rawApi)),
} as Pick<
  ApiClient,
  | "request"
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "login"
  | "loginWithGoogle"
  | "me"
  | "forgotPassword"
  | "resendReset"
  | "resetPassword"
  | "getInvite"
  | "acceptInvite"
  | "requestInvite"
  | "resendInvite"
>;

export function googleOAuthStartUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
  return `${base.replace(/\/$/, "")}/auth/google`;
}
