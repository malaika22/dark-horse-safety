import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { QuoteVarianceQueryDto } from './dto/quote-variance.dto';
import { RateAdjustmentsQueryDto } from './dto/rate-adjustments.dto';
import { QuoteVarianceService } from './quote-variance.service';
import { RateAdjustmentsService } from './rate-adjustments.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly quoteVariance: QuoteVarianceService,
    private readonly rateAdjustments: RateAdjustmentsService,
  ) {}

  @Get('quote-variance/options')
  @ApiOperation({ summary: 'Filter options for quote variance report' })
  quoteVarianceOptions() {
    return this.quoteVariance.options();
  }

  @Get('quote-variance')
  @ApiOperation({ summary: 'Quote variance report (quoted vs invoiced)' })
  quoteVarianceReport(
    @Query() query: QuoteVarianceQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quoteVariance.report(query, user);
  }

  @Get('rate-adjustments/options')
  @ApiOperation({ summary: 'Filter options for rate adjustments report' })
  rateAdjustmentsOptions() {
    return this.rateAdjustments.options();
  }

  @Get('rate-adjustments')
  @ApiOperation({ summary: 'Rate adjustments report from sales tickets' })
  rateAdjustmentsReport(@Query() query: RateAdjustmentsQueryDto) {
    return this.rateAdjustments.report(query);
  }

  @Get('rate-adjustments/export')
  @ApiOperation({ summary: 'Export rate adjustments as CSV' })
  rateAdjustmentsExport(@Query() query: RateAdjustmentsQueryDto) {
    return this.rateAdjustments.exportCsv(query);
  }
}
