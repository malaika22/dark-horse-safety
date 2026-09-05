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
  BulkRequirementIdsDto,
  CreateRequirementDto,
  RequirementListQueryDto,
  UpdateRequirementDto,
} from './dto/requirement.dto';
import { RequirementsService } from './requirements.service';

@ApiTags('crm-requirements')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/requirements')
export class RequirementsController {
  constructor(private readonly requirements: RequirementsService) {}

  @Get()
  @ApiOperation({ summary: 'List customer requirements' })
  list(@Query() query: RequirementListQueryDto) {
    return this.requirements.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Requirements KPI strip' })
  kpi() {
    return this.requirements.kpi();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export requirements CSV or PDF' })
  export(@Query() query: ExportQueryDto & RequirementListQueryDto) {
    return this.requirements.exportCsv(query);
  }

  @Get('affected-summary')
  @ApiOperation({
    summary: 'Aggregate affected technicians / work orders / wells',
  })
  affectedSummary() {
    return this.requirements.affectedSummary();
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk archive requirements' })
  bulkDelete(@Body() dto: BulkRequirementIdsDto) {
    return this.requirements.bulkDelete(dto.ids);
  }

  @Post()
  @ApiOperation({ summary: 'Create requirement' })
  create(@Body() dto: CreateRequirementDto) {
    return this.requirements.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Requirement detail' })
  get(@Param('id') id: string) {
    return this.requirements.getById(id);
  }

  @Get(':id/affected')
  @ApiOperation({
    summary: 'Technicians and work orders affected by a requirement',
  })
  affected(@Param('id') id: string) {
    return this.requirements.affected(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update requirement' })
  update(@Param('id') id: string, @Body() dto: UpdateRequirementDto) {
    return this.requirements.update(id, dto);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive requirement' })
  archive(@Param('id') id: string) {
    return this.requirements.archive(id);
  }
}
