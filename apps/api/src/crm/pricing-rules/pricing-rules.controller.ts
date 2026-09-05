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
  BulkPricingRuleIdsDto,
  CreatePricingRuleDto,
  PricingRuleListQueryDto,
  UpdatePricingRuleDto,
} from './dto/pricing-rule.dto';
import { PricingRulesService } from './pricing-rules.service';

@ApiTags('crm-pricing-rules')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/pricing-rules')
export class PricingRulesController {
  constructor(private readonly pricingRules: PricingRulesService) {}

  @Get()
  @ApiOperation({ summary: 'List pricing rules' })
  list(@Query() query: PricingRuleListQueryDto) {
    return this.pricingRules.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Pricing rules KPI strip' })
  kpi() {
    return this.pricingRules.kpi();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export pricing rules CSV or PDF' })
  export(@Query() query: ExportQueryDto & PricingRuleListQueryDto) {
    return this.pricingRules.exportCsv(query);
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk archive pricing rules' })
  bulkDelete(@Body() dto: BulkPricingRuleIdsDto) {
    return this.pricingRules.bulkDelete(dto.ids);
  }

  @Post()
  @ApiOperation({ summary: 'Create pricing rule' })
  create(@Body() dto: CreatePricingRuleDto) {
    return this.pricingRules.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Pricing rule detail' })
  get(@Param('id') id: string) {
    return this.pricingRules.getById(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Pricing rule history events' })
  history(@Param('id') id: string) {
    return this.pricingRules.history(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update pricing rule' })
  update(@Param('id') id: string, @Body() dto: UpdatePricingRuleDto) {
    return this.pricingRules.update(id, dto);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive pricing rule' })
  archive(@Param('id') id: string) {
    return this.pricingRules.archive(id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate pricing rule' })
  duplicate(@Param('id') id: string) {
    return this.pricingRules.duplicate(id);
  }
}
