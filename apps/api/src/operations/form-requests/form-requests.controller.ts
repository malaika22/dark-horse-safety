import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { FormRequestActionDto } from './dto/form-request.dto';
import { FormRequestsService } from './form-requests.service';

@ApiTags('operations-form-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operations')
export class FormRequestsController {
  constructor(private readonly service: FormRequestsService) {}

  @Get('form-corrections')
  @ApiOperation({ summary: 'Form correction request queue' })
  listCorrections() {
    return this.service.listCorrections();
  }

  @Get('form-corrections/:id')
  @ApiOperation({ summary: 'Form correction request detail' })
  getCorrection(@Param('id') id: string) {
    return this.service.getCorrection(id);
  }

  @Post('form-corrections/:id/approve')
  approveCorrection(
    @Param('id') id: string,
    @Body() dto: FormRequestActionDto,
  ) {
    return this.service.approveCorrection(id, dto);
  }

  @Post('form-corrections/:id/deny')
  denyCorrection(@Param('id') id: string, @Body() dto: FormRequestActionDto) {
    return this.service.denyCorrection(id, dto);
  }

  @Post('form-corrections/:id/more-info')
  moreInfoCorrection(
    @Param('id') id: string,
    @Body() dto: FormRequestActionDto,
  ) {
    return this.service.moreInfoCorrection(id, dto);
  }

  @Get('additional-form-requests')
  @ApiOperation({ summary: 'Additional form request queue' })
  listAdditional() {
    return this.service.listAdditional();
  }

  @Get('additional-form-requests/:id')
  @ApiOperation({ summary: 'Additional form request detail' })
  getAdditional(@Param('id') id: string) {
    return this.service.getAdditional(id);
  }

  @Post('additional-form-requests/:id/approve')
  approveAdditional(
    @Param('id') id: string,
    @Body() dto: FormRequestActionDto,
  ) {
    return this.service.approveAdditional(id, dto);
  }

  @Post('additional-form-requests/:id/deny')
  denyAdditional(
    @Param('id') id: string,
    @Body() dto: FormRequestActionDto,
  ) {
    return this.service.denyAdditional(id, dto);
  }

  @Post('additional-form-requests/:id/more-info')
  moreInfoAdditional(
    @Param('id') id: string,
    @Body() dto: FormRequestActionDto,
  ) {
    return this.service.moreInfoAdditional(id, dto);
  }
}
