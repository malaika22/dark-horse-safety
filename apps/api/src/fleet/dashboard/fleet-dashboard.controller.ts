import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { FleetDashboardService } from './fleet-dashboard.service';

@ApiTags('fleet-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fleet/dashboard')
export class FleetDashboardController {
  constructor(private readonly service: FleetDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Fleet dashboard overview' })
  overview() {
    return this.service.overview();
  }
}
