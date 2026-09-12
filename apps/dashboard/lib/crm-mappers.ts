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
  if (["LATE", "PENDING", "NEEDS_REVIEW", "DRAFT", "OPEN"].includes(s)) {
    return { label: s === "LATE" ? "Late" : label, variant: "warning" };
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
    photoUrl: c.photoUrl ?? null,
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

function pricingStatusBadge(
  status: string,
  approvalStatus?: string | null,
): {
  label: string;
  variant: DashboardBadgeVariant;
} {
  if ((approvalStatus ?? "").toUpperCase() === "PENDING") {
    return { label: "Pending approval", variant: "warning" };
  }
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
    status: pricingStatusBadge(r.status, r.approvalStatus),
    rate: money(r.rate),
    unit: r.unit ?? "—",
    effective: fmtIsoDate(r.effectiveFrom),
    expires: fmtIsoDate(r.effectiveTo),
    owner: shortUserName(r.owner),
    approvalStatus: r.approvalStatus ?? null,
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
  if (!docsNeeded || s === "COMPLETE" || Boolean(r.evidenceUrl?.trim())) {
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
  const reportDay = r.reportDate ? new Date(r.reportDate) : null;
  const time = submitted
    ? submitted.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  const submittedLate =
    Boolean(submitted) &&
    !Number.isNaN(submitted!.getTime()) &&
    (submitted!.getHours() >= 18 ||
      (reportDay &&
        !Number.isNaN(reportDay.getTime()) &&
        submitted!.toDateString() !== reportDay.toDateString()));
  const rawStatus = (r.status || "").toUpperCase();
  const displayStatus =
    rawStatus === "PENDING" || rawStatus === "IN_PROGRESS"
      ? "PENDING"
      : submittedLate && (rawStatus === "SUBMITTED" || rawStatus === "COMPLETE")
        ? "LATE"
        : rawStatus;

  const quotesSent = r.quotesSent ?? 0;
  const quotesLabel =
    r.quotesNote?.trim() ||
    (quotesSent > 0 ? `${quotesSent} Sent` : "—");

  const pipelineVal =
    r.pipelineValue != null && r.pipelineValue !== ""
      ? Number(r.pipelineValue)
      : NaN;
  const pipelineLabel =
    r.pipelineNote?.trim() ||
    (Number.isFinite(pipelineVal) && pipelineVal > 0
      ? pipelineVal >= 1000
        ? `$${Math.round(pipelineVal / 1000)}K`
        : money(pipelineVal)
      : "—");

  const meetingsMissing =
    Boolean(r.meetingsNote?.trim()) ||
    ((r.meetingsCount ?? 0) === 0 &&
      (rawStatus === "PENDING" || rawStatus === "NEEDS_REVIEW"));

  const reviewMatch = r.notes?.match(/\[REVIEWED\]\s*(.+)/i);
  const ackMatch = r.notes?.match(/---ACK---\s*(\{[\s\S]*?\})\s*$/m);
  let ackBy: string | null = null;
  if (ackMatch?.[1]) {
    try {
      const parsed = JSON.parse(ackMatch[1]) as { by?: string };
      ackBy = parsed.by?.trim() || null;
    } catch {
      ackBy = null;
    }
  }
  const noteSnippet =
    reviewMatch?.[1]?.trim() ||
    ackBy ||
    (r.notes?.trim() && !r.notes.trim().startsWith("[") && !r.notes.includes("---ACK---")
      ? r.notes.trim().slice(0, 40)
      : "") ||
    r.activityLines?.[0]?.summary?.trim()?.slice(0, 28) ||
    "";

  let reviewed: EodReportRow["reviewed"] = {
    state: "awaiting",
    detail: "Awaiting",
  };
  if (reviewMatch || ackMatch || rawStatus === "COMPLETE") {
    reviewed = {
      state: "reviewed",
      detail: (noteSnippet || ackBy || "Acknowledged").toUpperCase(),
    };
  } else if (
    noteSnippet &&
    (displayStatus === "SUBMITTED" || displayStatus === "LATE")
  ) {
    reviewed = { state: "reviewed", detail: noteSnippet.toUpperCase() };
  }

  return {
    id: r.id,
    reportId: r.reportCode,
    submittedTime: time
      ? `Submitted ${time.replace(/\s/g, "").replace(/([AP])M$/i, "$1").toUpperCase()}`
      : "",
    date: fmtShortDate(r.reportDate),
    rep: shortUserName(r.rep),
    repId: r.rep?.id ?? null,
    activities: r.activitiesCount ?? 0,
    calls: String(r.callsCount ?? 0),
    callsDetail: r.callsDetail ?? "",
    visits: String(r.visitsCount ?? 0),
    visitsDetail: (r.visitsDetail ?? "").toUpperCase(),
    meetings: meetingsMissing ? "Missing" : String(r.meetingsCount ?? 0),
    meetingsMissing,
    quotesLabel: quotesLabel.toUpperCase(),
    pipelineLabel: pipelineLabel.toUpperCase(),
    status:
      displayStatus === "LATE"
        ? { label: "Late", variant: "warning" }
        : displayStatus === "PENDING" || displayStatus === "IN_PROGRESS"
          ? { label: "Missing", variant: "error" }
          : statusBadge(displayStatus),
    reviewed,
    rawStatus,
    submittedAt: r.submittedAt ?? null,
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

function fmtShortDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
}

function relativeFrom(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "1 Day Ago";
  if (days > 1) return `${days} Days Ago`;
  if (days === -1) return "In 1 Day";
  return `In ${Math.abs(days)} Days`;
}

function shortPersonName(full?: string | null) {
  if (!full?.trim()) return "—";
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.toUpperCase();
  return `${parts[0]![0]}. ${parts[parts.length - 1]}`.toUpperCase();
}

function quoteStatusBadge(
  status: string,
  approvalStatus?: string | null,
): { label: string; variant: DashboardBadgeVariant } {
  const s = status.toUpperCase();
  if (s === "WON") return { label: "Converted", variant: "gold" };
  if (s === "EXPIRED") return { label: "Expired", variant: "error" };
  if (s === "SENT") return { label: "Sent", variant: "billing" };
  if (s === "DRAFT") return { label: "Draft", variant: "operations" };
  if (
    s === "OPEN" ||
    s === "APPROVED" ||
    approvalStatus?.toUpperCase() === "APPROVED"
  ) {
    return { label: "Approved", variant: "success" };
  }
  return statusBadge(status);
}

function quoteApprovalLabel(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (!s || s === "NOT_REQUIRED") return "—";
  if (s === "PENDING") return "Pending";
  if (s === "APPROVED") return "Approved";
  if (s === "REJECTED") return "Rejected";
  return titleCaseStatus(status!);
}

export function mapQuoteRow(q: CrmQuote): QuoteRow {
  const expiresAt = q.expiresAt ?? null;
  const expired =
    Boolean(expiresAt) &&
    (q.status.toUpperCase() === "EXPIRED" ||
      new Date(expiresAt!).getTime() < Date.now());
  const amountNum =
    typeof q.amount === "number" ? q.amount : Number(q.amount);
  const approval = quoteApprovalLabel(q.approvalStatus);
  return {
    id: q.id,
    customerId: q.customer?.id ?? null,
    quoteNumber: q.quoteNumber,
    version: q.revision ? `V${q.revision}` : "V1",
    createdAt: q.createdAt,
    createdDate: fmtShortDate(q.createdAt),
    customer: q.customer?.name ?? "—",
    contact: shortPersonName(q.contact?.fullName),
    amount: money(q.amount),
    amountValue: Number.isFinite(amountNum) ? amountNum : 0,
    created: fmtShortDate(q.createdAt),
    createdDetail: relativeFrom(q.createdAt),
    expires: fmtShortDate(expiresAt),
    expiresDetail: expired
      ? `Expired ${relativeFrom(expiresAt)}`
      : relativeFrom(expiresAt),
    expiresExpired: expired,
    owner: shortPersonName(userName(q.owner) === "—" ? null : userName(q.owner)),
    status: quoteStatusBadge(q.status, q.approvalStatus),
    approval,
    approvedOn:
      approval === "Approved"
        ? fmtShortDate(q.updatedAt ?? q.sentAt ?? q.createdAt)
        : "—",
  };
}

/** Assign V1..Vn within each customer by created order (oldest = V1). */
export function assignQuoteVersions(rows: QuoteRow[]): QuoteRow[] {
  const byCustomer = new Map<string, QuoteRow[]>();
  for (const row of rows) {
    const key = row.customerId ?? row.id;
    const list = byCustomer.get(key) ?? [];
    list.push(row);
    byCustomer.set(key, list);
  }
  const versionById = new Map<string, string>();
  for (const list of byCustomer.values()) {
    const ordered = [...list].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    ordered.forEach((row, i) => {
      versionById.set(row.id, `V${i + 1}`);
    });
  }
  return rows.map((row) => ({
    ...row,
    version: versionById.get(row.id) ?? row.version,
  }));
}
