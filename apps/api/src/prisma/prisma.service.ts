import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      console.error(
        '[Prisma] Database connection failed. Start Postgres with: npm run db:up',
        error,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
