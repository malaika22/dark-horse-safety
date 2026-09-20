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
  CancelRecurringSeriesDto,
  CreateRecurringSeriesDto,
  RecurringSeriesListQueryDto,
  UpdateRecurringSeriesDto,
} from './dto/recurring-series.dto';
import { RecurringSeriesService } from './recurring-series.service';

@ApiTags('operations-recurring-series')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operations/recurring-series')
export class RecurringSeriesController {
  constructor(private readonly service: RecurringSeriesService) {}

  @Get()
  @ApiOperation({ summary: 'List recurring work order series' })
  list(@Query() query: RecurringSeriesListQueryDto) {
    return this.service.list(query);
  }

  @Get('options')
  @ApiOperation({ summary: 'Create-series form options' })
  options() {
    return this.service.options();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recurring series detail' })
  one(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create recurring series' })
  create(@Body() dto: CreateRecurringSeriesDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update recurring series settings / template' })
  update(@Param('id') id: string, @Body() dto: UpdateRecurringSeriesDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel / end recurring series' })
  cancel(@Param('id') id: string, @Body() dto: CancelRecurringSeriesDto) {
    return this.service.cancel(id, dto);
  }
}
