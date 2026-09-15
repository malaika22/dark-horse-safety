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
  BulkNetSuiteCustomerIdsDto,
  MapNetSuiteCustomerDto,
  NetSuiteCustomerMappingQueryDto,
  UpdateNetSuiteAutoExportDto,
} from './dto/netsuite-customer-mapping.dto';
import { NetSuiteCustomerMappingService } from './netsuite-customer-mapping.service';

@ApiTags('crm-netsuite-customer-mapping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm/netsuite-customer-mapping')
export class NetSuiteCustomerMappingController {
  constructor(private readonly service: NetSuiteCustomerMappingService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'NetSuite customer mapping KPIs' })
  kpi() {
    return this.service.kpi();
  }

  @Get()
  @ApiOperation({ summary: 'List NetSuite customer mappings' })
  list(@Query() query: NetSuiteCustomerMappingQueryDto) {
    return this.service.list(query);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync mapped customers to NetSuite now' })
  sync(@Body() body?: BulkNetSuiteCustomerIdsDto) {
    return this.service.syncNow(body?.ids);
  }

  @Post('auto-match')
  @ApiOperation({ summary: 'Auto-match unmatched customers by name' })
  autoMatch() {
    return this.service.autoMatchByName();
  }

  @Patch(':id/map')
  @ApiOperation({ summary: 'Map customer to a NetSuite ID' })
  map(@Param('id') id: string, @Body() dto: MapNetSuiteCustomerDto) {
    return this.service.mapCustomer(id, dto);
  }

  @Post(':id/create')
  @ApiOperation({ summary: 'Create customer record in NetSuite and map it' })
  create(@Param('id') id: string) {
    return this.service.createInNetSuite(id);
  }

  @Post(':id/unmap')
  @ApiOperation({ summary: 'Unmap customer from NetSuite' })
  unmap(@Param('id') id: string) {
    return this.service.unmap(id);
  }

  @Patch(':id/auto-export')
  @ApiOperation({ summary: 'Toggle auto-export for a customer' })
  autoExport(
    @Param('id') id: string,
    @Body() dto: UpdateNetSuiteAutoExportDto,
  ) {
    return this.service.setAutoExport(id, dto);
  }
}
