import type { DashboardBadgeVariant } from "@dark-horse-safety/ui";
import type {
  CrmContact,
  CrmCustomer,
  CrmEodReport,
  CrmFormRule,
  CrmLocation,
  CrmPricingRule,
  CrmQuote,
  CrmRequirement,
  CrmRouteRule,
  CrmSalesActivity,
  CrmUserRef,
} from "@/lib/crm-api";
import type {
  ContactRow,
  CustomerRow,
  EodReportRow,
  FormRuleRow,
  LocationCard,
  PricingRuleRow,
  QuoteRow,
  RequirementRow,
  RouteLocationCard,
  RouteRuleRow,
  SalesActivityRow,
} from "@/features/crm/crm-types";

function titleCaseStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function statusBadge(status: string): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  const label = titleCaseStatus(status);
  const s = status.toUpperCase();
  if (["ACTIVE", "COMPLETE", "SUBMITTED", "WON", "SENT", "MET"].includes(s)) {
    return { label, variant: "success" };
  }
  if (["PENDING", "NEEDS_REVIEW", "DRAFT", "OPEN"].includes(s)) {
    return { label, variant: "warning" };
  }
  if (["IN_PROGRESS"].includes(s)) {
    return { label, variant: "offline" };
  }
  if (["INACTIVE", "ARCHIVED", "EXPIRED", "LOST", "ON_HOLD"].includes(s)) {
    return { label, variant: s === "ON_HOLD" ? "billing" : "error" };
  }
  return { label, variant: "neutral" };
}

function userName(user?: CrmUserRef | null) {
  if (!user) return "—";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || "—";
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function money(value?: string | number | null) {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function mapCustomerRow(c: CrmCustomer): CustomerRow {
  return {
    id: c.id,
    name: c.name,
    code: c.code,
    accountOwner: userName(c.assignedRep),
    status: statusBadge(c.status),
    primaryContact: "—",
    openJobs: c.openJobs ?? 0,
    locations: c._count?.locations ?? 0,
    locationWell: "—",
    requirements: [],
    routeGps: [],
    createdAt: fmtDate(c.createdAt),
    lastActivity: fmtDate(c.lastActivityAt),
    msaExpiry: fmtDate(c.msaExpiry),
  };
}

export function mapContactRow(c: CrmContact): ContactRow {
  return {
    id: c.id,
    name: c.fullName,
    code: c.code,
    customer: c.primaryCustomer?.name ?? "—",
    role: c.roleTitle ?? "—",
    email: c.email ?? "—",
    phone: c.mobile ?? c.officePhone ?? "—",
    location: c.locationLabel ?? "—",
    primary: c.isPrimary ? "Primary" : "Secondary",
    status: statusBadge(c.status),
    lastActivity: fmtDate(c.lastActivityAt),
    assignedRep: userName(c.assignedRep),
    hasEmail: Boolean(c.email),
    hasPhone: Boolean(c.mobile || c.officePhone),
  };
}

export function mapLocationCard(l: CrmLocation): LocationCard {
  return {
    id: l.id,
    name: l.name,
    customer: l.customer?.name ?? "—",
    city: l.city ?? ([l.county, l.state].filter(Boolean).join(", ") || "—"),
    openJobs: l.openJobs ?? 0,
    gpsStatus: l.gpsRequired ? "GPS Set" : l.gpsStatus ?? "Not set",
    status: statusBadge(l.status),
  };
}

export function mapPricingRuleRow(r: CrmPricingRule): PricingRuleRow {
  return {
    id: r.id,
    customer: r.customer?.name ?? "—",
    code: r.code,
    service: r.serviceItem,
    status: statusBadge(r.status),
    rate: money(r.rate),
    unit: r.unit ?? "—",
    effective: fmtDate(r.effectiveFrom),
    expires: fmtDate(r.effectiveTo),
    owner: userName(r.owner),
  };
}

export function mapRequirementRow(r: CrmRequirement): RequirementRow {
  return {
    id: r.id,
    customer: r.customer?.name ?? "—",
    code: r.code,
    requirement: r.name,
    status: statusBadge(r.status),
    type: r.requirementType ?? "—",
    owner: userName(r.owner),
    due: fmtDate(r.dueDate),
    review: {
      label: r.reviewCycle ?? r.renewalPeriod ?? "—",
      variant: "neutral",
    },
    docs: {
      label: r.docsRequired || r.evidenceRequired ? "Required" : "Optional",
      variant: r.docsRequired || r.evidenceRequired ? "warning" : "success",
    },
  };
}

export function mapFormRuleRow(r: CrmFormRule): FormRuleRow {
  return {
    id: r.id,
    customer: r.customer?.name ?? "—",
    code: r.code,
    formTemplate: r.formTemplate,
    status: statusBadge(r.status),
    trigger: r.trigger ?? r.due ?? "—",
    hardGate: r.hardGate ? "Yes" : "No",
    appliesTo: r.appliesTo ?? r.jobType ?? "—",
    version: r.version ?? "—",
    owner: userName(r.owner),
  };
}

export function mapRouteRuleRow(r: CrmRouteRule): RouteRuleRow {
  return {
    id: r.id,
    customer: r.customer?.name ?? "—",
    code: r.code,
    location: r.location?.name ?? "—",
    status: statusBadge(r.status),
    route: r.routeLabel ?? r.routeFrom ?? "—",
    geofence: r.geofenceRadius ? "Enabled" : "—",
    radius: r.geofenceRadius ?? "—",
    gpsRequired: r.gpsRequired ? "Yes" : "No",
    owner: userName(r.owner),
  };
}

export function mapRouteLocationCard(r: CrmRouteRule): RouteLocationCard {
  return {
    id: r.id,
    name: r.location?.name ?? r.routeLabel ?? r.code,
    customer: r.customer?.name ?? "—",
    city: "—",
    openJobs: 0,
    gpsStatus: r.gpsRequired ? "GPS Set" : "Not set",
    status: statusBadge(r.status),
  };
}

export function mapEodReportRow(r: CrmEodReport): EodReportRow {
  const submitted = r.submittedAt ? new Date(r.submittedAt) : null;
  const time = submitted
    ? submitted.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  return {
    id: r.id,
    reportId: r.reportCode,
    submittedTime: time,
    date: fmtDate(r.reportDate),
    rep: userName(r.rep),
    activities: r.activitiesCount ?? 0,
    calls: String(r.callsCount ?? 0),
    callsDetail: r.callsDetail ?? "",
    visits: String(r.visitsCount ?? 0),
    visitsDetail: r.visitsDetail ?? "",
    meetings: String(r.meetingsCount ?? 0),
    meetingsBadge: r.meetingsNote
      ? { label: r.meetingsNote, variant: "error" }
      : null,
    quotes: r.quotesNote ? { label: r.quotesNote, variant: "success" } : null,
    pipeline: r.pipelineNote
      ? { label: r.pipelineNote, variant: "warning" }
      : null,
    status: statusBadge(r.status),
  };
}

export function mapSalesActivityRow(a: CrmSalesActivity): SalesActivityRow {
  const at = new Date(a.activityAt);
  return {
    id: a.id,
    activityId: a.activityCode,
    time: Number.isNaN(at.getTime())
      ? ""
      : at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    date: fmtDate(a.activityAt),
    type: a.type,
    customer: a.customer?.name ?? "—",
    contact: a.contact?.fullName ?? "—",
    rep: userName(a.rep),
    subject: a.subject ?? "—",
    outcome: a.outcome
      ? statusBadge(a.outcome.replace(/\s+/g, "_").toUpperCase())
      : { label: "—", variant: "neutral" },
    followUp: a.followUpAt
      ? { label: fmtDate(a.followUpAt), variant: "success" }
      : null,
    status: statusBadge(a.status),
  };
}

export function mapQuoteRow(q: CrmQuote): QuoteRow {
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    createdDate: fmtDate(q.createdAt),
    customer: q.customer?.name ?? "—",
    contact: q.contact?.fullName ?? "—",
    amount: money(q.amount),
    created: fmtDate(q.createdAt),
    createdDetail: "",
    expires: fmtDate(q.expiresAt),
    expiresDetail: "",
    owner: userName(q.owner),
    sent: q.sentAt
      ? { label: "Sent", variant: "review" }
      : null,
    status: statusBadge(q.status),
    approval: q.approvalStatus
      ? statusBadge(q.approvalStatus)
      : null,
  };
}
