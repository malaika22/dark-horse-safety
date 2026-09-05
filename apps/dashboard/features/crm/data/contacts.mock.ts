import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const CONTACTS_KPI = [
  { title: "Total Contacts",    value: "11", meta: "+1 This Month",          icon: "customers" as StatIconName },
  { title: "Primary Contacts",  value: "27", meta: "Per Tech Avg 31.1H",     icon: "time"      as StatIconName },
  { title: "Missing Email",     value: "19", meta: "3 Edits · 2 Time Off",   icon: "edit"      as StatIconName },
  { title: "Missing Phone",     value: "2",  meta: "BBS Missing",             icon: "wrench"    as StatIconName },
];

export type ContactRow = {
  id: string;
  name: string;
  code: string;
  customer: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  primary: "Primary" | "Secondary";
  status: { label: string; variant: DashboardBadgeVariant };
  lastActivity: string;
  assignedRep: string;
  hasEmail: boolean;
  hasPhone: boolean;
};

const BASE_CONTACTS: ContactRow[] = [
  { id: "1",  name: "James Whitfield",  code: "CON-1001", customer: "Permian Basin Energy",   role: "Operations MGR",  email: "jwhitfield@permianbasin.c",  phone: "(432) 555-0110", location: "Midland, TX",   primary: "Primary",   status: { label: "Active",   variant: "success" }, lastActivity: "2026-06-12", assignedRep: "R. Crawford", hasEmail: true,  hasPhone: true  },
  { id: "2",  name: "Sarah Delgado",    code: "CON-1002", customer: "Lonestar Oilfield",       role: "Safety Lead",     email: "sdelgado@lonestar.com",       phone: "(325) 555-0182", location: "Odessa, TX",    primary: "Secondary", status: { label: "Active",   variant: "success" }, lastActivity: "2026-06-10", assignedRep: "M. Torres",   hasEmail: true,  hasPhone: true  },
  { id: "3",  name: "Mark Reyes",       code: "CON-1003", customer: "Cactus Well Services",    role: "Field Super",     email: "mreyes@cactusws.com",         phone: "(432) 555-0..." , location: "Pecos, TX",     primary: "Primary",   status: { label: "Active",   variant: "success" }, lastActivity: "2026-06-08", assignedRep: "R. Crawford", hasEmail: true,  hasPhone: true  },
  { id: "4",  name: "Angela Cook",      code: "CON-1004", customer: "Rio Grande Resources",    role: "AP Contact",      email: "acook@riograndede.com",       phone: "(915) 555-0176", location: "El Paso, TX",   primary: "Secondary", status: { label: "Inactive", variant: "error"   }, lastActivity: "2026-05-20", assignedRep: "M. Torres",   hasEmail: true,  hasPhone: true  },
  { id: "5",  name: "Derek Nolan",      code: "CON-1005", customer: "Delaware Basin Co.",      role: "Company MAN",     email: "dnolan@delawarebasin.com",    phone: "(432) 555-0..." , location: "Pecos, TX",     primary: "Primary",   status: { label: "Active",   variant: "success" }, lastActivity: "2026-06-11", assignedRep: "R. Crawford", hasEmail: true,  hasPhone: true  },
  { id: "6",  name: "Priya Shah",       code: "CON-1006", customer: "Frontier Energy LLC",     role: "Procurement",     email: "pshah@frontierenergy.com",    phone: "(505) 555-0121", location: "Carlsbad, NM",  primary: "Secondary", status: { label: "Active",   variant: "success" }, lastActivity: "2026-06-09", assignedRep: "L. Nguyen",   hasEmail: true,  hasPhone: true  },
  { id: "7",  name: "Luis Ortega",      code: "CON-1007", customer: "Summit Production",       role: "HSE Manager",     email: "lortega@summitprod.com",      phone: "(432) 555-0..." , location: "Big Spring, TX", primary: "Primary",  status: { label: "Active",   variant: "success" }, lastActivity: "2026-06-07", assignedRep: "M. Torres",   hasEmail: true,  hasPhone: true  },
  { id: "8",  name: "Karen Mills",      code: "CON-1008", customer: "Vaquero Oil & Gas",       role: "Dispatcher",      email: "kmills@vaquero.com",          phone: "(361) 555-0139", location: "Alice, TX",     primary: "Secondary", status: { label: "Inactive", variant: "error"   }, lastActivity: "2026-04-15", assignedRep: "L. Nguyen",   hasEmail: true,  hasPhone: true  },
];

export const CONTACTS_ROWS: ContactRow[] = Array.from({ length: 32 }, (_, i) => {
  const base = BASE_CONTACTS[i % BASE_CONTACTS.length]!;
  const n = i + 1;
  return {
    ...base,
    id: String(n),
    code: `CON-${1000 + n}`,
    name: i < BASE_CONTACTS.length ? base.name : `${base.name} ${Math.floor(i / BASE_CONTACTS.length) + 1}`,
  };
});

export const CONTACTS_SORT_OPTIONS = [
  { id: "name",          label: "Contact Name" },
  { id: "customer",      label: "Customer" },
  { id: "role",          label: "Role" },
  { id: "location",      label: "Location" },
  { id: "lastActivity",  label: "Last Activity" },
  { id: "status",        label: "Status" },
];

export const CONTACTS_SAVED_VIEWS = [
  { id: "view-1", label: "All Contacts" },
  { id: "view-2", label: "Primary Only" },
  { id: "view-3", label: "Missing Email" },
];

/* ── contact detail mock ── */
export const CONTACT_DETAIL = {
  id: "1",
  name: "J. Whitfield",
  fullName: "J. Whitfield",
  role: "Operations Manager",
  avatar: "https://picsum.photos/seed/jwhitfield/64/64",
  badge: "Primary Contact" as const,
  customer: "Permian Basin Energy",
  customerStatus: "Active",
  email: "jwhitfield@permianbasin.c",
  phone: "(432) 555-0110",
  mobile: "(432) 555-0111",
  location: "Midland, TX",
  preferred: "Email",
};

export const CONTACT_RELATED = [
  { label: "Open Quotes",        value: "Q-1042 · $24,500", highlight: false },
  { label: "Won Deals",          value: "3", highlight: false },
  { label: "Open Opportunities", value: "$24,500", highlight: false },
  { label: "Lifetime Value",     value: "$182,400", highlight: true },
];

export type ContactActivity = {
  id: string;
  code: string;
  type: string;
  date: string;
  subject: string;
  status: string;
};

export const CONTACT_ACTIVITY: ContactActivity[] = [
  { id: "1", code: "SA-2041", type: "Call",  date: "Jun 12", subject: "Quote Follow-up", status: "Positive" },
  { id: "2", code: "SA-2037", type: "Call",  date: "Jun 10", subject: "Intro Call",      status: "No Answer" },
  { id: "3", code: "SA-2019", type: "Email", date: "Jun 02", subject: "Proposal Sent",   status: "" },
];

export const CONTACT_NOTES =
  "Decision-maker for safety services. Budget approved for Q-1042; needs final H2S pricing before signing.";

export const CONTACT_CUSTOMERS = [
  { id: "1", name: "Permian Basin Energy", primary: true },
  { id: "2", name: "West Texas Well Services", primary: false },
  { id: "3", name: "Cactus Midstream", primary: false },
];

export type ContactDetailTab = "overview" | "activity" | "quotes" | "work-orders" | "customers";

export const CONTACT_DETAIL_TABS: { id: ContactDetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "quotes", label: "Quotes" },
  { id: "work-orders", label: "Work Orders" },
  { id: "customers", label: "Customers" },
];
