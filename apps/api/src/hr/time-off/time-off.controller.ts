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
  CreateTimeOffDto,
  DecideTimeOffDto,
  PreviewTimeOffDto,
  TimeOffCalendarQueryDto,
  TimeOffQueryDto,
} from './dto/time-off.dto';
import { TimeOffService } from './time-off.service';

@ApiTags('hr-time-off')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/time-off')
export class TimeOffController {
  constructor(private readonly service: TimeOffService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'Time off KPIs' })
  kpi() {
    return this.service.kpi();
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Time off calendar events for a month' })
  calendar(@Query() query: TimeOffCalendarQueryDto) {
    return this.service.calendar(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export time off requests CSV' })
  export(@Query() query: TimeOffQueryDto) {
    return this.service.exportCsv(query);
  }

  @Get()
  @ApiOperation({ summary: 'List time off requests' })
  list(@Query() query: TimeOffQueryDto) {
    return this.service.list(query);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview balance and coverage for a time-off request' })
  preview(@Body() dto: PreviewTimeOffDto) {
    return this.service.preview(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Request time off' })
  create(@Body() dto: CreateTimeOffDto) {
    return this.service.create(dto);
  }

  @Get(':id/review')
  @ApiOperation({ summary: 'Review payload for approve/deny modals' })
  review(@Param('id') id: string) {
    return this.service.review(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Time off request detail' })
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve time off request' })
  approve(@Param('id') id: string, @Body() dto: DecideTimeOffDto) {
    return this.service.approve(id, dto);
  }

  @Post(':id/deny')
  @ApiOperation({ summary: 'Deny time off request' })
  deny(@Param('id') id: string, @Body() dto: DecideTimeOffDto) {
    return this.service.deny(id, dto);
  }
}
