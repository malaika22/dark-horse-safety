import { Module } from '@nestjs/common';
import { SupervisorRoutingController } from './supervisor-routing.controller';
import { SupervisorRoutingService } from './supervisor-routing.service';

@Module({
  controllers: [SupervisorRoutingController],
  providers: [SupervisorRoutingService],
  exports: [SupervisorRoutingService],
})
export class SupervisorRoutingModule {}
