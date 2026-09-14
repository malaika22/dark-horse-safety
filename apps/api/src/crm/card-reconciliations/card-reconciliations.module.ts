import { Module } from '@nestjs/common';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import {
  CardReconciliationsController,
  CustomerCardReconciliationsController,
} from './card-reconciliations.controller';
import { CardReconciliationsService } from './card-reconciliations.service';

@Module({
  controllers: [
    CardReconciliationsController,
    CustomerCardReconciliationsController,
  ],
  providers: [CardReconciliationsService, CodeGeneratorService],
  exports: [CardReconciliationsService],
})
export class CardReconciliationsModule {}
