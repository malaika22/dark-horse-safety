import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { LookupsService } from './lookups.service';

@ApiTags('crm-lookups')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/lookups')
export class LookupsController {
  constructor(private readonly lookups: LookupsService) {}

  @Get()
  @ApiOperation({ summary: 'Static CRM form option lists' })
  all() {
    return this.lookups.all();
  }

  @Get('customers')
  @ApiOperation({ summary: 'Customer autocomplete' })
  customers(@Query('q') q?: string) {
    return this.lookups.customers(q);
  }

  @Get('reps')
  @ApiOperation({ summary: 'Reps (ADMIN / SUPERVISOR users)' })
  reps() {
    return this.lookups.reps();
  }

  @Get('locations')
  @ApiOperation({ summary: 'Location autocomplete' })
  locations(
    @Query('q') q?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.lookups.locations(q, customerId);
  }
}
