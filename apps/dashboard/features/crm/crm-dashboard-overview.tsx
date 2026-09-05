"use client";

import { useRouter } from "next/navigation";
import {
  CrmAccountSetupHealth,
  CrmDashboardDataProvider,
  CrmEodComplianceCard,
  CrmFieldEventsWeek,
  CrmMsaRenewalList,
  CrmQuotePipelinePanel,
  CrmRepPerformanceTable,
  CrmSalesActivityList,
  CrmWidgetSection,
} from "./crm-dashboard-widgets";

/**
 * Widget action labels match the main control-center dashboard naming
 * (`View reports`, `View all`, `View operations`, `View crm`) and route
 * to the CRM/ops APIs those sections represent.
 */
export function CrmDashboardOverview() {
  const router = useRouter();

  return (
    <CrmDashboardDataProvider>
      <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:space-y-5 sm:p-5">
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(240px,1fr)] lg:gap-5">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
            <CrmWidgetSection
              title="Eod compliance"
              actionLabel="View reports"
              onAction={() => router.push("/crm/eod-reports")}
            >
              <CrmEodComplianceCard />
            </CrmWidgetSection>

            <CrmWidgetSection
              title="Rep performance"
              actionLabel="View all"
              onAction={() => router.push("/crm/sales")}
            >
              <CrmRepPerformanceTable />
            </CrmWidgetSection>

            <CrmWidgetSection
              title="Recent sales activity"
              actionLabel="View all"
              onAction={() => router.push("/crm/sales")}
            >
              <CrmSalesActivityList />
            </CrmWidgetSection>

            <CrmWidgetSection
              title="Msa renewals"
              actionLabel="View all"
              onAction={() => router.push("/crm/accounts")}
            >
              <CrmMsaRenewalList />
            </CrmWidgetSection>
          </div>

          <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
            <CrmWidgetSection
              title="Events today in the field"
              actionLabel="View operations"
              onAction={() => router.push("/operations/work-orders")}
            >
              <CrmFieldEventsWeek />
            </CrmWidgetSection>

            <CrmWidgetSection
              title="Quote pipeline"
              actionLabel="View crm"
              onAction={() => router.push("/crm/quotes")}
            >
              <CrmQuotePipelinePanel />
            </CrmWidgetSection>

            <CrmWidgetSection
              title="Account setup health"
              actionLabel="View all"
              onAction={() => router.push("/crm/accounts")}
            >
              <CrmAccountSetupHealth />
            </CrmWidgetSection>
          </div>
        </div>
      </div>
    </CrmDashboardDataProvider>
  );
}
