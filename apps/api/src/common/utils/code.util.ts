/** Sequential human-readable codes: CUST-000001, CON-000042, etc. */
export function formatEntityCode(prefix: string, sequence: number) {
  return `${prefix}-${String(sequence).padStart(6, '0')}`;
}

export const CRM_CODE_PREFIX = {
  customer: 'CUST',
  contact: 'CON',
  location: 'LOC',
  pricingRule: 'PR',
  requirement: 'REQ',
  formRule: 'FR',
  routeRule: 'RR',
  eodReport: 'EOD',
  salesActivity: 'SA',
  quote: 'Q',
  workOrder: 'WO',
} as const;
