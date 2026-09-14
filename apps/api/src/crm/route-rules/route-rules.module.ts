import { Module } from '@nestjs/common';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { ExportService } from '../../common/services/export.service';
import { RouteRulesController } from './route-rules.controller';
import { RouteRulesService } from './route-rules.service';

@Module({
  controllers: [RouteRulesController],
  providers: [RouteRulesService, ExportService, CodeGeneratorService],
  exports: [RouteRulesService],
})
export class RouteRulesModule {}
