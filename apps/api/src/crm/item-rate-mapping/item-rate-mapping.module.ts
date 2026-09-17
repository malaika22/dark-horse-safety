import { Module } from '@nestjs/common';
import { ItemRateMappingController } from './item-rate-mapping.controller';
import { ItemRateMappingService } from './item-rate-mapping.service';

@Module({
  controllers: [ItemRateMappingController],
  providers: [ItemRateMappingService],
  exports: [ItemRateMappingService],
})
export class ItemRateMappingModule {}
