import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ensureFleetTables } from './ensure-fleet-tables';

@Injectable()
export class FleetSchemaService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await ensureFleetTables(this.prisma);
  }
}
