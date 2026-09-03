import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const SALES_ACTIVITY_KPI = [
  { title: "This Week",  value: "38", meta: "Logged This Week", icon: "lightning" as StatIconName },
  { title: "Calls",      value: "11", meta: "Past 5 Days",      icon: "document"  as StatIconName },
  { title: "Visits",     value: "7",  meta: "Site Visits",      icon: "gps"       as StatIconName },
  { title: "Meetings",   value: "8",  meta: "Scheduled",        icon: "time"      as StatIconName },
  { title: "Follow-Ups", value: "5",  meta: "Pending",          icon: "customers" as StatIconName },
];

export type SalesActivityRow = {
  id: string;
  activityId: string;
  time: string;
  date: string;
  type: string;
  customer: string;
  contact: string;
  rep: string;
  subject: string;
  outcome: { label: string; variant: DashboardBadgeVariant };
  followUp: { label: string; variant: DashboardBadgeVariant } | null;
  status: { label: string; variant: DashboardBadgeVariant };
};

const BASE: SalesActivityRow[] = [
  { id: "1", activityId: "SA-2041", time: "2:30P", date: "Jun 12", type: "Call",    customer: "Permian Basin",  contact: "J. Whitfield", rep: "R. Crawford", subject: "Quote Follow-up", outcome: { label: "Positive",  variant: "success" }, followUp: { label: "Jun 15", variant: "success" }, status: { label: "Open", variant: "offline" } },
  { id: "2", activityId: "SA-2040", time: "11:00A", date: "Jun 12", type: "Visit",  customer: "Lonestar",       contact: "M. Reyes",     rep: "S. Vance",    subject: "Site Walkthrough", outcome: { label: "Neutral",   variant: "warning" }, followUp: { label: "Jun 14", variant: "success" }, status: { label: "Done", variant: "success" } },
  { id: "3", activityId: "SA-2039", time: "4:15P", date: "Jun 11", type: "Meeting", customer: "Cactus Well",    contact: "T. Boone",     rep: "R. Crawford", subject: "MSA Renewal",     outcome: { label: "Positive",  variant: "success" }, followUp: null,                                  status: { label: "Done", variant: "success" } },
  { id: "4", activityId: "SA-2038", time: "9:30A", date: "Jun 11", type: "Call",    customer: "Rio Grande",     contact: "P. Alvarez",   rep: "S. Vance",    subject: "Intro Call",      outcome: { label: "No Answer", variant: "error"   }, followUp: { label: "Jun 13", variant: "success" }, status: { label: "Open", variant: "offline" } },
  { id: "5", activityId: "SA-2037", time: "3:00P", date: "Jun 10", type: "Call",    customer: "Delaware",       contact: "K. Osei",      rep: "R. Crawford", subject: "Intro Call",      outcome: { label: "No Answer", variant: "error"   }, followUp: { label: "Jun 12", variant: "success" }, status: { label: "Open", variant: "offline" } },
  { id: "6", activityId: "SA-2036", time: "1:45P", date: "Jun 10", type: "Visit",   customer: "Frontier",       contact: "D. Park",      rep: "S. Vance",    subject: "Safety Audit",    outcome: { label: "Positive",  variant: "success" }, followUp: null,                                  status: { label: "Done", variant: "success" } },
  { id: "7", activityId: "SA-2035", time: "10:00A", date: "Jun 09", type: "Meeting",customer: "Summit",         contact: "L. Cho",       rep: "R. Crawford", subject: "Quote Review",    outcome: { label: "Neutral",   variant: "warning" }, followUp: { label: "Jun 16", variant: "success" }, status: { label: "Open", variant: "offline" } },
  { id: "8", activityId: "SA-2034", time: "2:00P", date: "Jun 09", type: "Call",    customer: "Vaquero",        contact: "B. Nunez",     rep: "S. Vance",    subject: "Follow-up",       outcome: { label: "Positive",  variant: "success" }, followUp: { label: "Jun 11", variant: "success" }, status: { label: "Done", variant: "success" } },
];

export const SALES_ACTIVITY_ROWS: SalesActivityRow[] = Array.from({ length: 32 }, (_, i) => {
  const base = BASE[i % BASE.length]!;
  const n = i + 1;
  return {
    ...base,
    id: String(n),
    activityId: `SA-${2041 - i}`,
  };
});

export const SALES_ACTIVITY_SORT_OPTIONS = [
  { id: "activityId", label: "Activity ID" },
  { id: "date",       label: "Date" },
  { id: "type",       label: "Type" },
  { id: "customer",   label: "Customer" },
  { id: "outcome",    label: "Outcome" },
  { id: "status",     label: "Status" },
];

export const SALES_ACTIVITY_SAVED_VIEWS = [
  { id: "view-1", label: "All Activity" },
  { id: "view-2", label: "Open Follow-ups" },
  { id: "view-3", label: "This Week" },
];

export const SALES_ACTIVITY_DETAIL = {
  id: "1",
  activityId: "SA-2041",
  status: { label: "Open", variant: "success" as DashboardBadgeVariant },
  meta: "SA-2041 · Call · Jun 12, 2:30P",
  customer: "Permian Basin Energy",
  type: "Call",
  contact: {
    name: "J. Whitfield",
    avatarUrl: "https://picsum.photos/seed/dhs-whitfield/64/64",
  },
  rep: "R. Crawford",
  subject: "Quote Follow-up",
  duration: "15 Min",
  date: "Jun 12 · 2:30P",
  outcome: { label: "Positive", variant: "success" as DashboardBadgeVariant },
  followUp: "Jun 15",
  nextAction: "Send Revised Quote",
  previousNote: {
    date: "Jun 10",
    text: "Called J. Whitfield to follow up on Quote Q-1042. Budget is approved; he needs final pricing on the H2S package before signing. Positive.",
  },
  linkedQuote: {
    id: "1",
    number: "Q-1042",
    title: "Pricing on the H2S Package",
    status: { label: "Pending", variant: "warning" as DashboardBadgeVariant },
  },
  related: [
    { label: "Opportunity", value: "$24,500" },
    { label: "Stage",       value: "Proposal" },
  ],
};

export const LOG_ACTIVITY_FORM = {
  types: [
    { value: "call",    label: "Call" },
    { value: "visit",   label: "Visit" },
    { value: "meeting", label: "Meeting" },
    { value: "email",   label: "Email" },
  ],
  durations: [
    { value: "15", label: "15 Min" },
    { value: "30", label: "30 Min" },
    { value: "45", label: "45 Min" },
    { value: "60", label: "60 Min" },
  ],
  outcomes: [
    { value: "positive",  label: "Positive" },
    { value: "neutral",   label: "Neutral" },
    { value: "no-answer", label: "No Answer" },
  ],
  subjects: [
    { id: "quote", label: "Quote" },
    { id: "call",  label: "Call" },
  ],
};
