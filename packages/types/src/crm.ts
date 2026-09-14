/** Shared CRM API contracts — list/export/saved views. */

export type CrmSortDirection = 'asc' | 'desc';

export type CrmListQuery = {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: CrmSortDirection;
};

export type CrmExportQuery = CrmListQuery & {
  format?: 'csv' | 'pdf';
  /** Comma-separated or array of selected row IDs */
  ids?: string | string[];
};

export type CrmExportResult = {
  csv: string;
  filename: string;
};

export type CrmSavedViewScope =
  | 'CUSTOMERS'
  | 'CONTACTS'
  | 'LOCATIONS'
  | 'PRICING_RULES'
  | 'REQUIREMENTS'
  | 'FORM_RULES'
  | 'ROUTE_RULES'
  | 'EOD_REPORTS'
  | 'SALES_ACTIVITIES'
  | 'QUOTES';

export type CrmLookupOption = {
  value: string;
  label: string;
};
