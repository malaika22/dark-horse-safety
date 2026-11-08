import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UnaccountedController } from './unaccounted.controller';
import { UnaccountedService } from './unaccounted.service';

@Module({
  imports: [PrismaModule],
  controllers: [UnaccountedController],
  providers: [UnaccountedService],
  exports: [UnaccountedService],
})
export class UnaccountedModule {}
