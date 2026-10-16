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
  CancelRepairDto,
  RepairListQueryDto,
  UpdateRepairDto,
} from './dto/repair-request.dto';
import { RepairRequestsService } from './repair-requests.service';

@ApiTags('fleet-repair-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fleet/repair-requests')
export class RepairRequestsController {
  constructor(private readonly service: RepairRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'List repair requests' })
  list(@Query() query: RepairListQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'List repair requests (POST body filters)' })
  listPost(@Body() query: RepairListQueryDto) {
    return this.service.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Repair requests KPI strip' })
  kpi() {
    return this.service.kpi();
  }

  @Get('workflow')
  @ApiOperation({ summary: 'Repair workflow columns' })
  workflow() {
    return this.service.workflow();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Repair request detail' })
  get(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update repair request' })
  update(@Param('id') id: string, @Body() dto: UpdateRepairDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel repair request' })
  cancel(@Param('id') id: string, @Body() _dto: CancelRepairDto) {
    return this.service.cancel(id);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve / close repair request' })
  resolve(@Param('id') id: string) {
    return this.service.resolve(id);
  }
}
