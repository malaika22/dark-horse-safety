import { Module } from '@nestjs/common';
import { OpsFinanceController } from './ops-finance.controller';
import { OpsFinanceService } from './ops-finance.service';

@Module({
  controllers: [OpsFinanceController],
  providers: [OpsFinanceService],
  exports: [OpsFinanceService],
})
export class OpsFinanceModule {}
