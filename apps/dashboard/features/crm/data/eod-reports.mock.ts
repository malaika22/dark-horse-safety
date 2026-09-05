import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const EOD_REPORTS_KPI = [
  { title: "Today",           value: "38",    meta: "Reports Due",      icon: "lightning" as StatIconName },
  { title: "Submitted",       value: "7",     meta: "This Week",        icon: "document"  as StatIconName },
  { title: "Pending",         value: "1",     meta: "Awaiting",         icon: "time"      as StatIconName },
  { title: "Team Activities", value: "52",    meta: "Team · This Week", icon: "customers" as StatIconName },
  { title: "Pipeline",        value: "$286K", meta: "Open",             icon: "folder"    as StatIconName },
];

export type BadgeCell = { label: string; variant: DashboardBadgeVariant } | null;

export type EodReportRow = {
  id: string;
  reportId: string;
  submittedTime: string;
  date: string;
  rep: string;
  activities: number;
  calls: string;
  callsDetail: string;
  visits: string;
  visitsDetail: string;
  meetings: string;
  meetingsBadge: BadgeCell;
  quotes: BadgeCell;
  pipeline: BadgeCell;
  status: { label: string; variant: DashboardBadgeVariant };
};

const BASE_EOD_REPORTS: EodReportRow[] = [
  {
    id: "1",
    reportId: "EOD-6121",
    submittedTime: "5:30P",
    date: "Jun 12",
    rep: "R. Crawford",
    activities: 8,
    calls: "4",
    callsDetail: "2 Days",
    visits: "1",
    visitsDetail: "Traveling",
    meetings: "2",
    meetingsBadge: null,
    quotes: { label: "2/4 Missing", variant: "error" },
    pipeline: { label: "Billed · 10hrs", variant: "success" },
    status: { label: "In Progress", variant: "offline" },
  },
  {
    id: "2",
    reportId: "EOD-6122",
    submittedTime: "5:45P",
    date: "Jun 12",
    rep: "S. Vance",
    activities: 6,
    calls: "2",
    callsDetail: "6 Days",
    visits: "2",
    visitsDetail: "On Site",
    meetings: "",
    meetingsBadge: { label: "Missing", variant: "error" },
    quotes: { label: "2/4 Missing", variant: "error" },
    pipeline: { label: "Under Billed", variant: "warning" },
    status: { label: "In Progress", variant: "offline" },
  },
  {
    id: "3",
    reportId: "EOD-6120",
    submittedTime: "5:30P",
    date: "Jun 11",
    rep: "R. Crawford",
    activities: 7,
    calls: "3",
    callsDetail: "6 Days",
    visits: "2",
    visitsDetail: "Completed",
    meetings: "1",
    meetingsBadge: null,
    quotes: { label: "4/4 Complete", variant: "success" },
    pipeline: { label: "Billed · 10hrs", variant: "success" },
    status: { label: "Complete", variant: "success" },
  },
  {
    id: "4",
    reportId: "EOD-6119",
    submittedTime: "6:00P",
    date: "Jun 11",
    rep: "S. Vance",
    activities: 5,
    calls: "2",
    callsDetail: "6 Days",
    visits: "1",
    visitsDetail: "Traveling",
    meetings: "2",
    meetingsBadge: null,
    quotes: { label: "2/6 Missing", variant: "error" },
    pipeline: { label: "Not Bill", variant: "error" },
    status: { label: "On Hold", variant: "warning" },
  },
  {
    id: "5",
    reportId: "EOD-6118",
    submittedTime: "5:15P",
    date: "Jun 10",
    rep: "R. Crawford",
    activities: 9,
    calls: "5",
    callsDetail: "6 Days",
    visits: "2",
    visitsDetail: "Completed",
    meetings: "1",
    meetingsBadge: null,
    quotes: { label: "4/4 Complete", variant: "success" },
    pipeline: { label: "Billed · 10hrs", variant: "success" },
    status: { label: "Complete", variant: "success" },
  },
  {
    id: "6",
    reportId: "EOD-6117",
    submittedTime: "5:40P",
    date: "Jun 10",
    rep: "S. Vance",
    activities: 4,
    calls: "1",
    callsDetail: "6 Days",
    visits: "2",
    visitsDetail: "Traveling",
    meetings: "1",
    meetingsBadge: null,
    quotes: { label: "2/4 Missing", variant: "error" },
    pipeline: { label: "Billed · 10hrs", variant: "success" },
    status: { label: "In Progress", variant: "offline" },
  },
  {
    id: "7",
    reportId: "EOD-6116",
    submittedTime: "5:30P",
    date: "Jun 09",
    rep: "R. Crawford",
    activities: 6,
    calls: "3",
    callsDetail: "6 Days",
    visits: "1",
    visitsDetail: "Completed",
    meetings: "2",
    meetingsBadge: null,
    quotes: { label: "8/8 Complete", variant: "success" },
    pipeline: { label: "Not Bill", variant: "error" },
    status: { label: "In Progress", variant: "offline" },
  },
  {
    id: "8",
    reportId: "EOD-6115",
    submittedTime: "5:50P",
    date: "Jun 09",
    rep: "S. Vance",
    activities: 7,
    calls: "3",
    callsDetail: "6 Days",
    visits: "2",
    visitsDetail: "On Site",
    meetings: "2",
    meetingsBadge: null,
    quotes: { label: "2/4 Missing", variant: "error" },
    pipeline: { label: "Under Billed", variant: "warning" },
    status: { label: "In Progress", variant: "offline" },
  },
];

export const EOD_REPORTS_ROWS: EodReportRow[] = Array.from({ length: 32 }, (_, i) => {
  const base = BASE_EOD_REPORTS[i % BASE_EOD_REPORTS.length]!;
  const n = i + 1;
  const reportNum = 6121 - i;
  return {
    ...base,
    id: String(n),
    reportId: `EOD-${reportNum}`,
  };
});

export const EOD_REPORTS_SORT_OPTIONS = [
  { id: "date",       label: "Notice start (nearest)" },
  { id: "reportId",   label: "Report ID" },
  { id: "rep",        label: "Rep" },
  { id: "activities", label: "Activities" },
  { id: "status",     label: "Status" },
];

export const EOD_REPORTS_SAVED_VIEWS = [
  { id: "view-1", label: "All Reports" },
  { id: "view-2", label: "Pending" },
  { id: "view-3", label: "Submitted Today" },
];

export const EOD_REPORT_DETAIL = {
  id: "1",
  reportId: "EOD-6121",
  status: { label: "Submitted", variant: "success" as DashboardBadgeVariant },
  meta: "R. Crawford · Jun 12 · 5:30P",
  rep: {
    name: "R. Crawford",
    date: "Jun 12, 2026",
    avatarUrl: "https://picsum.photos/seed/dhs-crawford/64/64",
  },
  summary: [
    { label: "Submitted",        value: "5:30P" },
    { label: "Total Activities", value: "8" },
    { label: "Meetings",         value: "2" },
    { label: "Emails",           value: "1" },
    { label: "Calls",            value: "4" },
    { label: "Visits",           value: "1" },
  ],
  pipeline: [
    { label: "Quotes Sent",    value: "2" },
    { label: "Pipeline Value", value: "$42K" },
    { label: "Closed Today",   value: "$0" },
    { label: "Next-Day Plan",  value: "3 Follow-ups" },
  ],
  activities: [
    "SA-2041 · Call · Permian Basin · Quote Follow-up · Positive",
    "SA-2037 · Call · Delaware · Intro Call · No Answer",
  ],
  moreActivities: 6,
  notes:
    "Strong day. Permian Basin quote close to signing, need final H2S pricing. Delaware not reached, retry tomorrow AM.",
};
