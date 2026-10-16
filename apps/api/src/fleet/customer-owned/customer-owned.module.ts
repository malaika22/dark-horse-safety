import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerOwnedController } from './customer-owned.controller';
import { CustomerOwnedService } from './customer-owned.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerOwnedController],
  providers: [CustomerOwnedService],
  exports: [CustomerOwnedService],
})
export class CustomerOwnedModule {}
