import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export type StatusBadge = {
  label: string;
  variant: DashboardBadgeVariant;
};

export type CustomerRow = {
  id: string;
  name: string;
  code: string;
  accountOwner: string;
  status: StatusBadge;
  primaryContact: string;
  openJobs: number;
  locations: number;
  locationWell: string;
  requirements: StatusBadge[];
  routeGps: StatusBadge[];
  createdAt: string;
  lastActivity: string;
  msaExpiry: string;
};

export type ContactRow = {
  id: string;
  name: string;
  code: string;
  customer: string;
  primaryCustomerId?: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  primary: "Primary" | "Secondary";
  status: StatusBadge;
  lastActivity: string;
  assignedRep: string;
  hasEmail: boolean;
  hasPhone: boolean;
  photoUrl?: string | null;
};

export type LocationCard = {
  id: string;
  name: string;
  customer: string;
  customerId?: string;
  city: string;
  openJobs: number;
  gpsStatus: string;
  gpsSet: boolean;
  geofenceRadius?: string;
  latitude?: number | null;
  longitude?: number | null;
  lastVisited?: string | null;
  reqMet: "MET" | "PARTIAL" | "MISSING";
  apiNumber?: string | null;
  siteContact?: string | null;
  notes?: string | null;
  county?: string | null;
  state?: string | null;
  routeLabel?: string | null;
  status: StatusBadge;
};

export type MapPin = {
  id: string;
  label: string;
  x: number;
  y: number;
  active: boolean;
};

export type PricingRuleRow = {
  id: string;
  customer: string;
  customerId?: string;
  code: string;
  service: string;
  status: StatusBadge;
  rate: string;
  unit: string;
  effective: string;
  expires: string;
  owner: string;
  approvalStatus?: string | null;
};

export type RequirementRow = {
  id: string;
  customer: string;
  customerId?: string;
  code: string;
  requirement: string;
  status: StatusBadge;
  type: string;
  enforcement: StatusBadge;
  owner: string;
  due: string;
  evidence: StatusBadge;
};

export type FormRuleRow = {
  id: string;
  customer: string;
  customerId?: string;
  code: string;
  formTemplate: string;
  jobType: string;
  status: StatusBadge;
  trigger: string;
  enforcement: StatusBadge;
  appliesTo: string;
  version: string;
  owner: string;
  dueBy: string;
  blocksPayroll: StatusBadge;
};

export type RouteRuleRow = {
  id: string;
  customer: string;
  customerId?: string;
  code: string;
  location: string;
  status: StatusBadge;
  route: string;
  geofence: string;
  radius: string;
  gpsRequired: string;
  owner: string;
};

export type RouteLocationCard = {
  id: string;
  name: string;
  customer: string;
  customerId?: string;
  locationId?: string;
  geofenceRadius?: string;
  city: string;
  openJobs: number;
  gpsStatus: string;
  status: StatusBadge;
};

export type RouteMapPin = {
  id: string;
  label: string;
  x: number;
  y: number;
  geofenced: boolean;
};

export type BadgeCell = StatusBadge | null;

export type EodReportRow = {
  id: string;
  reportId: string;
  submittedTime: string;
  date: string;
  rep: string;
  repId: string | null;
  activities: number;
  calls: string;
  callsDetail: string;
  visits: string;
  visitsDetail: string;
  meetings: string;
  meetingsMissing: boolean;
  quotesLabel: string;
  pipelineLabel: string;
  status: StatusBadge;
  reviewed: { state: "reviewed" | "awaiting"; detail: string };
  rawStatus: string;
  submittedAt: string | null;
};

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
  outcome: StatusBadge;
  followUp: StatusBadge | null;
  status: StatusBadge;
};

export type QuoteRow = {
  id: string;
  customerId: string | null;
  quoteNumber: string;
  version: string;
  createdAt: string;
  createdDate: string;
  customer: string;
  contact: string;
  amount: string;
  amountValue: number;
  created: string;
  createdDetail: string;
  expires: string;
  expiresDetail: string;
  expiresExpired: boolean;
  owner: string;
  status: StatusBadge;
  approval: string;
  approvedOn: string;
};

export type CustomerDetail = {
  id: string;
  name: string;
  code: string;
  status: StatusBadge;
  accountOwner: string;
  email: string;
  phone: string;
  imageUrl: string;
  industry: string;
  billingAddress: string;
  primaryContact: string;
  customerSince: string;
  maxClockInRadius: boolean;
  radiusMiles: string;
};

export type KpiCell = {
  title: string;
  value: string;
  meta?: string;
  icon: StatIconName;
};

export type SortOption = { id: string; label: string };
