import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RepairRequestsController } from './repair-requests.controller';
import { RepairRequestsService } from './repair-requests.service';

@Module({
  imports: [PrismaModule],
  controllers: [RepairRequestsController],
  providers: [RepairRequestsService],
  exports: [RepairRequestsService],
})
export class RepairRequestsModule {}
