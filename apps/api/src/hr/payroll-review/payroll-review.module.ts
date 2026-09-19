import { Module } from '@nestjs/common';
import { PayrollExportController } from './payroll-export.controller';
import { PayrollReviewController } from './payroll-review.controller';
import { PayrollReviewService } from './payroll-review.service';

@Module({
  controllers: [PayrollReviewController, PayrollExportController],
  providers: [PayrollReviewService],
  exports: [PayrollReviewService],
})
export class PayrollReviewModule {}
