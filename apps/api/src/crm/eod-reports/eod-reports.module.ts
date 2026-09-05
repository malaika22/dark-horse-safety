import { Module } from '@nestjs/common';
import { MailService } from '../../auth/mail.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { ExportService } from '../../common/services/export.service';
import { EodReportsController } from './eod-reports.controller';
import { EodReportsService } from './eod-reports.service';

@Module({
  controllers: [EodReportsController],
  providers: [
    EodReportsService,
    ExportService,
    CodeGeneratorService,
    MailService,
  ],
  exports: [EodReportsService],
})
export class EodReportsModule {}
