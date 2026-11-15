import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MobileModule } from '../mobile/mobile.module';
import { DataSyncService } from './data-sync.service';

@Module({
  imports: [ScheduleModule.forRoot(), MobileModule],
  providers: [DataSyncService],
})
export class DataSyncModule {}
