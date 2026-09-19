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
  AskEmployeeDto,
  PayrollReviewQueryDto,
  ResolveClockOutDto,
  ResolveGpsDto,
  UnlockCycleDto,
} from './dto/payroll-review.dto';
import { PayrollReviewService } from './payroll-review.service';

@ApiTags('hr-payroll-review')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/payroll-review')
export class PayrollReviewController {
  constructor(private readonly service: PayrollReviewService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'Payroll review KPIs for current (or selected) cycle' })
  kpi(@Query('cycleId') cycleId?: string) {
    return this.service.kpi(cycleId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export payroll review CSV' })
  export(@Query() query: PayrollReviewQueryDto) {
    return this.service.exportCsv(query);
  }

  @Get('report')
  @ApiOperation({ summary: 'Generate payroll report CSV' })
  report(@Query('cycleId') cycleId?: string) {
    return this.service.generateReport(cycleId);
  }

  @Get('lock-preview')
  @ApiOperation({ summary: 'Lock pay cycle preview' })
  lockPreview(@Query('cycleId') cycleId?: string) {
    return this.service.lockPreview(cycleId);
  }

  @Get('unlock-preview')
  @ApiOperation({ summary: 'Request cycle unlock preview' })
  unlockPreview(@Query('cycleId') cycleId?: string) {
    return this.service.unlockPreview(cycleId);
  }

  @Get('off-cycle/kpi')
  @ApiOperation({ summary: 'Off-cycle adjustment run KPIs' })
  offCycleKpi() {
    return this.service.offCycleKpi();
  }

  @Get('off-cycle')
  @ApiOperation({ summary: 'Off-cycle adjustment run list' })
  offCycleList(@Query() query: PayrollReviewQueryDto) {
    return this.service.offCycleList(query);
  }

  @Get('resolve/:kind/:targetId')
  @ApiOperation({ summary: 'Resolve exception context payload' })
  resolveContext(
    @Param('kind') kind: string,
    @Param('targetId') targetId: string,
  ) {
    return this.service.resolveContext(kind, targetId);
  }

  @Get()
  @ApiOperation({ summary: 'List payroll review rows' })
  list(@Query() query: PayrollReviewQueryDto) {
    return this.service.list(query);
  }

  @Post('approve')
  @ApiOperation({ summary: 'Approve payroll total for cycle' })
  approve(@Query('cycleId') cycleId?: string) {
    return this.service.approve(cycleId);
  }

  @Post('lock')
  @ApiOperation({ summary: 'Lock pay cycle' })
  lock(@Query('cycleId') cycleId?: string) {
    return this.service.lockCycle(cycleId);
  }

  @Post('unlock-request')
  @ApiOperation({ summary: 'Submit cycle unlock request' })
  unlockRequest(
    @Query('cycleId') cycleId: string | undefined,
    @Body() dto: UnlockCycleDto,
  ) {
    return this.service.requestUnlock(cycleId, dto.reason);
  }

  @Post('off-cycle/process')
  @ApiOperation({ summary: 'Process off-cycle adjustment run' })
  processOffCycle() {
    return this.service.processOffCycleRun();
  }

  @Post('resolve/clock-out/:id')
  @ApiOperation({ summary: 'Enter clock-out for missing entry' })
  resolveClockOut(@Param('id') id: string, @Body() dto: ResolveClockOutDto) {
    return this.service.resolveClockOut(id, dto.clockOut);
  }

  @Post('resolve/ask/:id')
  @ApiOperation({ summary: 'Ask / notify employee about exception' })
  askEmployee(@Param('id') id: string, @Body() dto: AskEmployeeDto) {
    return this.service.askEmployee(id, dto.message);
  }

  @Post('resolve/docs/:employeeId')
  @ApiOperation({ summary: 'Mark missing documents resolved' })
  resolveDocs(@Param('employeeId') employeeId: string) {
    return this.service.resolveDocs(employeeId);
  }

  @Post('resolve/form/:id')
  @ApiOperation({ summary: 'Mark required form complete' })
  resolveForm(@Param('id') id: string) {
    return this.service.resolveForm(id);
  }

  @Post('resolve/gps/:id')
  @ApiOperation({ summary: 'Confirm GPS flag or mark as GPS error' })
  resolveGps(@Param('id') id: string, @Body() dto: ResolveGpsDto) {
    return this.service.resolveGps(id, dto.action);
  }
}
