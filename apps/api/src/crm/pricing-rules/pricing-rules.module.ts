import { Module } from '@nestjs/common';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { ExportService } from '../../common/services/export.service';
import { PricingRulesController } from './pricing-rules.controller';
import { PricingRulesService } from './pricing-rules.service';

@Module({
  controllers: [PricingRulesController],
  providers: [PricingRulesService, ExportService, CodeGeneratorService],
  exports: [PricingRulesService],
})
export class PricingRulesModule {}
