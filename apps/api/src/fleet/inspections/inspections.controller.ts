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
  BulkReviewDto,
  CreateCorrectiveActionDto,
  CreateRepairFromInspectionDto,
  EditInspectionDto,
  InspectionListQueryDto,
  ReinspectDto,
} from './dto/inspection.dto';
import { InspectionsService } from './inspections.service';

@ApiTags('fleet-inspections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fleet/inspections')
export class InspectionsController {
  constructor(private readonly service: InspectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List fleet inspections' })
  list(@Query() query: InspectionListQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'List fleet inspections (POST body filters)' })
  listPost(@Body() query: InspectionListQueryDto) {
    return this.service.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Inspections KPI strip' })
  kpi() {
    return this.service.kpi();
  }

  @Post('bulk-review')
  @ApiOperation({ summary: 'Mark inspections reviewed' })
  bulkReview(@Body() dto: BulkReviewDto) {
    return this.service.bulkMarkReviewed(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Inspection detail' })
  get(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post(':id/corrective-action')
  @ApiOperation({ summary: 'Create corrective action from inspection' })
  createCorrectiveAction(
    @Param('id') id: string,
    @Body() dto: CreateCorrectiveActionDto,
  ) {
    return this.service.createCorrectiveAction(id, dto);
  }

  @Post(':id/reinspect')
  @ApiOperation({ summary: 'Create re-inspection draft from failed inspection' })
  reinspect(@Param('id') id: string, @Body() dto: ReinspectDto) {
    return this.service.reinspect(id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit submitted inspection (reason required)' })
  edit(@Param('id') id: string, @Body() dto: EditInspectionDto) {
    return this.service.edit(id, dto);
  }

  @Post(':id/repair')
  @ApiOperation({ summary: 'Create repair request from inspection' })
  createRepair(
    @Param('id') id: string,
    @Body() dto: CreateRepairFromInspectionDto,
  ) {
    return this.service.createRepair(id, dto);
  }
}
