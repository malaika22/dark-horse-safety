import { notFound } from "next/navigation";

/**
 * Catch-all for unknown paths under the authenticated shell so they render
 * `(app)/not-found` inside AppShell instead of only the root layout.
 */
export default function MissingAppRoutePage() {
  notFound();
}
