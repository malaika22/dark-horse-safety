import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import {
  AttachPurchaseOrderDto,
  CancelWorkOrderDto,
  CreateWorkOrderDto,
  ExportJobPacketDto,
  HoldCancelWorkOrderDto,
  RequestDocumentDto,
  RequestPurchaseOrderDto,
  WorkOrderListQueryDto,
} from './dto/work-order.dto';
import { WorkOrdersService } from './work-orders.service';

@ApiTags('crm-work-orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrders: WorkOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List work orders (ops-enriched rows)' })
  list(@Query() query: WorkOrderListQueryDto) {
    return this.workOrders.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Work orders KPI strip' })
  kpi() {
    return this.workOrders.kpi();
  }

  @Get('ops-kpi')
  @ApiOperation({ summary: 'Operations work-order list KPI strip' })
  opsKpi() {
    return this.workOrders.opsKpi();
  }

  @Get('form-options')
  @ApiOperation({ summary: 'Create work-order form options' })
  formOptions() {
    return this.workOrders.formOptions();
  }

  @Post()
  @ApiOperation({ summary: 'Create work order' })
  create(@Body() dto: CreateWorkOrderDto) {
    return this.workOrders.create(dto);
  }

  @Get(':id/packet')
  @ApiOperation({ summary: 'Job packet detail aggregate' })
  jobPacket(@Param('id') id: string) {
    return this.workOrders.jobPacket(id);
  }

  @Get(':id/hours-by-pay-cycle')
  @ApiOperation({ summary: 'Hours by pay cycle for work order' })
  hoursByPayCycle(@Param('id') id: string) {
    return this.workOrders.hoursByPayCycle(id);
  }

  @Get(':id/po-status')
  @ApiOperation({ summary: 'PO required gate status for NetSuite / invoicing' })
  poStatus(@Param('id') id: string) {
    return this.workOrders.poStatus(id);
  }

  @Post(':id/export-packet')
  @ApiOperation({ summary: 'Export / preview job packet sections' })
  exportPacket(@Param('id') id: string, @Body() dto: ExportJobPacketDto) {
    return this.workOrders.exportPacket(id, dto);
  }

  @Get(':id/cancel-preview')
  @ApiOperation({ summary: 'Cancel work order preview / blocked gate' })
  cancelPreview(@Param('id') id: string) {
    return this.workOrders.cancelPreview(id);
  }

  @Post(':id/hold')
  @ApiOperation({ summary: 'Hold work order (requires reason)' })
  hold(@Param('id') id: string, @Body() dto: HoldCancelWorkOrderDto) {
    return this.workOrders.hold(id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel work order (requires reason)' })
  cancel(@Param('id') id: string, @Body() dto: CancelWorkOrderDto) {
    return this.workOrders.cancel(id, dto);
  }

  @Post(':id/request-po')
  @ApiOperation({ summary: 'Request purchase order from customer' })
  requestPo(@Param('id') id: string, @Body() dto: RequestPurchaseOrderDto) {
    return this.workOrders.requestPurchaseOrder(id, dto);
  }

  @Post(':id/mark-po-received')
  @ApiOperation({ summary: 'Mark purchase order received' })
  markPoReceived(@Param('id') id: string) {
    return this.workOrders.markPoReceived(id);
  }

  @Post(':id/attach-po')
  @ApiOperation({ summary: 'Attach purchase order to work order' })
  attachPo(@Param('id') id: string, @Body() dto: AttachPurchaseOrderDto) {
    return this.workOrders.attachPurchaseOrder(id, dto);
  }

  @Post(':id/request-document')
  @ApiOperation({ summary: 'Request a missing document for the work order' })
  requestDocument(@Param('id') id: string, @Body() dto: RequestDocumentDto) {
    return this.workOrders.requestDocument(id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Work order detail' })
  get(@Param('id') id: string) {
    return this.workOrders.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update work order (complete / dispatch readiness)' })
  update(
    @Param('id') id: string,
    @Body()
    dto: Partial<CreateWorkOrderDto> & {
      crewAssigned?: boolean;
      equipmentAssigned?: boolean;
      formsCompleted?: boolean;
      eligibilityVerified?: boolean;
    },
  ) {
    return this.workOrders.update(id, dto);
  }
}
