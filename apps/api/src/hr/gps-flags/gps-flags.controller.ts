import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { GpsFlagDecisionDto } from './dto/gps-flags.dto';
import { GpsFlagsService } from './gps-flags.service';

@ApiTags('hr-gps-flags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/gps-flags')
export class GpsFlagsController {
  constructor(private readonly service: GpsFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'GPS flag review overview' })
  overview() {
    return this.service.overview();
  }

  @Get(':id')
  @ApiOperation({ summary: 'GPS flag detail' })
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Post(':id/decision')
  @ApiOperation({ summary: 'Accept, reject, or request more info' })
  decide(@Param('id') id: string, @Body() dto: GpsFlagDecisionDto) {
    return this.service.decide(id, dto);
  }
}
