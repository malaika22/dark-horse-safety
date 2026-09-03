"use client";

import {
  CrmAccountSetupHealth,
  CrmEodComplianceCard,
  CrmFieldEventsWeek,
  CrmMsaRenewalList,
  CrmQuotePipelinePanel,
  CrmRepPerformanceTable,
  CrmSalesActivityList,
  CrmWidgetSection,
} from "./crm-dashboard-widgets";

export function CrmDashboardOverview() {
  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(240px,1fr)] lg:gap-5">
        <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
          <CrmWidgetSection title="Eod compliance">
            <CrmEodComplianceCard />
          </CrmWidgetSection>

          <CrmWidgetSection
            title="Rep performance"
            actionLabel="View manager summary"
          >
            <CrmRepPerformanceTable />
          </CrmWidgetSection>

          <CrmWidgetSection
            title="Recent sales activity"
            actionLabel="View system feed"
          >
            <CrmSalesActivityList />
          </CrmWidgetSection>

          <CrmWidgetSection title="Msa renewals">
            <CrmMsaRenewalList />
          </CrmWidgetSection>
        </div>

        <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
          <CrmWidgetSection title="Events today in the field">
            <CrmFieldEventsWeek />
          </CrmWidgetSection>

          <CrmWidgetSection title="Quote pipeline" actionLabel="View crm">
            <CrmQuotePipelinePanel />
          </CrmWidgetSection>

          <CrmWidgetSection title="Account setup health">
            <CrmAccountSetupHealth />
          </CrmWidgetSection>
        </div>
      </div>
    </div>
  );
}
