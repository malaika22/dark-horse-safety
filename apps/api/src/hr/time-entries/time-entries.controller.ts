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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import {
  AddTimeEntryNoteDto,
  BulkApproveTimeEntriesDto,
  RejectTimeEntryDto,
  RequestCorrectionDto,
  SaveAdminNoteDto,
  TimeEntryQueryDto,
  UpdateTimeEntryAdminDto,
} from './dto/time-entry.dto';
import { TimeEntriesService } from './time-entries.service';

@ApiTags('hr-time-entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/time-entries')
export class TimeEntriesController {
  constructor(private readonly service: TimeEntriesService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'Time entry list KPIs' })
  kpi() {
    return this.service.kpi();
  }

  @Get('filter-options')
  @ApiOperation({ summary: 'Filter dropdown options for time entries' })
  filterOptions() {
    return this.service.filterOptions();
  }

  @Get()
  @ApiOperation({ summary: 'List time entries' })
  list(@Query() query: TimeEntryQueryDto) {
    return this.service.list(query);
  }

  @Post('import-gocanvas')
  @ApiOperation({ summary: 'Import GoCanvas timesheets' })
  importGoCanvas() {
    return this.service.importGoCanvas();
  }

  @Post('approve-all-clean')
  @ApiOperation({ summary: 'Approve all clean pending entries' })
  approveAllClean() {
    return this.service.approveAllClean();
  }

  @Patch('bulk-approve')
  @ApiOperation({ summary: 'Approve selected time entries' })
  bulkApprove(@Body() dto: BulkApproveTimeEntriesDto) {
    return this.service.bulkApprove(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Time entry detail' })
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin edit time entry' })
  updateAdmin(@Param('id') id: string, @Body() dto: UpdateTimeEntryAdminDto) {
    return this.service.updateAdmin(id, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve time entry' })
  approve(@Param('id') id: string) {
    return this.service.approve(id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject time entry' })
  reject(@Param('id') id: string, @Body() dto: RejectTimeEntryDto) {
    return this.service.reject(id, dto);
  }

  @Post(':id/admin-note')
  @ApiOperation({ summary: 'Save admin note' })
  saveAdminNote(@Param('id') id: string, @Body() dto: SaveAdminNoteDto) {
    return this.service.saveAdminNote(id, dto);
  }

  @Post(':id/request-correction')
  @ApiOperation({ summary: 'Request correction on a time entry' })
  requestCorrection(
    @Param('id') id: string,
    @Body() dto: RequestCorrectionDto,
  ) {
    return this.service.requestCorrection(id, dto);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add note to a time entry' })
  addNote(@Param('id') id: string, @Body() dto: AddTimeEntryNoteDto) {
    return this.service.addNote(id, dto);
  }
}
