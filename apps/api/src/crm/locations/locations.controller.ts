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
  BulkLocationIdsDto,
  CreateLocationDto,
  LocationListQueryDto,
  UpdateLocationDto,
} from './dto/location.dto';
import { LocationsService } from './locations.service';

@ApiTags('crm-locations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'List locations' })
  list(@Query() query: LocationListQueryDto) {
    return this.locations.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Location list KPI strip' })
  kpi() {
    return this.locations.kpi();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export locations CSV' })
  export(@Query() query: ExportQueryDto & LocationListQueryDto) {
    return this.locations.exportCsv(query);
  }

  @Get('map-pins')
  @ApiOperation({ summary: 'Map pins for locations' })
  mapPins() {
    return this.locations.mapPins();
  }

  @Post('bulk/archive')
  @ApiOperation({ summary: 'Bulk archive locations' })
  bulkArchive(@Body() dto: BulkLocationIdsDto) {
    return this.locations.bulkArchive(dto.ids);
  }

  @Post()
  @ApiOperation({ summary: 'Create location' })
  create(@Body() dto: CreateLocationDto) {
    return this.locations.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Location detail' })
  get(@Param('id') id: string) {
    return this.locations.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update location' })
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.locations.update(id, dto);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive location' })
  archive(@Param('id') id: string) {
    return this.locations.archive(id);
  }
}
