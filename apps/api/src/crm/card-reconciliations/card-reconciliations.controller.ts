import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import {
  AddChargeDto,
  FinishReconciliationDto,
  LinkExpenseDto,
  WaiveExceptionDto,
} from './dto/card-reconciliation.dto';
import { CardReconciliationsService } from './card-reconciliations.service';

@ApiTags('crm-card-reconciliations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/card-reconciliations')
export class CardReconciliationsController {
  constructor(private readonly reconciliations: CardReconciliationsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get card reconciliation detail' })
  get(@Param('id') id: string) {
    return this.reconciliations.getById(id);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync reconciliation exceptions from expenses' })
  sync(@Param('id') id: string) {
    return this.reconciliations.syncFromExpenses(id);
  }

  @Post(':id/auto-match')
  @ApiOperation({ summary: 'Auto-match unmatched charges to expenses' })
  autoMatch(@Param('id') id: string) {
    return this.reconciliations.autoMatch(id);
  }

  @Post(':id/charges')
  @ApiOperation({ summary: 'Add unmatched statement charge' })
  addCharge(@Param('id') id: string, @Body() dto: AddChargeDto) {
    return this.reconciliations.addCharge(id, dto);
  }

  @Post(':id/finish')
  @ApiOperation({ summary: 'Finish card reconciliation' })
  finish(@Param('id') id: string, @Body() dto: FinishReconciliationDto) {
    return this.reconciliations.finish(id, dto);
  }

  @Post(':id/exceptions/:exceptionId/request-receipt')
  @ApiOperation({ summary: 'Request receipt for missing-receipt exception' })
  requestReceipt(
    @Param('id') id: string,
    @Param('exceptionId') exceptionId: string,
  ) {
    return this.reconciliations.requestReceipt(id, exceptionId);
  }

  @Post(':id/exceptions/:exceptionId/waive')
  @ApiOperation({ summary: 'Waive missing-receipt exception with reason' })
  waive(
    @Param('id') id: string,
    @Param('exceptionId') exceptionId: string,
    @Body() dto: WaiveExceptionDto,
  ) {
    return this.reconciliations.waive(id, exceptionId, dto);
  }

  @Post(':id/exceptions/:exceptionId/link-expense')
  @ApiOperation({ summary: 'Link logged expense to unmatched charge' })
  linkExpense(
    @Param('id') id: string,
    @Param('exceptionId') exceptionId: string,
    @Body() dto: LinkExpenseDto,
  ) {
    return this.reconciliations.linkExpense(id, exceptionId, dto);
  }

  @Post(':id/exceptions/:exceptionId/mark-personal')
  @ApiOperation({ summary: 'Mark unmatched expense as personal' })
  markPersonal(
    @Param('id') id: string,
    @Param('exceptionId') exceptionId: string,
  ) {
    return this.reconciliations.markPersonal(id, exceptionId);
  }

  @Post(':id/exceptions/:exceptionId/dispute')
  @ApiOperation({ summary: 'Dispute unmatched expense' })
  dispute(
    @Param('id') id: string,
    @Param('exceptionId') exceptionId: string,
  ) {
    return this.reconciliations.dispute(id, exceptionId);
  }

  @Post(':id/exceptions/:exceptionId/delete')
  @ApiOperation({ summary: 'Delete unmatched expense from reconciliation' })
  deleteException(
    @Param('id') id: string,
    @Param('exceptionId') exceptionId: string,
  ) {
    return this.reconciliations.deleteException(id, exceptionId);
  }
}

@ApiTags('crm-customer-card-reconciliations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/customers')
export class CustomerCardReconciliationsController {
  constructor(private readonly reconciliations: CardReconciliationsService) {}

  @Get(':id/card-reconciliation')
  @ApiOperation({ summary: 'Get or create open card reconciliation for customer' })
  getForCustomer(
    @Param('id') id: string,
    @Query('paymentCardId') paymentCardId?: string,
  ) {
    return this.reconciliations.getForCustomer(id, { paymentCardId });
  }
}
