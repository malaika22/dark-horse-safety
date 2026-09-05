import { Module } from '@nestjs/common';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { ExportService } from '../../common/services/export.service';
import { EodReportsController } from './eod-reports.controller';
import { EodReportsService } from './eod-reports.service';

@Module({
  controllers: [EodReportsController],
  providers: [EodReportsService, ExportService, CodeGeneratorService],
  exports: [EodReportsService],
})
export class EodReportsModule {}
