import { Module } from '@nestjs/common';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

@Module({
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, CodeGeneratorService],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
