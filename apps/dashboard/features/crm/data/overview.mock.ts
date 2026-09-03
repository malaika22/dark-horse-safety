import type { DashboardBadgeVariant } from "@dark-horse-safety/ui";
import type { DashboardHorizontalBarItem } from "@dark-horse-safety/ui";
import type { DashboardWorkloadSegment } from "@dark-horse-safety/ui";

export const CRM_SYNC_LABEL = "Last synced 2:13 PM CT";

export const EOD_COMPLIANCE = {
  complete: 7,
  total: 8,
  blocked: 1,
  dateLabel: "Thu • aug 27",
  /** Visual density for segmented bar (label still shows 7/8). */
  segments: [
    { count: 35, tone: "success" as const, label: "7 complete" },
    { count: 5, tone: "error" as const, label: "1 blocked" },
  ] satisfies DashboardWorkloadSegment[],
  barTotal: 40,
};

export type RepEodTone = "complete" | "warning" | "critical";

export const REP_PERFORMANCE = [
  {
    rep: "R. Crawford",
    calls: 18,
    visits: 6,
    quotes: 4,
    pipeline: "$286K",
    eod: "5/5",
    eodTone: "complete" as RepEodTone,
  },
  {
    rep: "S. Vance",
    calls: 14,
    visits: 5,
    quotes: 3,
    pipeline: "$198K",
    eod: "3/5",
    eodTone: "warning" as RepEodTone,
  },
  {
    rep: "M. Diaz",
    calls: 11,
    visits: 4,
    quotes: 2,
    pipeline: "$142K",
    eod: "1/5",
    eodTone: "critical" as RepEodTone,
  },
  {
    rep: "K. Lee",
    calls: 9,
    visits: 3,
    quotes: 1,
    pipeline: "$86K",
    eod: "5/5",
    eodTone: "complete" as RepEodTone,
  },
];

export type SalesActivityIcon = "dollar" | "building" | "quote" | "visit";

export const SALES_ACTIVITY = [
  {
    icon: "dollar" as SalesActivityIcon,
    title: "S. Vance closed cactus well • $84K",
    subtitle: "Quote converted",
    time: "40m ago",
  },
  {
    icon: "building" as SalesActivityIcon,
    title: "New account setup • apex drilling",
    subtitle: "Route rules pending",
    time: "2h ago",
  },
  {
    icon: "quote" as SalesActivityIcon,
    title: "M. Diaz sent quote • west pad 12",
    subtitle: "$42K pipeline add",
    time: "Yesterday",
  },
];

export const MSA_RENEWALS = [
  { client: "Permian basin energy", due: "Due in 9 days" },
  { client: "Lonestar operating", due: "Due in 41 days" },
];

export const FIELD_EVENTS_WEEK = [
  { day: "M", count: 3, isToday: false },
  { day: "T", count: 5, isToday: true },
  { day: "W", count: 4, isToday: false },
  { day: "T", count: 2, isToday: false },
  { day: "F", count: 6, isToday: false },
];

export const FIELD_EVENTS_TODAY = [
  { label: "Visits", count: 2, icon: "pin" as const },
  { label: "Calls", count: 2, icon: "phone" as const },
  { label: "Meetings", count: 1, icon: "users" as const },
];

export const QUOTE_PIPELINE: DashboardHorizontalBarItem[] = [
  { label: "Draft", value: 38, icon: "document" },
  { label: "Sent", value: 3, icon: "send" },
  { label: "Approved", value: 2, icon: "check" },
  { label: "Won", value: 1, tone: "success", icon: "won" },
  { label: "Expired", value: 1, tone: "critical", icon: "expired" },
];

export const QUOTE_PIPELINE_SUMMARY = {
  open: "$834K",
  conversion: "2.6%",
};

export type SetupHealthTone = "healthy" | "warning" | "critical";

export const ACCOUNT_SETUP_HEALTH = [
  { label: "Form rules", value: 16, total: 142, tone: "critical" as SetupHealthTone },
  { label: "Route rules", value: 128, total: 142, tone: "healthy" as SetupHealthTone },
  { label: "Pricing", value: 134, total: 142, tone: "healthy" as SetupHealthTone },
  { label: "Requirements", value: 98, total: 142, tone: "warning" as SetupHealthTone },
];

export const SETUP_HEALTH_LEGEND: {
  tone: SetupHealthTone;
  label: string;
  color: string;
}[] = [
  { tone: "healthy", label: "Healthy", color: "#22C55E" },
  { tone: "warning", label: "Warning", color: "#FF9500" },
  { tone: "critical", label: "Critical", color: "#FF4D4D" },
];

export function repEodBadgeVariant(tone: RepEodTone): DashboardBadgeVariant {
  if (tone === "complete") return "neutral";
  if (tone === "warning") return "review";
  return "error";
}
