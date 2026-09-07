import type { DashboardBadgeVariant } from "@dark-horse-safety/ui";
import type {
  DashboardHorizontalBarItem,
  DashboardWorkloadSegment,
} from "@dark-horse-safety/ui";

import type { DashboardCycleKpiItem } from "@dark-horse-safety/ui";

export const SYNC_LABEL = "Last synced 2:13 PM CT";

export const THIS_CYCLE: DashboardCycleKpiItem[] = [
  {
    title: "Unbilled",
    value: "$4,460",
    icon: "unbilled",
    metaPrefix: "24.5H • ",
    metaHighlight: "-38% since c09",
  },
  {
    title: "Approved Billing",
    value: "$58,902",
    icon: "approved",
    meta: "313H • 73% matched",
  },
  {
    title: "Gross Payroll",
    value: "$12,407",
    icon: "payroll",
    meta: "342.5H • 11 techs",
  },
  {
    title: "Open Pipeline",
    value: "$834K",
    icon: "pipeline",
    meta: "34 quotes • 7 reps",
  },
];

export const PAYROLL = {
  lockLabel: "Locks in 1 day 9h",
  lockPrefix: "Locks in",
  lockValuePrimary: "1 DAY",
  lockValueSecondary: "9H",
  segments: [
    { count: 71, tone: "success" as const, label: "71 approved" },
    { count: 8, tone: "warning" as const, label: "8 WOs not ready" },
    { count: 5, tone: "error" as const, label: "5 blocked" },
  ] satisfies DashboardWorkloadSegment[],
  total: 84,
};

export const UNBILLED_LEGEND = [
  { label: "Underbilled", color: "#FF4D4D" },
  { label: "Overbilled", color: "#FF9500" },
];

export const EXCEPTIONS = [
  {
    title: "JSA missing • blocks payroll • WO 46005734",
    tag: "Safety",
    tagVariant: "safety" as DashboardBadgeVariant,
  },
  {
    title: "Under-billed 2.5H • site safety • WO 46005812",
    tag: "Billing",
    tagVariant: "billing" as DashboardBadgeVariant,
  },
  {
    title: "3 work orders missing ticket",
    tag: "Operations",
    tagVariant: "operations" as DashboardBadgeVariant,
  },
  {
    title: "SCBA expired • 2 need calibration",
    tag: "Fleet",
    tagVariant: "fleet" as DashboardBadgeVariant,
  },
];

export type CrewStatus =
  | "clocked-in"
  | "blocked"
  | "offline"
  | "on-call"
  | "off";

export const CREW_STATUS_LEGEND: {
  status: CrewStatus;
  label: string;
  color: string;
}[] = [
  { status: "clocked-in", label: "Clocked in", color: "#22C55E" },
  { status: "blocked", label: "Blocked", color: "#FF4D4D" },
  { status: "offline", label: "Offline", color: "#FF9500" },
  { status: "on-call", label: "On call", color: "#3B82F6" },
  { status: "off", label: "Off", color: "#959597" },
];

export const LIVE_CREW: {
  id: string;
  initials: string;
  name: string;
  imageUrl: string;
  status: CrewStatus;
}[] = [
  {
    id: "jm",
    initials: "JM",
    name: "J. Martin",
    imageUrl: "https://picsum.photos/seed/dhs-jmartin/96/96",
    status: "clocked-in",
  },
  {
    id: "ch",
    initials: "CH",
    name: "C. Holmes",
    imageUrl: "https://picsum.photos/seed/dhs-cholmes/96/96",
    status: "clocked-in",
  },
  {
    id: "tw",
    initials: "TW",
    name: "T. White",
    imageUrl: "https://picsum.photos/seed/dhs-twhite/96/96",
    status: "clocked-in",
  },
  {
    id: "dr",
    initials: "DR",
    name: "D. Reed",
    imageUrl: "https://picsum.photos/seed/dhs-dreed/96/96",
    status: "blocked",
  },
  {
    id: "md",
    initials: "MD",
    name: "M. Diaz",
    imageUrl: "https://picsum.photos/seed/dhs-mdiaz/96/96",
    status: "offline",
  },
  {
    id: "mk",
    initials: "MK",
    name: "M. King",
    imageUrl: "https://picsum.photos/seed/dhs-mking/96/96",
    status: "clocked-in",
  },
  {
    id: "aw",
    initials: "AW",
    name: "A. White",
    imageUrl: "https://picsum.photos/seed/dhs-awhite/96/96",
    status: "on-call",
  },
  {
    id: "bp",
    initials: "BP",
    name: "B. Park",
    imageUrl: "https://picsum.photos/seed/dhs-bpark/96/96",
    status: "clocked-in",
  },
  {
    id: "rh",
    initials: "RH",
    name: "R. Hall",
    imageUrl: "https://picsum.photos/seed/dhs-rhall/96/96",
    status: "off",
  },
  {
    id: "cn",
    initials: "CN",
    name: "C. Nguyen",
    imageUrl: "https://picsum.photos/seed/dhs-cnguyen/96/96",
    status: "clocked-in",
  },
  {
    id: "lg",
    initials: "LG",
    name: "L. Garcia",
    imageUrl: "https://picsum.photos/seed/dhs-lgarcia/96/96",
    status: "clocked-in",
  },
  {
    id: "df",
    initials: "DF",
    name: "D. Ford",
    imageUrl: "https://picsum.photos/seed/dhs-dford/96/96",
    status: "blocked",
  },
];

export const LIVE_CREW_MORE = 4;

export const REPORTS_DUE = [
  {
    title: "Safety observation • jun",
    status: "Not run",
    statusVariant: "neutral" as DashboardBadgeVariant,
    meta: "ISN and Veriforce • due jul 5",
  },
  {
    title: "Compliance documents • may",
    status: "Failed",
    statusVariant: "error" as DashboardBadgeVariant,
    meta: "Jun 13",
  },
];

export const SAFETY_RECORD = [
  { label: "Days • no recordable", value: "118", icon: "calendar" as const },
  { label: "TRIR", value: "1.42", icon: "chart" as const },
  { label: "Blocked now", value: "4", icon: "blocked" as const },
];

export type FleetVehicleStatus = "active" | "blocked" | "offline" | "off";

export const FLEET_VEHICLES: { id: string; status: FleetVehicleStatus }[] = [
  { id: "T01", status: "active" },
  { id: "T03", status: "blocked" },
  { id: "T04", status: "offline" },
  { id: "T06", status: "off" },
];

export const FLEET_STATS: {
  label: string;
  value: string;
  icon: "truck" | "equipment" | "audit" | "unaccounted";
}[] = [
  { label: "Service trucks", value: "14", icon: "truck" },
  { label: "Equipment", value: "$280K", icon: "equipment" },
  { label: "Monthly audit", value: "9/14", icon: "audit" },
  { label: "Unaccounted", value: "$11,240", icon: "unaccounted" },
];

const fleetStatusColor: Record<FleetVehicleStatus, string> = {
  active: "#22C55E",
  blocked: "#FF4D4D",
  offline: "#FF9500",
  off: "#959597",
};

export function fleetVehicleColor(status: FleetVehicleStatus) {
  return fleetStatusColor[status];
}

const fleetStatusLabel: Record<FleetVehicleStatus, string> = {
  active: "Ready",
  blocked: "Missing",
  offline: "No audit",
  off: "Shop",
};

export function fleetVehicleLabel(status: FleetVehicleStatus) {
  return fleetStatusLabel[status];
}

export type MobileSyncStatusKind = "uptodate" | "failed" | "queued" | "offline";

export const MOBILE_SYNC_SUMMARY: {
  label: string;
  count: number;
  kind: MobileSyncStatusKind;
  color: string;
}[] = [
  { label: "Up to date", count: 8, kind: "uptodate", color: "#22C55E" },
  { label: "Failed", count: 2, kind: "failed", color: "#FF4D4D" },
  { label: "Queued", count: 4, kind: "queued", color: "#FF9500" },
  { label: "Offline", count: 1, kind: "offline", color: "#959597" },
];

export const MOBILE_SYNC_ROWS = [
  {
    name: "D. Reed • Truck 07",
    detail: "Dark since 6:40 PM",
    critical: false,
  },
  {
    name: "M. Diaz • Truck 09",
    detail: "Auth expired",
    critical: true,
  },
];

export const JOB_FLOW: DashboardHorizontalBarItem[] = [
  { label: "To dispatch", value: 24, icon: "truck" },
  { label: "Posted", value: 20, icon: "posted" },
  { label: "In progress", value: 12, icon: "clock" },
  { label: "In review", value: 8, icon: "eye" },
  { label: "No ticket", value: 4, tone: "critical", icon: "close" },
];

export const QUOTE_PIPELINE: DashboardHorizontalBarItem[] = [
  { label: "Draft", value: 38, icon: "document" },
  { label: "Sent", value: 3, icon: "send" },
  { label: "Approved", value: 2, icon: "check" },
  { label: "Won", value: 1, icon: "won" },
  { label: "Expired", value: 1, tone: "critical", icon: "expired" },
];

export const QUOTE_PIPELINE_SUMMARY = {
  open: "$834K",
  conversion: "2.6%",
};
