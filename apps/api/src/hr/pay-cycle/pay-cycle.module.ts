import { Module } from '@nestjs/common';
import { PayCycleController } from './pay-cycle.controller';
import { PayCycleService } from './pay-cycle.service';

@Module({
  controllers: [PayCycleController],
  providers: [PayCycleService],
  exports: [PayCycleService],
})
export class PayCycleModule {}
