import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CalibrationModule } from '../calibration/calibration.module';
import { CustomerOwnedModule } from '../customer-owned/customer-owned.module';
import { InspectionsModule } from '../inspections/inspections.module';
import { RepairRequestsModule } from '../repair-requests/repair-requests.module';
import { FleetDashboardController } from './fleet-dashboard.controller';
import { FleetDashboardService } from './fleet-dashboard.service';

@Module({
  imports: [
    PrismaModule,
    RepairRequestsModule,
    CalibrationModule,
    InspectionsModule,
    CustomerOwnedModule,
  ],
  controllers: [FleetDashboardController],
  providers: [FleetDashboardService],
  exports: [FleetDashboardService],
})
export class FleetDashboardModule {}
