import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { OpsFinanceService } from './ops-finance.service';

@ApiTags('operations-finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operations')
export class OpsFinanceController {
  constructor(private readonly service: OpsFinanceService) {}

  @Get('billing')
  @ApiOperation({ summary: 'Billing reconciliation variances (live sales tickets)' })
  billing() {
    return this.service.billingOverview();
  }

  @Get('purchase-orders')
  @ApiOperation({ summary: 'Purchase orders from live ticket packets' })
  purchaseOrders() {
    return this.service.purchaseOrdersOverview();
  }

  @Get('netsuite')
  @ApiOperation({ summary: 'NetSuite handoff queue from live sales tickets' })
  netsuite() {
    return this.service.netsuiteOverview();
  }

  @Post('netsuite/:id/send')
  @ApiOperation({ summary: 'Mark sales ticket sent to NetSuite' })
  send(@Param('id') id: string) {
    return this.service.markNetsuiteSent(id);
  }
}
