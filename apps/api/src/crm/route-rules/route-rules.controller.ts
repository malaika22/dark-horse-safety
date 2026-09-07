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
import { ExportQueryDto } from '../../common/dto/list-query.dto';
import {
  BulkRouteRuleIdsDto,
  CopyRouteRuleDto,
  CreateRouteRuleDto,
  RouteRuleListQueryDto,
  TestRouteCoordinateDto,
  UpdateRouteRuleDto,
} from './dto/route-rule.dto';
import { RouteRulesService } from './route-rules.service';

@ApiTags('crm-route-rules')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/route-rules')
export class RouteRulesController {
  constructor(private readonly routeRules: RouteRulesService) {}

  @Get()
  @ApiOperation({ summary: 'List route rules' })
  list(@Query() query: RouteRuleListQueryDto) {
    return this.routeRules.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Route rules KPI strip' })
  kpi() {
    return this.routeRules.kpi();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export route rules CSV or PDF' })
  export(@Query() query: ExportQueryDto & RouteRuleListQueryDto) {
    return this.routeRules.exportCsv(query);
  }

  @Get('map-pins')
  @ApiOperation({ summary: 'Map pins for route rules' })
  mapPins() {
    return this.routeRules.mapPins();
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk archive route rules' })
  bulkDelete(@Body() dto: BulkRouteRuleIdsDto) {
    return this.routeRules.bulkDelete(dto.ids);
  }

  @Post()
  @ApiOperation({ summary: 'Create route rule' })
  create(@Body() dto: CreateRouteRuleDto) {
    return this.routeRules.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Route rule detail' })
  get(@Param('id') id: string) {
    return this.routeRules.getById(id);
  }

  @Get(':id/gps-flags')
  @ApiOperation({ summary: 'Synthetic GPS flags for a route rule' })
  gpsFlags(@Param('id') id: string) {
    return this.routeRules.gpsFlags(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update route rule' })
  update(@Param('id') id: string, @Body() dto: UpdateRouteRuleDto) {
    return this.routeRules.update(id, dto);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive route rule' })
  archive(@Param('id') id: string) {
    return this.routeRules.archive(id);
  }

  @Post(':id/copy-to-location')
  @ApiOperation({ summary: 'Copy route rule to another location' })
  copyToLocation(@Param('id') id: string, @Body() dto: CopyRouteRuleDto) {
    return this.routeRules.copyToLocation(id, dto.locationId);
  }

  @Post(':id/test-coordinate')
  @ApiOperation({ summary: 'Test sample coordinate against geofence' })
  testCoordinate(
    @Param('id') id: string,
    @Body() dto: TestRouteCoordinateDto,
  ) {
    return this.routeRules.testCoordinate(id, dto.lat, dto.lng);
  }
}
