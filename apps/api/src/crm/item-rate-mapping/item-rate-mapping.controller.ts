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
  BulkItemRateIdsDto,
  ItemRateMappingQueryDto,
  MapItemRateDto,
  UpdateItemRateAutoSyncDto,
  UpdateItemRateDhsDto,
} from './dto/item-rate-mapping.dto';
import { ItemRateMappingService } from './item-rate-mapping.service';

@ApiTags('crm-item-rate-mapping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm/item-rate-mapping')
export class ItemRateMappingController {
  constructor(private readonly service: ItemRateMappingService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'Item rate mapping KPIs' })
  kpi() {
    return this.service.kpi();
  }

  @Get()
  @ApiOperation({ summary: 'List item rate mappings' })
  list(@Query() query: ItemRateMappingQueryDto) {
    return this.service.list(query);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync NetSuite rates for mapped items' })
  sync(@Body() body?: BulkItemRateIdsDto) {
    return this.service.syncNow(body?.ids);
  }

  @Post('auto-match')
  @ApiOperation({ summary: 'Auto-match unmapped items by name' })
  autoMatch() {
    return this.service.autoMatchByName();
  }

  @Patch(':id/map')
  @ApiOperation({ summary: 'Map item to a NetSuite Item ID' })
  map(@Param('id') id: string, @Body() dto: MapItemRateDto) {
    return this.service.mapItem(id, dto);
  }

  @Post(':id/unmap')
  @ApiOperation({ summary: 'Unmap item from NetSuite' })
  unmap(@Param('id') id: string) {
    return this.service.unmap(id);
  }

  @Patch(':id/auto-sync')
  @ApiOperation({ summary: 'Toggle auto-sync for an item rate' })
  autoSync(
    @Param('id') id: string,
    @Body() dto: UpdateItemRateAutoSyncDto,
  ) {
    return this.service.setAutoSync(id, dto);
  }

  @Patch(':id/dhs-rate')
  @ApiOperation({ summary: 'Update DHS rate' })
  dhsRate(@Param('id') id: string, @Body() dto: UpdateItemRateDhsDto) {
    return this.service.setDhsRate(id, dto);
  }

  @Post(':id/accept-ns-rate')
  @ApiOperation({ summary: 'Accept NetSuite rate as DHS rate' })
  acceptNs(@Param('id') id: string) {
    return this.service.acceptNetSuiteRate(id);
  }

  @Post(':id/push-dhs-rate')
  @ApiOperation({ summary: 'Push DHS rate to NetSuite' })
  pushDhs(@Param('id') id: string) {
    return this.service.pushDhsRate(id);
  }
}
