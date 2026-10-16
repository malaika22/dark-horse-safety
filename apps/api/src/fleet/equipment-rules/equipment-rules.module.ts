import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EquipmentRulesController } from './equipment-rules.controller';
import { EquipmentRulesService } from './equipment-rules.service';

@Module({
  imports: [PrismaModule],
  controllers: [EquipmentRulesController],
  providers: [EquipmentRulesService],
  exports: [EquipmentRulesService],
})
export class EquipmentRulesModule {}
