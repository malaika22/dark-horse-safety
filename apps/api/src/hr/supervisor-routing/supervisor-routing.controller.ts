import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import {
  CreateSupervisorRouteDto,
  SupervisorRoutingQueryDto,
} from './dto/supervisor-routing.dto';
import { SupervisorRoutingService } from './supervisor-routing.service';

@ApiTags('hr-supervisor-routing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/supervisor-routing')
export class SupervisorRoutingController {
  constructor(private readonly service: SupervisorRoutingService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'Supervisor routing KPIs' })
  kpi() {
    return this.service.kpi();
  }

  @Get()
  @ApiOperation({ summary: 'Supervisor routing overview by manager tier' })
  overview(@Query() query: SupervisorRoutingQueryDto) {
    return this.service.overview(query);
  }

  @Post()
  @ApiOperation({ summary: 'Add supervisor route' })
  create(@Body() dto: CreateSupervisorRouteDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supervisor route' })
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }
}
