import type { DashboardBadgeVariant } from "@dark-horse-safety/ui";
import type {
  CrmContact,
  CrmCustomerListItem,
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

export function mapCustomerRow(c: CrmCustomerListItem): CustomerRow {
  const primaryContact =
    c.contacts?.find((x) => x.isPrimary)?.fullName ??
    c.contacts?.[0]?.fullName ??
    "—";
  const locationWell = c.locations?.[0]?.name ?? "—";
  const requirements = (c.requirements ?? []).map((r) => ({
    label: r.name.toUpperCase(),
    variant:
      r.enforcementLevel === "HARD_GATE"
        ? ("error" as const)
        : statusBadge(r.status).variant,
  }));
  const routeGps = (c.routeRules ?? []).map((r) => {
    if (r.gpsRequired) {
      return {
        label: (r.routeLabel?.trim() || "GPS REQUIRED").toUpperCase(),
        variant: "success" as const,
      };
    }
    if (r.geofenceRadius) {
      return {
        label: `GEOFENCE ${r.geofenceRadius}`.toUpperCase(),
        variant: "offline" as const,
      };
    }
    return {
      label: (r.routeLabel?.trim() || statusBadge(r.status ?? "ACTIVE").label).toUpperCase(),
      variant: statusBadge(r.status ?? "ACTIVE").variant,
    };
  });

  return {
    id: c.id,
    name: c.name,
    code: c.code,
    accountOwner: userName(c.assignedRep),
    status: statusBadge(c.status),
    primaryContact,
    openJobs: c.openJobs ?? 0,
    locations: c._count?.locations ?? c.locations?.length ?? 0,
    locationWell,
    requirements,
    routeGps,
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
    primaryCustomerId: c.primaryCustomerId ?? c.primaryCustomer?.id ?? undefined,
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
  const hasCoords = l.latitude != null && l.longitude != null;
  const gpsMissing =
    !hasCoords ||
    /missing|not set|unset|offline/i.test(l.gpsStatus ?? "");
  const gpsSet = !gpsMissing;
  const hasGeo = Boolean(l.geofenceRadius?.trim());
  const hasApi = Boolean(l.apiNumber?.trim());
  const score = [gpsSet, hasGeo, hasApi].filter(Boolean).length;
  const reqMet =
    score === 3 ? "MET" : score === 0 ? "MISSING" : ("PARTIAL" as const);
  const lastWo = l.workOrders?.[0];
  const lastVisited =
    lastWo?.serviceDate ?? lastWo?.createdAt ?? l.updatedAt ?? l.createdAt;
  const route = l.routeRules?.[0];

  return {
    id: l.id,
    name: l.name,
    customer: l.customer?.name ?? "—",
    customerId: l.customerId ?? l.customer?.id,
    city: l.city ?? ([l.county, l.state].filter(Boolean).join(", ") || "—"),
    openJobs: l.openJobs ?? 0,
    gpsStatus: gpsMissing ? "GPS Missing" : "GPS Set",
    gpsSet: !gpsMissing,
    geofenceRadius: l.geofenceRadius ?? undefined,
    latitude: l.latitude,
    longitude: l.longitude,
    lastVisited,
    reqMet,
    apiNumber: l.apiNumber,
    siteContact: l.siteContact,
    notes: l.accessNotes,
    county: l.county,
    state: l.state,
    routeLabel: route?.routeLabel ?? route?.code ?? null,
    status: statusBadge(l.status),
  };
}

function shortUserName(user?: CrmUserRef | null) {
  if (!user) return "—";
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first.charAt(0)}. ${last}`.toUpperCase();
  return (first || last || user.email || "—").toUpperCase();
}

function fmtIsoDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
}

function pricingStatusBadge(status: string): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  const label = titleCaseStatus(status);
  const s = status.toUpperCase();
  if (s === "ACTIVE") return { label, variant: "success" };
  if (s === "EXPIRED") return { label, variant: "employee" };
  if (s === "PENDING" || s === "DRAFT" || s === "NEEDS_REVIEW") {
    return { label, variant: "offline" };
  }
  return statusBadge(status);
}

export function mapPricingRuleRow(r: CrmPricingRule): PricingRuleRow {
  return {
    id: r.id,
    customer: r.customer?.name ?? "—",
    customerId: r.customerId ?? r.customer?.id,
    code: r.code,
    service: r.serviceItem,
    status: pricingStatusBadge(r.status),
    rate: money(r.rate),
    unit: r.unit ?? "—",
    effective: fmtIsoDate(r.effectiveFrom),
    expires: fmtIsoDate(r.effectiveTo),
    owner: shortUserName(r.owner),
  };
}

export function mapRequirementRow(r: CrmRequirement): RequirementRow {
  return {
    id: r.id,
    customer: r.customer?.name ?? "—",
    customerId: r.customerId ?? r.customer?.id,
    code: r.code,
    requirement: r.name,
    status: requirementStatusBadge(r),
    type: (r.requirementType ?? "—").toUpperCase(),
    enforcement: requirementEnforcementBadge(r.enforcementLevel),
    owner: shortUserName(r.owner),
    due: fmtIsoDate(r.dueDate),
    evidence: requirementEvidenceBadge(r),
  };
}

function requirementStatusBadge(r: CrmRequirement): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  const s = (r.status ?? "").toUpperCase();
  const due = r.dueDate ? new Date(r.dueDate) : null;
  const now = new Date();
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const docsNeeded = Boolean(r.docsRequired || r.evidenceRequired);

  if (
    s === "EXPIRED" ||
    (due != null && !Number.isNaN(due.getTime()) && due >= now && due <= in30)
  ) {
    return { label: "EXPIRING", variant: "warning" };
  }
  if (docsNeeded && s !== "COMPLETE") {
    return { label: "MISSING", variant: "error" };
  }
  if (s === "COMPLETE" || s === "ACTIVE") {
    return { label: "MET", variant: "success" };
  }
  return { label: "NOT MET", variant: "error" };
}

function requirementEvidenceBadge(r: CrmRequirement): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  const s = (r.status ?? "").toUpperCase();
  const due = r.dueDate ? new Date(r.dueDate) : null;
  const now = new Date();
  const docsNeeded = Boolean(r.docsRequired || r.evidenceRequired);

  if (
    due != null &&
    !Number.isNaN(due.getTime()) &&
    due < now &&
    s !== "COMPLETE"
  ) {
    return { label: "OVERDUE", variant: "error" };
  }
  if (!docsNeeded || s === "COMPLETE") {
    return { label: "ON FILE", variant: "success" };
  }
  if (s === "PENDING" || s === "NEEDS_REVIEW" || s === "IN_PROGRESS") {
    return { label: "PENDING", variant: "warning" };
  }
  return { label: "MISSING", variant: "error" };
}

function requirementEnforcementBadge(level?: string | null): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  const s = (level ?? "").toUpperCase();
  if (s === "HARD_GATE") return { label: "HARD GATE", variant: "error" };
  if (s === "SOFT_GATE") return { label: "WARNING", variant: "warning" };
  return { label: "INFORMATIONAL", variant: "neutral" };
}

export function mapFormRuleRow(r: CrmFormRule): FormRuleRow {
  return {
    id: r.id,
    customer: r.customer?.name ?? "—",
    customerId: r.customerId,
    code: r.code,
    formTemplate: (r.formTemplate ?? "—").toUpperCase(),
    jobType: r.jobType ?? r.appliesTo ?? "—",
    status: formRuleStatusBadge(r.status),
    trigger: (r.trigger ?? "—").toUpperCase(),
    enforcement: formRuleEnforcementBadge(r.hardGate, r.blocksToggle),
    appliesTo: (r.appliesTo ?? r.jobType ?? "—").toUpperCase(),
    version: formatFormRuleVersion(r.version),
    owner: shortUserName(r.owner),
    dueBy: (r.due ?? "—").toUpperCase(),
    blocksPayroll: formRuleBlocksPayrollBadge(r.blocksToggle),
  };
}

function formRuleStatusBadge(status: string): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE") return { label: "ACTIVE", variant: "success" };
  if (s === "INACTIVE") return { label: "INACTIVE", variant: "employee" };
  if (s === "DRAFT") return { label: "DRAFT", variant: "offline" };
  return statusBadge(status);
}

function formRuleEnforcementBadge(
  hardGate?: boolean,
  blocksToggle?: boolean,
): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  if (hardGate) return { label: "HARD GATE", variant: "billing" };
  if (blocksToggle) return { label: "WARNING", variant: "warning" };
  return { label: "INFORMATIONAL", variant: "neutral" };
}

function formRuleBlocksPayrollBadge(blocks?: boolean): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  if (blocks) return { label: "YES", variant: "gold" };
  return { label: "NO", variant: "neutral" };
}

function formatFormRuleVersion(version?: string | null) {
  if (!version?.trim()) return "—";
  const v = version.trim().toUpperCase();
  return v.startsWith("V") ? v : `V${v}`;
}

export function mapRouteRuleRow(r: CrmRouteRule): RouteRuleRow {
  return {
    id: r.id,
    customer: r.customer?.name ?? "—",
    customerId: r.customerId,
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
    customerId: r.customerId,
    locationId: r.locationId ?? r.location?.id ?? undefined,
    geofenceRadius: r.geofenceRadius ?? undefined,
    city: r.location?.city?.trim() || "—",
    openJobs: r.location?.openJobs ?? 0,
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
