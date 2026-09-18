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
  AddTimeEditNoteDto,
  AdminOverrideTimeEditDto,
  ClarifyTimeEditRequestDto,
  RejectTimeEditRequestDto,
  SaveTimeEditAdminNoteDto,
  TimeEditRequestQueryDto,
} from './dto/time-edit-request.dto';
import { TimeEditRequestsService } from './time-edit-requests.service';

@ApiTags('hr-time-edit-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/time-edit-requests')
export class TimeEditRequestsController {
  constructor(private readonly service: TimeEditRequestsService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'Time edit request KPIs' })
  kpi() {
    return this.service.kpi();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export time edit request log as CSV' })
  exportLog() {
    return this.service.exportLog();
  }

  @Get()
  @ApiOperation({ summary: 'List time edit requests' })
  list(@Query() query: TimeEditRequestQueryDto) {
    return this.service.list(query);
  }

  @Post('add-note')
  @ApiOperation({ summary: 'Add note to a request (or latest open)' })
  addNote(@Body() dto: AddTimeEditNoteDto) {
    return this.service.addNote(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Time edit request detail' })
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve time edit request' })
  approve(
    @Param('id') id: string,
    @Body() dto: AdminOverrideTimeEditDto,
  ) {
    return this.service.approve(id, dto?.adminNote);
  }

  @Post(':id/admin-override')
  @ApiOperation({ summary: 'Confirm locked-cycle admin override' })
  adminOverride(
    @Param('id') id: string,
    @Body() dto: AdminOverrideTimeEditDto,
  ) {
    return this.service.adminOverride(id, dto);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject time edit request' })
  reject(@Param('id') id: string, @Body() dto: RejectTimeEditRequestDto) {
    return this.service.reject(id, dto);
  }

  @Post(':id/clarify')
  @ApiOperation({ summary: 'Ask for clarification' })
  clarify(@Param('id') id: string, @Body() dto: ClarifyTimeEditRequestDto) {
    return this.service.clarify(id, dto);
  }

  @Post(':id/admin-note')
  @ApiOperation({ summary: 'Save admin note on request' })
  saveAdminNote(
    @Param('id') id: string,
    @Body() dto: SaveTimeEditAdminNoteDto,
  ) {
    return this.service.saveAdminNote(id, dto);
  }
}
