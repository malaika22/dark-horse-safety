import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import {
  BulkReviewDto,
  CustomerOwnedListQueryDto,
} from './dto/customer-owned.dto';
import { CustomerOwnedService } from './customer-owned.service';

@ApiTags('fleet-customer-owned')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fleet/customer-owned')
export class CustomerOwnedController {
  constructor(private readonly service: CustomerOwnedService) {}

  @Get()
  @ApiOperation({ summary: 'List customer-owned equipment' })
  list(@Query() query: CustomerOwnedListQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'List customer-owned equipment (POST body filters)' })
  listPost(@Body() query: CustomerOwnedListQueryDto) {
    return this.service.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Customer-owned equipment KPI strip' })
  kpi() {
    return this.service.kpi();
  }

  @Post('bulk-review')
  @ApiOperation({ summary: 'Mark customer-owned equipment reviewed' })
  bulkReview(@Body() dto: BulkReviewDto) {
    return this.service.bulkMarkReviewed(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Customer-owned equipment detail' })
  get(@Param('id') id: string) {
    return this.service.getById(id);
  }
}
