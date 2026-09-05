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
  BulkFormRuleIdsDto,
  CopyFormRuleDto,
  CreateFormRuleDto,
  FormRuleListQueryDto,
  TestFormRuleDto,
  UpdateFormRuleDto,
} from './dto/form-rule.dto';
import { FormRulesService } from './form-rules.service';

@ApiTags('crm-form-rules')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/form-rules')
export class FormRulesController {
  constructor(private readonly formRules: FormRulesService) {}

  @Get()
  @ApiOperation({ summary: 'List form rules' })
  list(@Query() query: FormRuleListQueryDto) {
    return this.formRules.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Form rules KPI strip' })
  kpi() {
    return this.formRules.kpi();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export form rules CSV or PDF' })
  export(@Query() query: ExportQueryDto & FormRuleListQueryDto) {
    return this.formRules.exportCsv(query);
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk archive form rules' })
  bulkDelete(@Body() dto: BulkFormRuleIdsDto) {
    return this.formRules.bulkDelete(dto.ids);
  }

  @Post()
  @ApiOperation({ summary: 'Create form rule' })
  create(@Body() dto: CreateFormRuleDto) {
    return this.formRules.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Form rule detail' })
  get(@Param('id') id: string) {
    return this.formRules.getById(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Form rule history events' })
  history(@Param('id') id: string) {
    return this.formRules.history(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update form rule' })
  update(@Param('id') id: string, @Body() dto: UpdateFormRuleDto) {
    return this.formRules.update(id, dto);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive form rule' })
  archive(@Param('id') id: string) {
    return this.formRules.archive(id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate form rule' })
  duplicate(@Param('id') id: string) {
    return this.formRules.duplicate(id);
  }

  @Post(':id/copy-to-customer')
  @ApiOperation({ summary: 'Copy form rule to another customer' })
  copyToCustomer(@Param('id') id: string, @Body() dto: CopyFormRuleDto) {
    return this.formRules.copyToCustomer(id, dto.customerId);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test form rule against a job type' })
  test(@Param('id') id: string, @Body() dto: TestFormRuleDto) {
    return this.formRules.test(id, dto.jobType);
  }
}
