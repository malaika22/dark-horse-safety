import { Module } from '@nestjs/common';
import { MailService } from '../../auth/mail.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { ExportService } from '../../common/services/export.service';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

@Module({
  imports: [WorkOrdersModule],
  controllers: [QuotesController],
  providers: [QuotesService, ExportService, CodeGeneratorService, MailService],
  exports: [QuotesService],
})
export class QuotesModule {}
