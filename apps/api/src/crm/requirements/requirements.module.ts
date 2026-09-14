import { Module } from '@nestjs/common';
import { MailService } from '../../auth/mail.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { ExportService } from '../../common/services/export.service';
import { RequirementsController } from './requirements.controller';
import { RequirementsService } from './requirements.service';

@Module({
  controllers: [RequirementsController],
  providers: [
    RequirementsService,
    ExportService,
    CodeGeneratorService,
    MailService,
  ],
  exports: [RequirementsService],
})
export class RequirementsModule {}
