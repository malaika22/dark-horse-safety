import { Module } from '@nestjs/common';
import { GpsFlagsController } from './gps-flags.controller';
import { GpsFlagsService } from './gps-flags.service';

@Module({
  controllers: [GpsFlagsController],
  providers: [GpsFlagsService],
  exports: [GpsFlagsService],
})
export class GpsFlagsModule {}
