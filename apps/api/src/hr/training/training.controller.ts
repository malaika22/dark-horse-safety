import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import {
  AssignTrainingDto,
  CreateCertificateDto,
  CreateSsePairingDto,
  CreateTrainingRecordDto,
  TrainingQueryDto,
} from './dto/training.dto';
import { TrainingService } from './training.service';

@ApiTags('hr-training')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/training')
export class TrainingController {
  constructor(private readonly service: TrainingService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Training dashboard KPIs, records, widgets' })
  dashboard() {
    return this.service.getDashboard();
  }

  @Get('records')
  @ApiOperation({ summary: 'List training records' })
  listRecords(@Query() query: TrainingQueryDto) {
    return this.service.listRecords(query);
  }

  @Get('courses')
  @ApiOperation({ summary: 'List training courses' })
  listCourses() {
    return this.service.listCourses();
  }

  @Post('records')
  @ApiOperation({ summary: 'Create training record' })
  createRecord(@Body() dto: CreateTrainingRecordDto) {
    return this.service.createRecord(dto);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign training to technicians' })
  assign(@Body() dto: AssignTrainingDto) {
    return this.service.assign(dto);
  }

  @Post('certificates')
  @ApiOperation({ summary: 'Create certificate record' })
  createCertificate(@Body() dto: CreateCertificateDto) {
    return this.service.createCertificate(dto);
  }

  @Get('sse')
  @ApiOperation({ summary: 'SSE programme dashboard' })
  sseDashboard() {
    return this.service.getSseDashboard();
  }

  @Post('sse')
  @ApiOperation({ summary: 'Create SSE mentor-mentee pairing' })
  createSse(@Body() dto: CreateSsePairingDto) {
    return this.service.createSsePairing(dto);
  }
}
