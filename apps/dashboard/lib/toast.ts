"use client";

import { toast, type ToastOptions } from "react-toastify";
import { ApiError } from "@dark-horse-safety/api-client";
import { mapApiValidationError } from "@/lib/auth-validation";

const defaultOptions: ToastOptions = {
  position: "top-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

/** Client + API field validation toast copy. */
export const VALIDATION_TOAST_MESSAGE =
  "Some fields are missing. Please check and fill them.";

export function isValidationApiError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  if (err.code === "VALIDATION_ERROR") return true;
  if (err.details && Object.keys(err.details).length > 0) return true;
  if (
    err.status === 400 &&
    /validat|required|missing/i.test(err.message ?? "")
  ) {
    return true;
  }
  return false;
}

export function toastSuccess(message: string, options?: ToastOptions) {
  if (!message?.trim()) return;
  toast.success(message.trim(), { ...defaultOptions, ...options });
}

export function toastError(message: string, options?: ToastOptions) {
  if (!message?.trim()) return;
  toast.error(message.trim(), { ...defaultOptions, ...options });
}

export function toastInfo(message: string, options?: ToastOptions) {
  if (!message?.trim()) return;
  toast.info(message.trim(), { ...defaultOptions, ...options });
}

/** Friendly toast for missing / invalid required fields (not "Something went wrong"). */
export function toastValidationError(message?: string) {
  toastError(message?.trim() || VALIDATION_TOAST_MESSAGE);
}

/** Show backend / ApiError message in the error toaster. */
export function toastApiError(err: unknown, fallback?: string) {
  if (typeof err === "string") {
    toastError(err || fallback || "Something went wrong. Try again.");
    return { message: err };
  }

  if (isValidationApiError(err)) {
    toastValidationError();
    return mapApiValidationError(err);
  }

  if (err instanceof Error && !(err instanceof ApiError) && err.message.trim()) {
    toastError(err.message.trim());
    return { message: err.message.trim() };
  }

  const mapped = mapApiValidationError(err);
  toastError(
    mapped.message || fallback || "Something went wrong. Try again.",
  );
  return mapped;
}
