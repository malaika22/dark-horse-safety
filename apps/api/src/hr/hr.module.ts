import { Module } from '@nestjs/common';
import { EmployeesModule } from './employees/employees.module';
import { PayCycleModule } from './pay-cycle/pay-cycle.module';
import { TimeEditRequestsModule } from './time-edit-requests/time-edit-requests.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { TimeOffModule } from './time-off/time-off.module';

@Module({
  imports: [
    EmployeesModule,
    TimeEntriesModule,
    TimeEditRequestsModule,
    TimeOffModule,
    PayCycleModule,
  ],
})
export class HrModule {}
