import { Module } from '@nestjs/common';
import { TimeEditRequestsController } from './time-edit-requests.controller';
import { TimeEditRequestsService } from './time-edit-requests.service';

@Module({
  controllers: [TimeEditRequestsController],
  providers: [TimeEditRequestsService],
  exports: [TimeEditRequestsService],
})
export class TimeEditRequestsModule {}
