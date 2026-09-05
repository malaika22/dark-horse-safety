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
import { ExportQueryDto } from '../../common/dto/list-query.dto';
import { CustomersService } from './customers.service';
import {
  BulkCustomerIdsDto,
  CreateCustomerDto,
  CustomerListQueryDto,
  UpdateCustomerDto,
} from './dto/customer.dto';

@ApiTags('crm-customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List customers (search, filter, sort, paginate)' })
  list(@Query() query: CustomerListQueryDto) {
    return this.customers.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Customer list KPI strip' })
  kpi() {
    return this.customers.kpi();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export customers CSV (view filters or selected ids)' })
  export(@Query() query: ExportQueryDto & CustomerListQueryDto) {
    return this.customers.exportCsv(query);
  }

  @Post('bulk/archive')
  @ApiOperation({ summary: 'Bulk archive customers' })
  bulkArchive(@Body() dto: BulkCustomerIdsDto) {
    return this.customers.bulkArchive(dto.ids);
  }

  @Post()
  @ApiOperation({ summary: 'Create customer' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Customer detail hub' })
  get(@Param('id') id: string) {
    return this.customers.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(id, dto);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive customer' })
  archive(@Param('id') id: string) {
    return this.customers.archive(id);
  }
}
