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
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { UnaccountedService } from './unaccounted.service';

class ReportMissingDto {
  @IsString()
  @MaxLength(160)
  assetLabel!: string;

  @IsString()
  @MaxLength(40)
  assetCode!: string;

  @IsNumber()
  @Min(0)
  replacementValue!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastTruck?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastHolder?: string;
}

class ExtendWindowDto {
  @IsNumber()
  @Min(1)
  days!: number;
}

class ChargeTechnicianDto {
  @IsIn(['BONUS', 'PAY'])
  method!: 'BONUS' | 'PAY';

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsBoolean()
  notify!: boolean;
}

@ApiTags('fleet-unaccounted')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fleet/unaccounted')
export class UnaccountedController {
  constructor(private readonly service: UnaccountedService) {}

  @Get()
  @ApiOperation({ summary: 'List unaccounted equipment' })
  list(@Query('q') q?: string, @Query('status') status?: string) {
    return this.service.list(q, status);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Unaccounted equipment KPI strip' })
  kpi() {
    return this.service.kpi();
  }

  @Post('report')
  @ApiOperation({ summary: 'Report a missing asset' })
  report(@Body() dto: ReportMissingDto) {
    return this.service.report(dto);
  }

  @Post(':id/extend')
  extend(@Param('id') id: string, @Body() dto: ExtendWindowDto) {
    return this.service.extend(id, dto.days);
  }

  @Post(':id/recover')
  recover(@Param('id') id: string) {
    return this.service.recover(id);
  }

  @Post(':id/write-off')
  writeOff(@Param('id') id: string) {
    return this.service.writeOff(id);
  }

  @Post(':id/charge')
  charge(@Param('id') id: string, @Body() dto: ChargeTechnicianDto) {
    return this.service.charge(id, dto);
  }
}
