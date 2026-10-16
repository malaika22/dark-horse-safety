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
import {
  AddCustomerOverrideDto,
  CopyEquipmentRuleDto,
  CreateEquipmentRuleDto,
  EquipmentRuleListQueryDto,
  UpdateEquipmentRuleDto,
} from './dto/equipment-rule.dto';
import { EquipmentRulesService } from './equipment-rules.service';

@ApiTags('fleet-equipment-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fleet/equipment-rules')
export class EquipmentRulesController {
  constructor(private readonly service: EquipmentRulesService) {}

  @Get()
  @ApiOperation({ summary: 'List required equipment rules' })
  list(@Query() query: EquipmentRuleListQueryDto) {
    return this.service.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Equipment rules KPI strip' })
  kpi() {
    return this.service.kpi();
  }

  @Get('insights')
  @ApiOperation({ summary: 'Equipment rules side panels' })
  insights() {
    return this.service.insights();
  }

  @Post()
  @ApiOperation({ summary: 'Create equipment rule' })
  create(@Body() dto: CreateEquipmentRuleDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Equipment rule detail' })
  get(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update equipment rule' })
  update(@Param('id') id: string, @Body() dto: UpdateEquipmentRuleDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate equipment rule' })
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  @Post(':id/copy')
  @ApiOperation({ summary: 'Copy rule to another job type' })
  copy(@Param('id') id: string, @Body() dto: CopyEquipmentRuleDto) {
    return this.service.copy(id, dto);
  }

  @Post(':id/overrides')
  @ApiOperation({ summary: 'Add customer override' })
  addOverride(@Param('id') id: string, @Body() dto: AddCustomerOverrideDto) {
    return this.service.addOverride(id, dto);
  }

  @Get(':id/affected-work-orders')
  @ApiOperation({ summary: 'Work orders affected by this rule' })
  affected(@Param('id') id: string) {
    return this.service.affectedWorkOrders(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test rule against a work order' })
  test(@Param('id') id: string, @Body() body: { workOrderId: string }) {
    return this.service.testAgainstWorkOrder(id, body.workOrderId);
  }
}
