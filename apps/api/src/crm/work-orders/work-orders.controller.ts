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
  CreateWorkOrderDto,
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
  @ApiOperation({ summary: 'List work orders' })
  list(@Query() query: WorkOrderListQueryDto) {
    return this.workOrders.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create work order' })
  create(@Body() dto: CreateWorkOrderDto) {
    return this.workOrders.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Work order detail' })
  get(@Param('id') id: string) {
    return this.workOrders.getById(id);
  }
}
