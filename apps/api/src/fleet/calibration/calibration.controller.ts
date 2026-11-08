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
  AdjustFrequencyDto,
  CalibrationListQueryDto,
  SaveCalibrationDto,
} from './dto/calibration.dto';
import { CalibrationService } from './calibration.service';

@ApiTags('fleet-calibration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fleet/calibration')
export class CalibrationController {
  constructor(private readonly service: CalibrationService) {}

  @Get()
  @ApiOperation({ summary: 'List calibration records' })
  list(@Query() query: CalibrationListQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'List calibration records (POST body filters)' })
  listPost(@Body() query: CalibrationListQueryDto) {
    return this.service.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Calibrations KPI strip' })
  kpi() {
    return this.service.kpi();
  }

  @Post('records')
  @ApiOperation({ summary: 'Record a calibration' })
  create(@Body() dto: SaveCalibrationDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Calibration detail' })
  get(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post(':id/out-of-service')
  @ApiOperation({ summary: 'Mark calibration out of service' })
  outOfService(@Param('id') id: string) {
    return this.service.markOutOfService(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a calibration record. A reason is stored with the change.' })
  update(@Param('id') id: string, @Body() dto: SaveCalibrationDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/adjust-frequency')
  @ApiOperation({ summary: 'Adjust calibration frequency' })
  adjustFrequency(@Param('id') id: string, @Body() dto: AdjustFrequencyDto) {
    return this.service.adjustFrequency(id, dto);
  }
}
