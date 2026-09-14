"use client";

type Listener = (count: number) => void;

let pending = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(pending);
}

/** Subscribe to in-flight API request count (client-only). */
export function subscribeApiLoading(listener: Listener) {
  listeners.add(listener);
  listener(pending);
  return () => {
    listeners.delete(listener);
  };
}

export function getApiPendingCount() {
  return pending;
}

function beginApi() {
  pending += 1;
  emit();
}

function endApi() {
  pending = Math.max(0, pending - 1);
  emit();
}

/** Wrap any promise so the global logo loader tracks it. */
export function trackApiPromise<T>(promise: Promise<T>): Promise<T> {
  beginApi();
  return promise.finally(() => {
    endApi();
  });
}
