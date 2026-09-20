import { Module } from '@nestjs/common';
import { SalesTicketsController } from './sales-tickets.controller';
import { SalesTicketsService } from './sales-tickets.service';

@Module({
  controllers: [SalesTicketsController],
  providers: [SalesTicketsService],
  exports: [SalesTicketsService],
})
export class SalesTicketsModule {}
