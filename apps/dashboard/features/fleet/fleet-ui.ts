import type { DashboardBadgeVariant } from "@dark-horse-safety/ui";

export function fleetBadgeTone(tone: string): DashboardBadgeVariant {
  if (tone === "danger") return "error";
  if (tone === "muted") return "neutral";
  if (tone === "info") return "billing";
  if (
    tone === "success" ||
    tone === "warning" ||
    tone === "error" ||
    tone === "neutral" ||
    tone === "review" ||
    tone === "billing"
  ) {
    return tone as DashboardBadgeVariant;
  }
  return "neutral";
}
