import { Module } from '@nestjs/common';
import { NetSuiteItemMappingController } from './netsuite-item-mapping.controller';
import { NetSuiteItemMappingService } from './netsuite-item-mapping.service';

@Module({
  controllers: [NetSuiteItemMappingController],
  providers: [NetSuiteItemMappingService],
  exports: [NetSuiteItemMappingService],
})
export class NetSuiteItemMappingModule {}
