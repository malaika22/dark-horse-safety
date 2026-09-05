import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { DashboardService } from './dashboard.service';

@ApiTags('crm-dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'CRM overview aggregates for dashboard widgets' })
  overview() {
    return this.dashboard.overview();
  }

  @Post('sync')
  @ApiOperation({ summary: 'Refresh CRM dashboard sync timestamp' })
  sync() {
    return this.dashboard.sync();
  }

  @Get('notifications')
  @ApiOperation({ summary: 'CRM dashboard notifications feed' })
  notifications() {
    return this.dashboard.notifications();
  }
}
