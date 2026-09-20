import { Module } from '@nestjs/common';
import { RecurringSeriesController } from './recurring-series.controller';
import { RecurringSeriesService } from './recurring-series.service';

@Module({
  controllers: [RecurringSeriesController],
  providers: [RecurringSeriesService],
  exports: [RecurringSeriesService],
})
export class RecurringSeriesModule {}
