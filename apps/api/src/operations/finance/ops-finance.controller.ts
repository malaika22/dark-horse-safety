import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import {
  CreatePurchaseOrderDto,
  MarkBillingReviewedDto,
} from './dto/ops-finance.dto';
import { OpsFinanceService } from './ops-finance.service';

@ApiTags('operations-finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operations')
export class OpsFinanceController {
  constructor(private readonly service: OpsFinanceService) {}

  @Get('billing')
  @ApiOperation({ summary: 'Billing reconciliation variances' })
  billing() {
    return this.service.billingOverview();
  }

  @Get('billing/:id')
  @ApiOperation({ summary: 'Billing reconciliation detail' })
  billingDetail(@Param('id') id: string) {
    return this.service.billingDetail(id);
  }

  @Patch('billing/:id')
  @ApiOperation({ summary: 'Mark reviewed / update NetSuite correction' })
  markBilling(
    @Param('id') id: string,
    @Body() dto: MarkBillingReviewedDto,
  ) {
    return this.service.markBillingReviewed(id, dto);
  }

  @Get('purchase-orders/options')
  @ApiOperation({ summary: 'Add PO form options' })
  poOptions() {
    return this.service.purchaseOrderFormOptions();
  }

  @Get('purchase-orders')
  @ApiOperation({ summary: 'Purchase orders list' })
  purchaseOrders() {
    return this.service.purchaseOrdersOverview();
  }

  @Post('purchase-orders')
  @ApiOperation({ summary: 'Create purchase order' })
  createPo(@Body() dto: CreatePurchaseOrderDto) {
    return this.service.createPurchaseOrder(dto);
  }

  @Get('netsuite')
  @ApiOperation({ summary: 'NetSuite handoff export preview' })
  netsuite() {
    return this.service.netsuiteOverview();
  }

  @Post('netsuite/export-ready')
  @ApiOperation({ summary: 'Export all ready tickets to NetSuite' })
  exportReady() {
    return this.service.exportAllReady();
  }

  @Get('netsuite/:id/error')
  @ApiOperation({ summary: 'NetSuite send error detail' })
  netsuiteError(@Param('id') id: string) {
    return this.service.netsuiteError(id);
  }

  @Post('netsuite/:id/follow-up')
  @ApiOperation({ summary: 'Mark NetSuite error for follow-up' })
  followUp(@Param('id') id: string) {
    return this.service.markNetsuiteFollowUp(id);
  }

  @Post('netsuite/:id/retry')
  @ApiOperation({ summary: 'Retry NetSuite send' })
  retry(@Param('id') id: string) {
    return this.service.retryNetsuiteSend(id);
  }

  @Post('netsuite/:id/send')
  @ApiOperation({ summary: 'Mark sales ticket sent to NetSuite' })
  send(@Param('id') id: string) {
    return this.service.markNetsuiteSent(id);
  }
}
