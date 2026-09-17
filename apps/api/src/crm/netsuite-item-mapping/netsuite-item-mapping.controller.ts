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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import {
  BulkNetSuiteItemIdsDto,
  MapNetSuiteItemDto,
  NetSuiteItemMappingQueryDto,
  UpdateNetSuiteItemAutoSyncDto,
} from './dto/netsuite-item-mapping.dto';
import { NetSuiteItemMappingService } from './netsuite-item-mapping.service';

@ApiTags('crm-netsuite-item-mapping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm/netsuite-item-mapping')
export class NetSuiteItemMappingController {
  constructor(private readonly service: NetSuiteItemMappingService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'NetSuite item mapping KPIs' })
  kpi() {
    return this.service.kpi();
  }

  @Get()
  @ApiOperation({ summary: 'List NetSuite item mappings' })
  list(@Query() query: NetSuiteItemMappingQueryDto) {
    return this.service.list(query);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync mapped items to NetSuite now' })
  sync(@Body() body?: BulkNetSuiteItemIdsDto) {
    return this.service.syncNow(body?.ids);
  }

  @Post('auto-match')
  @ApiOperation({ summary: 'Auto-match unmatched items by name' })
  autoMatch() {
    return this.service.autoMatchByName();
  }

  @Patch(':id/map')
  @ApiOperation({ summary: 'Map item to a NetSuite Item ID' })
  map(@Param('id') id: string, @Body() dto: MapNetSuiteItemDto) {
    return this.service.mapItem(id, dto);
  }

  @Post(':id/create')
  @ApiOperation({ summary: 'Create item in NetSuite and map it' })
  create(@Param('id') id: string) {
    return this.service.createInNetSuite(id);
  }

  @Post(':id/unmap')
  @ApiOperation({ summary: 'Unmap item from NetSuite' })
  unmap(@Param('id') id: string) {
    return this.service.unmap(id);
  }

  @Patch(':id/auto-sync')
  @ApiOperation({ summary: 'Toggle auto-sync for an item' })
  autoSync(
    @Param('id') id: string,
    @Body() dto: UpdateNetSuiteItemAutoSyncDto,
  ) {
    return this.service.setAutoSync(id, dto);
  }
}
