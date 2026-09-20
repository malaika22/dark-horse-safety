import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import {
  SafetyFormListQueryDto,
  UpdateSafetyFormDto,
} from './dto/safety-form.dto';
import { SafetyFormsService } from './safety-forms.service';

@ApiTags('safety-forms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('safety/forms')
export class SafetyFormsController {
  constructor(private readonly service: SafetyFormsService) {}

  @Get()
  @ApiOperation({ summary: 'List safety forms' })
  list(@Query() query: SafetyFormListQueryDto) {
    return this.service.list(query);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Print preview for a form submission' })
  preview(
    @Param('id') id: string,
    @Query('submissionId') submissionId?: string,
  ) {
    return this.service.preview(id, submissionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get safety form definition (builder)' })
  one(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update safety form definition' })
  update(@Param('id') id: string, @Body() dto: UpdateSafetyFormDto) {
    return this.service.update(id, dto);
  }
}
