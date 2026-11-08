import { Module } from '@nestjs/common';
import { AssetsModule } from './assets/assets.module';
import { FleetSchemaService } from './fleet-schema.service';
import { CalibrationModule } from './calibration/calibration.module';
import { CustomerOwnedModule } from './customer-owned/customer-owned.module';
import { FleetDashboardModule } from './dashboard/fleet-dashboard.module';
import { EquipmentRulesModule } from './equipment-rules/equipment-rules.module';
import { InspectionsModule } from './inspections/inspections.module';
import { RepairRequestsModule } from './repair-requests/repair-requests.module';
import { TrucksModule } from './trucks/trucks.module';
import { UnaccountedModule } from './unaccounted/unaccounted.module';

@Module({
  providers: [FleetSchemaService],
  imports: [
    EquipmentRulesModule,
    InspectionsModule,
    CalibrationModule,
    RepairRequestsModule,
    CustomerOwnedModule,
    FleetDashboardModule,
    TrucksModule,
    UnaccountedModule,
    AssetsModule,
  ],
  exports: [
    EquipmentRulesModule,
    InspectionsModule,
    CalibrationModule,
    RepairRequestsModule,
    CustomerOwnedModule,
    FleetDashboardModule,
    TrucksModule,
    UnaccountedModule,
    AssetsModule,
  ],
})
export class FleetModule {}
