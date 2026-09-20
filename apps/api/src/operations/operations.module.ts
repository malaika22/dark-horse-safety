import { Module } from '@nestjs/common';
import { OpsDashboardModule } from './dashboard/ops-dashboard.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { OpsFinanceModule } from './finance/ops-finance.module';
import { SalesTicketsModule } from './sales-tickets/sales-tickets.module';
import { RecurringSeriesModule } from './recurring-series/recurring-series.module';

@Module({
  imports: [
    OpsDashboardModule,
    DispatchModule,
    SalesTicketsModule,
    RecurringSeriesModule,
    OpsFinanceModule,
  ],
})
export class OperationsModule {}
