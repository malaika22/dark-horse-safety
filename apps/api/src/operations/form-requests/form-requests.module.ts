import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FormRequestsController } from './form-requests.controller';
import { FormRequestsService } from './form-requests.service';

@Module({
  imports: [PrismaModule],
  controllers: [FormRequestsController],
  providers: [FormRequestsService],
  exports: [FormRequestsService],
})
export class FormRequestsModule {}
