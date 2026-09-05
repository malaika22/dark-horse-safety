import { Module } from '@nestjs/common';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { ExportService } from '../../common/services/export.service';
import { FormRulesController } from './form-rules.controller';
import { FormRulesService } from './form-rules.service';

@Module({
  controllers: [FormRulesController],
  providers: [FormRulesService, ExportService, CodeGeneratorService],
  exports: [FormRulesService],
})
export class FormRulesModule {}
