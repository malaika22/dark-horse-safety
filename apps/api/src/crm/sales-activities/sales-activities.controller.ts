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
import { ExportQueryDto } from '../../common/dto/list-query.dto';
import {
  CreateSalesActivityDto,
  FollowUpDto,
  SalesActivityListQueryDto,
  UpdateSalesActivityDto,
} from './dto/sales-activity.dto';
import { SalesActivitiesService } from './sales-activities.service';

@ApiTags('crm-sales-activities')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/sales-activities')
export class SalesActivitiesController {
  constructor(private readonly salesActivities: SalesActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List sales activities' })
  list(@Query() query: SalesActivityListQueryDto) {
    return this.salesActivities.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Sales activities KPI strip' })
  kpi() {
    return this.salesActivities.kpi();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export sales activities CSV' })
  export(@Query() query: ExportQueryDto & SalesActivityListQueryDto) {
    return this.salesActivities.exportCsv(query);
  }

  @Post()
  @ApiOperation({ summary: 'Log sales activity' })
  create(@Body() dto: CreateSalesActivityDto) {
    return this.salesActivities.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Sales activity detail' })
  get(@Param('id') id: string) {
    return this.salesActivities.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update sales activity' })
  update(@Param('id') id: string, @Body() dto: UpdateSalesActivityDto) {
    return this.salesActivities.update(id, dto);
  }

  @Post(':id/follow-up')
  @ApiOperation({ summary: 'Set follow-up on sales activity' })
  followUp(@Param('id') id: string, @Body() dto: FollowUpDto) {
    return this.salesActivities.followUp(id, dto);
  }
}
