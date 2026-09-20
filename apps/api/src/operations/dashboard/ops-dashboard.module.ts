import { Module } from '@nestjs/common';
import { OpsDashboardController } from './ops-dashboard.controller';
import { OpsDashboardService } from './ops-dashboard.service';

@Module({
  controllers: [OpsDashboardController],
  providers: [OpsDashboardService],
  exports: [OpsDashboardService],
})
export class OpsDashboardModule {}
