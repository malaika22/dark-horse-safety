import { Module } from '@nestjs/common';
import { ExportService } from '../common/services/export.service';
import { QuoteVarianceService } from './quote-variance.service';
import { RateAdjustmentsService } from './rate-adjustments.service';
import { ReportsController } from './reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [QuoteVarianceService, RateAdjustmentsService, ExportService],
  exports: [QuoteVarianceService, RateAdjustmentsService],
})
export class ReportsModule {}
