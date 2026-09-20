import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { HrDashboardService } from './hr-dashboard.service';

@ApiTags('hr-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/dashboard')
export class HrDashboardController {
  constructor(private readonly dashboard: HrDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'HR dashboard overview (KPIs, review queue, activity)' })
  overview() {
    return this.dashboard.overview();
  }

  @Post('sync')
  @ApiOperation({ summary: 'Refresh HR dashboard sync timestamp' })
  sync() {
    return this.dashboard.sync();
  }
}
