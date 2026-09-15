import { Module } from '@nestjs/common';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { ExportService } from '../common/services/export.service';
import { CardReconciliationsModule } from './card-reconciliations/card-reconciliations.module';
import { ContactsModule } from './contacts/contacts.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EodReportsModule } from './eod-reports/eod-reports.module';
import { ExpensesModule } from './expenses/expenses.module';
import { PaymentCardsModule } from './payment-cards/payment-cards.module';
import { FormRulesModule } from './form-rules/form-rules.module';
import { LocationsModule } from './locations/locations.module';
import { LookupsModule } from './lookups/lookups.module';
import { NetSuiteCustomerMappingModule } from './netsuite-customer-mapping/netsuite-customer-mapping.module';
import { PricingRulesModule } from './pricing-rules/pricing-rules.module';
import { QuotesModule } from './quotes/quotes.module';
import { RequirementsModule } from './requirements/requirements.module';
import { RouteRulesModule } from './route-rules/route-rules.module';
import { SalesActivitiesModule } from './sales-activities/sales-activities.module';
import { SavedViewsModule } from './saved-views/saved-views.module';
import { TasksModule } from './tasks/tasks.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';

@Module({
  providers: [ExportService, CodeGeneratorService],
  exports: [ExportService, CodeGeneratorService],
  imports: [
    DashboardModule,
    CustomersModule,
    ContactsModule,
    LocationsModule,
    PricingRulesModule,
    RequirementsModule,
    FormRulesModule,
    RouteRulesModule,
    EodReportsModule,
    ExpensesModule,
    PaymentCardsModule,
    CardReconciliationsModule,
    SalesActivitiesModule,
    TasksModule,
    QuotesModule,
    WorkOrdersModule,
    SavedViewsModule,
    LookupsModule,
    NetSuiteCustomerMappingModule,
  ],
})
export class CrmModule {}
