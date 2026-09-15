import { Module } from '@nestjs/common';
import { NetSuiteCustomerMappingModule } from '../netsuite-customer-mapping/netsuite-customer-mapping.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [NetSuiteCustomerMappingModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
