import { Module } from '@nestjs/common';
import { CalibrationModule } from './calibration/calibration.module';
import { CustomerOwnedModule } from './customer-owned/customer-owned.module';
import { FleetDashboardModule } from './dashboard/fleet-dashboard.module';
import { EquipmentRulesModule } from './equipment-rules/equipment-rules.module';
import { InspectionsModule } from './inspections/inspections.module';
import { RepairRequestsModule } from './repair-requests/repair-requests.module';

@Module({
  imports: [
    EquipmentRulesModule,
    InspectionsModule,
    CalibrationModule,
    RepairRequestsModule,
    CustomerOwnedModule,
    FleetDashboardModule,
  ],
  exports: [
    EquipmentRulesModule,
    InspectionsModule,
    CalibrationModule,
    RepairRequestsModule,
    CustomerOwnedModule,
    FleetDashboardModule,
  ],
})
export class FleetModule {}
