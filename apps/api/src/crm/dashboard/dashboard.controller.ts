import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
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

  @Get('manager-sales-summary')
  @ApiOperation({ summary: 'Manager sales summary KPIs and per-rep performance' })
  managerSalesSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboard.managerSalesSummary({ from, to });
  }

  @Get('rep-dashboard')
  @ApiOperation({ summary: 'Sales rep My Dashboard KPIs, leaderboard, tasks, calendar, accounts' })
  repDashboard(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboard.repDashboard(user.id, { from, to });
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
