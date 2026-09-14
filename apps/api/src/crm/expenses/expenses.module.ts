import { Module } from '@nestjs/common';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import {
  CustomerExpensesController,
  ExpensesController,
} from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  controllers: [ExpensesController, CustomerExpensesController],
  providers: [ExpensesService, CodeGeneratorService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
