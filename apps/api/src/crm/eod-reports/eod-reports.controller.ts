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
  BulkRemindEodDto,
  CreateEodReportDto,
  EodReportListQueryDto,
  RemindEodDto,
  RequestEodDetailDto,
  UpdateEodReportDto,
} from './dto/eod-report.dto';
import { EodReportsService } from './eod-reports.service';

@ApiTags('crm-eod-reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/eod-reports')
export class EodReportsController {
  constructor(private readonly eodReports: EodReportsService) {}

  @Get()
  @ApiOperation({ summary: 'List EOD reports' })
  list(@Query() query: EodReportListQueryDto) {
    return this.eodReports.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'EOD reports KPI strip' })
  kpi() {
    return this.eodReports.kpi();
  }

  @Get('attention')
  @ApiOperation({ summary: 'Missing / late EOD reports needing reminders' })
  attention() {
    return this.eodReports.listAttention();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export EOD reports CSV' })
  export(@Query() query: ExportQueryDto & EodReportListQueryDto) {
    return this.eodReports.exportCsv(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create EOD report (minimal)' })
  create(@Body() dto: CreateEodReportDto) {
    return this.eodReports.create(dto);
  }

  @Post('bulk/remind')
  @ApiOperation({ summary: 'Bulk send EOD reminders' })
  bulkRemind(@Body() body: BulkRemindEodDto) {
    return this.eodReports.bulkRemind(body.ids ?? [], body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'EOD report detail' })
  get(@Param('id') id: string) {
    return this.eodReports.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update EOD report' })
  update(@Param('id') id: string, @Body() dto: UpdateEodReportDto) {
    return this.eodReports.update(id, dto);
  }

  @Post(':id/remind')
  @ApiOperation({ summary: 'Send EOD reminder to assigned rep' })
  remind(@Param('id') id: string, @Body() dto: RemindEodDto) {
    return this.eodReports.remind(id, dto);
  }

  @Post(':id/request-detail')
  @ApiOperation({ summary: 'Request more detail from assigned rep' })
  requestDetail(@Param('id') id: string, @Body() dto: RequestEodDetailDto) {
    return this.eodReports.requestDetail(id, dto);
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Manager acknowledge EOD report' })
  acknowledge(
    @Param('id') id: string,
    @Body() body: { by?: string; note?: string },
  ) {
    return this.eodReports.acknowledge(id, body);
  }
}
