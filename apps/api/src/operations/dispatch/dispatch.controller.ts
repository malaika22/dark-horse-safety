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
import { DispatchService } from './dispatch.service';
import {
  AssignDispatchJobDto,
  DispatchAcceptanceQueryDto,
  DispatchRangeQueryDto,
  OverrideDispatchDto,
  ReassignDispatchDto,
  RescheduleDispatchDto,
} from './dto/dispatch.dto';

@ApiTags('operations-dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operations/dispatch')
export class DispatchController {
  constructor(private readonly service: DispatchService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'Dispatch KPI strip' })
  kpi(@Query() query: DispatchRangeQueryDto) {
    return this.service.kpi(query);
  }

  @Get('schedule')
  @ApiOperation({ summary: 'Dispatch schedule board by technician' })
  schedule(@Query() query: DispatchRangeQueryDto) {
    return this.service.scheduleBoard(query);
  }

  @Get('acceptance')
  @ApiOperation({ summary: 'Tech acceptance table' })
  acceptance(@Query() query: DispatchAcceptanceQueryDto) {
    return this.service.acceptanceList(query);
  }

  @Get('options')
  @ApiOperation({ summary: 'Technicians, work orders, crews for forms' })
  options() {
    return this.service.options();
  }

  @Get('eligibility/:workOrderId')
  @ApiOperation({ summary: 'Eligibility gates for a work order' })
  eligibility(@Param('workOrderId') workOrderId: string) {
    return this.service.eligibility(workOrderId);
  }

  @Get(':id/reassign-candidates')
  @ApiOperation({ summary: 'Eligible techs after decline' })
  reassignCandidates(@Param('id') id: string) {
    return this.service.reassignCandidates(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Assignment detail card' })
  one(@Param('id') id: string) {
    return this.service.getAssignment(id);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign job to technician' })
  assign(@Body() dto: AssignDispatchJobDto) {
    return this.service.assign(dto);
  }

  @Post('post-to-mobile')
  @ApiOperation({ summary: 'Post pending assignments to mobile' })
  postToMobile(@Body() body: { ids?: string[] }) {
    return this.service.postToMobile(body?.ids);
  }

  @Post('notify-techs')
  @ApiOperation({ summary: 'Notify technicians of assignments' })
  notify(@Body() body: { ids?: string[] }) {
    return this.service.notifyTechs(body?.ids);
  }

  @Post(':id/reschedule')
  @ApiOperation({ summary: 'Preview or confirm reschedule' })
  reschedule(@Param('id') id: string, @Body() dto: RescheduleDispatchDto) {
    return this.service.reschedule(id, dto);
  }

  @Post(':id/reassign')
  @ApiOperation({ summary: 'Reassign after decline' })
  reassign(@Param('id') id: string, @Body() dto: ReassignDispatchDto) {
    return this.service.reassign(id, dto);
  }

  @Post(':id/leave-unassigned')
  @ApiOperation({ summary: 'Clear technician from assignment' })
  leaveUnassigned(@Param('id') id: string) {
    return this.service.leaveUnassigned(id);
  }

  @Post(':id/override')
  @ApiOperation({ summary: 'Hard-gate override and dispatch' })
  override(@Param('id') id: string, @Body() dto: OverrideDispatchDto) {
    return this.service.override(id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel assignment' })
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
