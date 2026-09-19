import { Module } from '@nestjs/common';
import { EmployeesModule } from './employees/employees.module';
import { GpsFlagsModule } from './gps-flags/gps-flags.module';
import { OnCallModule } from './on-call/on-call.module';
import { PayCycleModule } from './pay-cycle/pay-cycle.module';
import { PayrollReviewModule } from './payroll-review/payroll-review.module';
import { SupervisorRoutingModule } from './supervisor-routing/supervisor-routing.module';
import { TimeEditRequestsModule } from './time-edit-requests/time-edit-requests.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { TimeOffModule } from './time-off/time-off.module';
import { TrainingModule } from './training/training.module';

@Module({
  imports: [
    EmployeesModule,
    TimeEntriesModule,
    TimeEditRequestsModule,
    TimeOffModule,
    PayCycleModule,
    PayrollReviewModule,
    SupervisorRoutingModule,
    TrainingModule,
    OnCallModule,
    GpsFlagsModule,
  ],
})
export class HrModule {}
