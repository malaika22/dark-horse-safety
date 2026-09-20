import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { OpsDashboardService } from './ops-dashboard.service';

@ApiTags('operations-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operations/dashboard')
export class OpsDashboardController {
  constructor(private readonly dashboard: OpsDashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Operations dashboard overview (KPIs, review queue, activity)',
  })
  overview() {
    return this.dashboard.overview();
  }

  @Post('sync')
  @ApiOperation({ summary: 'Refresh operations dashboard sync timestamp' })
  sync() {
    return this.dashboard.sync();
  }
}
