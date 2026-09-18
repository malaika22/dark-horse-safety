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
  AddPayCycleNoteDto,
  UpdateCadenceDto,
  UpdateHolidayDto,
  UpdateOvertimeRulesDto,
  UpdatePtoRulesDto,
} from './dto/pay-cycle.dto';
import { PayCycleService } from './pay-cycle.service';

@ApiTags('hr-pay-cycle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/pay-cycle')
export class PayCycleController {
  constructor(private readonly service: PayCycleService) {}

  @Get()
  @ApiOperation({ summary: 'Pay cycle settings overview' })
  overview(@Query('year') year?: string) {
    const y = year ? Number(year) : undefined;
    return this.service.getOverview(
      y && Number.isFinite(y) ? y : undefined,
    );
  }

  @Patch('settings/overtime')
  @ApiOperation({ summary: 'Update time & overtime rules' })
  updateOvertime(@Body() dto: UpdateOvertimeRulesDto) {
    return this.service.updateOvertime(dto);
  }

  @Patch('settings/pto')
  @ApiOperation({ summary: 'Update PTO / sick rules' })
  updatePto(@Body() dto: UpdatePtoRulesDto) {
    return this.service.updatePto(dto);
  }

  @Patch('settings/cadence')
  @ApiOperation({ summary: 'Update cycle cadence & approval' })
  updateCadence(@Body() dto: UpdateCadenceDto) {
    return this.service.updateCadence(dto);
  }

  @Patch('holidays/:id')
  @ApiOperation({ summary: 'Update an observed holiday' })
  updateHoliday(@Param('id') id: string, @Body() dto: UpdateHolidayDto) {
    return this.service.updateHoliday(id, dto);
  }

  @Post('notes')
  @ApiOperation({ summary: 'Append a pay cycle settings note' })
  addNote(@Body() dto: AddPayCycleNoteDto) {
    return this.service.addNote(dto);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close an open pay cycle' })
  close(@Param('id') id: string) {
    return this.service.closeCycle(id);
  }

  @Post(':id/resync')
  @ApiOperation({ summary: 'Resync hours/amount for a pay cycle from time entries' })
  resync(@Param('id') id: string) {
    return this.service.resyncCycle(id);
  }
}
