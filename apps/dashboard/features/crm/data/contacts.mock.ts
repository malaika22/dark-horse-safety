import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const CONTACTS_KPI = [
  {
    title: "Total contacts",
    value: "11",
    meta: "+1 this month",
    icon: "customers" as StatIconName,
  },
  {
    title: "Primary contacts",
    value: "27",
    meta: "Per tech avg 31.1h",
    icon: "time" as StatIconName,
  },
  {
    title: "Missing email",
    value: "19",
    meta: "3 edits · 2 time off",
    icon: "edit" as StatIconName,
  },
  {
    title: "Missing phone",
    value: "2",
    meta: "BBS missing",
    icon: "wrench" as StatIconName,
  },
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
  primary: string;
  status: { label: string; variant: DashboardBadgeVariant };
};

export const CONTACTS_ROWS: ContactRow[] = [
  {
    id: "1",
    name: "James Whitfield",
    code: "CON-1001",
    customer: "Permian Basin Energy",
    role: "Operations mgr",
    email: "j.whitfield@pbe.com",
    phone: "(432) 555-0101",
    location: "Midland, TX",
    primary: "Primary",
    status: { label: "Active", variant: "success" },
  },
  {
    id: "2",
    name: "Sara Kim",
    code: "CON-1002",
    customer: "Apex Drilling Co",
    role: "AP / Billing",
    email: "s.kim@apexdrill.com",
    phone: "(432) 555-0144",
    location: "Odessa, TX",
    primary: "Primary",
    status: { label: "Active", variant: "success" },
  },
  {
    id: "3",
    name: "Marcus Soto",
    code: "CON-1003",
    customer: "West Pad Services",
    role: "Field ops",
    email: "m.soto@westpad.com",
    phone: "(432) 555-0190",
    location: "Andrews, TX",
    primary: "Secondary",
    status: { label: "Active", variant: "success" },
  },
  {
    id: "4",
    name: "Ava Quinn",
    code: "CON-1004",
    customer: "Basin Flow LLC",
    role: "Safety lead",
    email: "a.quinn@basinfl.com",
    phone: "(432) 555-0112",
    location: "Midland, TX",
    primary: "Secondary",
    status: { label: "Inactive", variant: "error" },
  },
  {
    id: "5",
    name: "Derek Hale",
    code: "CON-1005",
    customer: "Horizon Wireline",
    role: "Site supervisor",
    email: "d.hale@horizonwl.com",
    phone: "(432) 555-0177",
    location: "Hobbs, NM",
    primary: "Primary",
    status: { label: "Active", variant: "success" },
  },
  {
    id: "6",
    name: "Nina Park",
    code: "CON-1006",
    customer: "Red Rock Energy",
    role: "Contracts",
    email: "n.park@redrock.com",
    phone: "(432) 555-0166",
    location: "Carlsbad, NM",
    primary: "Secondary",
    status: { label: "Inactive", variant: "error" },
  },
];
