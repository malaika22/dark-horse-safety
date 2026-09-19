import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { PayrollReviewQueryDto } from './dto/payroll-review.dto';
import { PayrollReviewService } from './payroll-review.service';

@ApiTags('hr-payroll-export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/payroll-export')
export class PayrollExportController {
  constructor(private readonly service: PayrollReviewService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'ADP payroll export KPIs' })
  kpi(@Query('cycleId') cycleId?: string) {
    return this.service.adpExportKpi(cycleId);
  }

  @Get('confirm')
  @ApiOperation({ summary: 'Confirm payroll export preview' })
  confirm(@Query('cycleId') cycleId?: string) {
    return this.service.adpConfirmPreview(cycleId);
  }

  @Get()
  @ApiOperation({ summary: 'List ADP payroll export rows' })
  list(@Query() query: PayrollReviewQueryDto) {
    return this.service.adpExportList(query);
  }

  @Post('export')
  @ApiOperation({ summary: 'Export payroll to ADP (create or fail)' })
  exportNow(@Query('cycleId') cycleId?: string) {
    return this.service.adpExportNow(cycleId);
  }
}
