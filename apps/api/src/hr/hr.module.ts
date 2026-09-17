import { Module } from '@nestjs/common';
import { EmployeesModule } from './employees/employees.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';

@Module({
  imports: [EmployeesModule, TimeEntriesModule],
})
export class HrModule {}
