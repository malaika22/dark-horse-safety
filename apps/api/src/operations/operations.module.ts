import { Module } from '@nestjs/common';
import { OpsDashboardModule } from './dashboard/ops-dashboard.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { OpsFinanceModule } from './finance/ops-finance.module';
import { FormRequestsModule } from './form-requests/form-requests.module';
import { InvoicesModule } from './invoices/invoices.module';
import { SalesTicketsModule } from './sales-tickets/sales-tickets.module';
import { RecurringSeriesModule } from './recurring-series/recurring-series.module';

@Module({
  imports: [
    OpsDashboardModule,
    DispatchModule,
    SalesTicketsModule,
    RecurringSeriesModule,
    OpsFinanceModule,
    FormRequestsModule,
    InvoicesModule,
  ],
})
export class OperationsModule {}
