import { Module } from '@nestjs/common';
import { NetSuiteCustomerMappingController } from './netsuite-customer-mapping.controller';
import { NetSuiteCustomerMappingService } from './netsuite-customer-mapping.service';

@Module({
  controllers: [NetSuiteCustomerMappingController],
  providers: [NetSuiteCustomerMappingService],
  exports: [NetSuiteCustomerMappingService],
})
export class NetSuiteCustomerMappingModule {}
