import { Module } from '@nestjs/common';
import { CloseoutsController } from './closeouts.controller';
import { CloseoutsService } from './closeouts.service';

@Module({
  controllers: [CloseoutsController],
  providers: [CloseoutsService],
  exports: [CloseoutsService],
})
export class CloseoutsModule {}
