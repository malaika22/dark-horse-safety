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

export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number | null | undefined>>) {
  const lines = [header, ...rows].map((row) =>
    row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","),
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
