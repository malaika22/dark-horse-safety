import { Module } from '@nestjs/common';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { ExportService } from '../../common/services/export.service';
import { SalesActivitiesController } from './sales-activities.controller';
import { SalesActivitiesService } from './sales-activities.service';

@Module({
  controllers: [SalesActivitiesController],
  providers: [SalesActivitiesService, ExportService, CodeGeneratorService],
  exports: [SalesActivitiesService],
})
export class SalesActivitiesModule {}
