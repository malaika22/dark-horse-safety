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
  AddNoteDto,
  AddTrainingDto,
  BulkAssignDto,
  CreateEmployeeDto,
  EmployeeQueryDto,
  StartOffboardingDto,
  UpdateEmployeeDto,
  UpdateOffboardingDto,
} from './dto/employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('hr-employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'Employee list KPIs' })
  kpi() {
    return this.service.kpi();
  }

  @Get('filter-options')
  @ApiOperation({ summary: 'Filter dropdown options for employees' })
  filterOptions() {
    return this.service.filterOptions();
  }

  @Get()
  @ApiOperation({ summary: 'List employees' })
  list(@Query() query: EmployeeQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Employee detail' })
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create employee' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.service.create(dto);
  }

  @Patch('bulk-assign')
  @ApiOperation({ summary: 'Bulk assign supervisor / crew / training' })
  bulkAssign(@Body() dto: BulkAssignDto) {
    return this.service.bulkAssign(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee' })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add employee note' })
  addNote(@Param('id') id: string, @Body() dto: AddNoteDto) {
    return this.service.addNote(id, dto);
  }

  @Post(':id/training')
  @ApiOperation({ summary: 'Add training / cert record' })
  addTraining(@Param('id') id: string, @Body() dto: AddTrainingDto) {
    return this.service.addTraining(id, dto);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Trigger password reset for linked user' })
  resetPassword(@Param('id') id: string) {
    return this.service.resetPassword(id);
  }

  @Post(':id/offboarding/start')
  @ApiOperation({ summary: 'Start offboarding checklist' })
  startOffboarding(
    @Param('id') id: string,
    @Body() dto: StartOffboardingDto,
  ) {
    return this.service.startOffboarding(id, dto);
  }

  @Get(':id/offboarding')
  @ApiOperation({ summary: 'Get offboarding checklist' })
  getOffboarding(@Param('id') id: string) {
    return this.service.getOffboarding(id);
  }

  @Patch(':id/offboarding')
  @ApiOperation({ summary: 'Update offboarding checklist' })
  updateOffboarding(
    @Param('id') id: string,
    @Body() dto: UpdateOffboardingDto,
  ) {
    return this.service.updateOffboarding(id, dto);
  }

  @Get(':id/termination-preview')
  @ApiOperation({ summary: 'Termination confirmation payload' })
  terminationPreview(@Param('id') id: string) {
    return this.service.terminationPreview(id);
  }

  @Post(':id/terminate')
  @ApiOperation({ summary: 'Complete employee termination' })
  terminate(@Param('id') id: string) {
    return this.service.terminate(id);
  }
}
