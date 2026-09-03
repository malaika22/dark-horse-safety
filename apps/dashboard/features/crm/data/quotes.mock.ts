import type { DashboardBadgeVariant, StatIconName } from "@dark-horse-safety/ui";

export const QUOTES_KPI = [
  { title: "Draft",     value: "38", meta: "Open Drafts",        icon: "lightning"  as StatIconName },
  { title: "Sent",      value: "3",  meta: "Awaiting Response",  icon: "document"   as StatIconName },
  { title: "Approved",  value: "2",  meta: "Ready to Convert",   icon: "folder"     as StatIconName },
  { title: "Expired",   value: "1",  meta: "Need Renewal",       icon: "document"   as StatIconName },
  { title: "Converted", value: "1",  meta: "Won",                icon: "document"   as StatIconName },
];

export type QuoteRow = {
  id: string;
  quoteNumber: string;
  createdDate: string;
  customer: string;
  contact: string;
  amount: string;
  created: string;
  createdDetail: string;
  expires: string;
  expiresDetail: string;
  owner: string;
  sent: { label: string; variant: DashboardBadgeVariant } | null;
  status: { label: string; variant: DashboardBadgeVariant };
  approval: { label: string; variant: DashboardBadgeVariant } | null;
};

const BASE_QUOTES: QuoteRow[] = [
  { id: "1", quoteNumber: "Q-1042", createdDate: "Jun 12", customer: "Permian Basin",  contact: "J. Whitfield",  amount: "$24,500", created: "Jun 12", createdDetail: "2 Days", expires: "Jul 12",  expiresDetail: "Traveling", owner: "R. Crowfo...", sent: { label: "Sent",      variant: "review"  }, status: { label: "Pending",    variant: "warning" }, approval: { label: "Jun 12", variant: "offline" } },
  { id: "2", quoteNumber: "Q-1041", createdDate: "Jun 11", customer: "Lonestar",       contact: "M. Reyes",      amount: "$18,200", created: "Jun 11", createdDetail: "6 Days", expires: "Jul 11",  expiresDetail: "On Site",    owner: "R. Crawford",  sent: { label: "Approved",  variant: "success" }, status: { label: "Approved",   variant: "success" }, approval: { label: "Jun 11", variant: "success" } },
  { id: "3", quoteNumber: "Q-1040", createdDate: "Jun 10", customer: "Cactus Well",    contact: "T. Boone",      amount: "$42,000", created: "Jun 10", createdDetail: "6 Days", expires: "Jul 10",  expiresDetail: "Completed", owner: "S. Vance",     sent: { label: "Draft",     variant: "neutral" }, status: { label: "Draft",      variant: "neutral" }, approval: null },
  { id: "4", quoteNumber: "Q-1039", createdDate: "Jun 09", customer: "Rio Grande",     contact: "P. Alvarez",    amount: "$9,800",  created: "Jun 09", createdDetail: "6 Days", expires: "Jul 09",  expiresDetail: "Traveling", owner: "R. Crowfo...", sent: { label: "Sent",      variant: "review"  }, status: { label: "Pending",    variant: "warning" }, approval: { label: "Jun 09", variant: "offline" } },
  { id: "5", quoteNumber: "Q-1038", createdDate: "Jun 08", customer: "Delaware",       contact: "K. Osei",       amount: "$31,400", created: "Jun 08", createdDetail: "6 Days", expires: "Jul 08",  expiresDetail: "Completed", owner: "S. Vance",     sent: { label: "Approved",  variant: "success" }, status: { label: "Approved",   variant: "success" }, approval: { label: "Jun 08", variant: "success" } },
  { id: "6", quoteNumber: "Q-1037", createdDate: "Jun 07", customer: "Frontier",       contact: "D. Park",       amount: "$15,600", created: "Jun 07", createdDetail: "6 Days", expires: "Jul 07",  expiresDetail: "Completed", owner: "R. Crowfo...", sent: null,                                        status: { label: "Expired",    variant: "error"   }, approval: { label: "Jun 07", variant: "offline" } },
  { id: "7", quoteNumber: "Q-1036", createdDate: "Jun 06", customer: "Summit",         contact: "L. Cho",        amount: "$27,900", created: "Jun 06", createdDetail: "6 Days", expires: "Jul 06",  expiresDetail: "Completed", owner: "S. Vance",     sent: { label: "Sent",      variant: "review"  }, status: { label: "Pending",    variant: "warning" }, approval: { label: "Jun 06", variant: "offline" } },
  { id: "8", quoteNumber: "Q-1035", createdDate: "Jun 05", customer: "Vaquero",        contact: "B. Nunez",      amount: "$12,300", created: "Jun 05", createdDetail: "6 Days", expires: "Jul 05",  expiresDetail: "On Site",    owner: "R. Crowfo...", sent: { label: "Converted", variant: "info"    }, status: { label: "Approved",   variant: "success" }, approval: { label: "Jun 05", variant: "offline" } },
];

export const QUOTES_ROWS: QuoteRow[] = Array.from({ length: 32 }, (_, i) => {
  const base = BASE_QUOTES[i % BASE_QUOTES.length]!;
  const n = i + 1;
  const qNum = 1042 - i;
  return {
    ...base,
    id: String(n),
    quoteNumber: `Q-${qNum}`,
    customer: i < BASE_QUOTES.length ? base.customer : `${base.customer} ${Math.floor(i / BASE_QUOTES.length) + 1}`,
  };
});

export const QUOTES_SORT_OPTIONS = [
  { id: "quoteNumber", label: "Quote #" },
  { id: "customer",    label: "Customer" },
  { id: "amount",      label: "Value" },
  { id: "status",      label: "Status" },
  { id: "created",     label: "Created" },
  { id: "expires",     label: "Expires" },
  { id: "owner",       label: "Rep" },
];

export const QUOTES_SAVED_VIEWS = [
  { id: "view-1", label: "All Quotes" },
  { id: "view-2", label: "Open Drafts" },
  { id: "view-3", label: "Sent / Pending" },
];

export type QuoteLineItem = {
  id: string;
  item: string;
  qty: string;
  rate: string;
  amount: string;
};

export const QUOTE_DETAIL = {
  id: "1",
  quoteNumber: "Q-1042",
  status: { label: "Sent", variant: "review" as DashboardBadgeVariant },
  contact: {
    name: "J. Whitfield",
    role: "Operations Manager",
    avatarUrl: "https://picsum.photos/seed/dhs-whitfield/64/64",
    company: "Permian Basin Energy",
    email: "jwhitfield@permianbasin.co",
    phone: "(432) 555-0110",
    billingAddress: "1200 Energy Plaza, Midland, TX 79701",
  },
  details: [
    { label: "Quote #",     value: "Q-1042" },
    { label: "Created",     value: "Jun 12, 2026" },
    { label: "Valid Until", value: "Jul 12, 2026" },
    { label: "Owner",       value: "R. Crawford" },
    { label: "Status",      value: "Sent" },
  ],
  lineItems: [
    { id: "li-1", item: "Site Safety Technician (Per Hour)", qty: "100", rate: "$160.00",  amount: "$16,000.00" },
    { id: "li-2", item: "H2S Monitoring Package",            qty: "1",   rate: "$5,000.00", amount: "$5,000.00" },
    { id: "li-3", item: "Equipment · Gas Monitor MX6",       qty: "1",   rate: "$2,200.00", amount: "$2,200.00" },
    { id: "li-4", item: "Mileage · Round Trip",              qty: "1",   rate: "$1,300.00", amount: "$1,300.00" },
  ] as QuoteLineItem[],
  totals: [
    { label: "Subtotal",  value: "$24,500.00" },
    { label: "Tax (0%)",  value: "$0.00" },
    { label: "Total",     value: "$24,500.00" },
  ],
  terms: [
    { label: "Valid Until",     value: "Jul 12, 2026" },
    { label: "Payment Terms",   value: "Net 30" },
    { label: "Discount",        value: "0%" },
    { label: "Tax",             value: "0%" },
  ],
  preview: {
    company: "Dark Horse Display",
    address: "1450 Oilfield Rd, Midland, TX 79701",
    phone: "(432) 555-0100",
    website: "darkhorsesafety.com",
    billToName: "Permian Basin Energy",
    billToContact: "J. Whitfield · Operations Manager",
    billToAddress: "1200 Energy Plaza, Midland, TX 79701",
    termsCopy:
      "Quote valid for 30 days from the date above. Prices subject to change after expiry. Work scheduled upon signed acceptance.",
    thankYou: "Thank you for the opportunity to serve Permian Basin Energy.",
  },
};
