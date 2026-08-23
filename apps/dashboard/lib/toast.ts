"use client";

import { toast, type ToastOptions } from "react-toastify";
import { mapApiValidationError } from "@/lib/auth-validation";

const defaultOptions: ToastOptions = {
  position: "top-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

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

/** Show backend / ApiError message in the error toaster. */
export function toastApiError(err: unknown, fallback?: string) {
  if (typeof err === "string") {
    toastError(err || fallback || "Something went wrong. Try again.");
    return { message: err };
  }
  const mapped = mapApiValidationError(err);
  toastError(
    mapped.message || fallback || "Something went wrong. Try again.",
  );
  return mapped;
}
