import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { MobileAssetNoteDto, MobileCalibrationDto, MobileInspectionDto, MobileMoveDto, MobileRepairDto } from './dto/mobile.dto';
import { MobileFleetService } from './mobile-fleet.service';
import { MobileOp } from './mobile-swagger';

@ApiTags('mobile-fleet')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('mobile/v1/fleet')
export class MobileFleetController {
  constructor(private readonly fleet: MobileFleetService) {}

  @Get('truck')
  @MobileOp('FL-1 Assigned truck. Same record as Fleet → Trucks.', {
    assignedTruck: 'TRUCK 12',
    truck: { card: { id: 'truck-12', name: 'TRUCK 12', readiness: 85 } },
  })
  truck(@CurrentUser() user: AuthUser) {
    return this.fleet.truck(user.id);
  }

  @Get('assets')
  @MobileOp('FL-2 Assets on the assigned truck and assets checked out to me. Same rows as Fleet → Assets.', {
    assignedTruck: 'TRUCK 12',
    items: [{ assetCode: 'GAS-001', assetLabel: 'GAS MONITOR', status: 'READY', readiness: 100 }],
  })
  assets(@CurrentUser() user: AuthUser) {
    return this.fleet.assetsFor(user.id);
  }

  @Get('assets/:code')
  @MobileOp('FL-3 Asset detail. Same payload as the admin asset page.', { asset: { assetCode: 'GAS-001' } })
  asset(@CurrentUser() user: AuthUser, @Param('code') code: string) {
    return this.fleet.asset(user.id, code);
  }

  @Post('assets/:code/checkout')
  @MobileOp('FL-4 Check an asset out to me. Fleet → Assets shows CHECKED OUT.', { asset: { assetCode: 'GAS-001', checkedOutTo: 'A. TECH' } })
  checkout(@CurrentUser() user: AuthUser, @Param('code') code: string, @Query('clientRequestId') clientRequestId?: string) {
    return this.fleet.checkout(user.id, code, clientRequestId);
  }

  @Post('assets/:code/check-in')
  @MobileOp('FL-5 Check an asset back in. The admin asset register clears the holder.', { asset: { assetCode: 'GAS-001' } })
  checkIn(@CurrentUser() user: AuthUser, @Param('code') code: string, @Query('clientRequestId') clientRequestId?: string) {
    return this.fleet.checkIn(user.id, code, clientRequestId);
  }

  @Post('assets/:code/move')
  @MobileOp('FL-13 Move an asset. Fleet → Assets and the truck movement log show the same move.', { assetCode: 'GAS-001', to: 'TRK-05' })
  move(@CurrentUser() user: AuthUser, @Param('code') code: string, @Body() dto: MobileMoveDto) {
    return this.fleet.moveAsset(user.id, code, dto);
  }

  @Post('assets/:code/notes')
  @MobileOp('FL-14 Add a note. It appears on the asset Notes tab.', { assetCode: 'GAS-001' })
  note(@CurrentUser() user: AuthUser, @Param('code') code: string, @Body() dto: MobileAssetNoteDto) {
    return this.fleet.note(user.id, code, dto);
  }

  @Post('assets/:code/missing')
  @MobileOp('FL-6 Report an asset missing. It appears on Fleet → Unaccounted.', { assetCode: 'GAS-001', status: 'LOCATING' })
  missing(@CurrentUser() user: AuthUser, @Param('code') code: string, @Query('clientRequestId') clientRequestId?: string) {
    return this.fleet.reportMissing(user.id, code, clientRequestId);
  }

  @Get('inspections')
  @MobileOp('FL-7 Inspections for my truck. Same rows as Fleet → Inspections.', {
    assignedTruck: 'TRUCK 12',
    items: [{ code: 'INS-0001', assetCode: 'GAS-001', source: 'MOBILE_APP' }],
    total: 1,
  })
  inspections(@CurrentUser() user: AuthUser) {
    return this.fleet.inspectionsFor(user.id);
  }

  @Get('inspections/form-options')
  @MobileOp('FL-8 Checklists and assets for a new inspection. Source is always MOBILE_APP.', {
    assets: [{ assetCode: 'GAS-001' }],
    types: ['PRE-JOB', 'MONTHLY'],
    source: 'MOBILE_APP',
  })
  options(@CurrentUser() user: AuthUser) {
    return this.fleet.formOptions(user.id);
  }

  @Post('inspections')
  @MobileOp('FL-9 Submit an inspection. It is created by the admin inspections service and listed there with source MOBILE_APP.', {
    code: 'INS-0024',
    source: 'MOBILE_APP',
    result: 'PASS',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: MobileInspectionDto) {
    return this.fleet.createInspection(user.id, dto);
  }

  @Get('inspections/:id')
  @MobileOp('FL-10 Inspection detail. Same payload as the admin inspection page.', { code: 'INS-0001' })
  inspection(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.fleet.inspection(user.id, id);
  }

  @Post('calibration')
  @MobileOp('FL-15 Save a calibration. Fleet → Calibration lists the new row, with this employee as technician.', { code: 'CAL-0012', assetCode: 'GAS-001' })
  createCalibration(@CurrentUser() user: AuthUser, @Body() dto: MobileCalibrationDto) {
    return this.fleet.createCalibration(user.id, dto);
  }

  @Get('calibration/:id')
  @MobileOp('FL-16 Calibration detail. Same payload as the admin calibration page.', { code: 'CAL-0007' })
  calibrationOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.fleet.calibrationDetail(user.id, id);
  }

  @Get('calibration')
  @MobileOp('FL-11 Calibration rows for my truck. Same rows as Fleet → Calibration.', {
    assignedTruck: 'TRUCK 12',
    items: [{ assetCode: 'GAS-001', status: 'CURRENT' }],
  })
  calibration(@CurrentUser() user: AuthUser) {
    return this.fleet.calibrationFor(user.id);
  }

  @Post('repairs')
  @MobileOp('FL-17 Open a repair request. Fleet → Repair Requests lists it on the assigned truck.', { code: 'REP-2014', status: 'OPEN' })
  createRepair(@CurrentUser() user: AuthUser, @Body() dto: MobileRepairDto) {
    return this.fleet.createRepair(user.id, dto);
  }

  @Get('repairs/:id')
  @MobileOp('FL-18 Repair detail. Same payload as the admin repair page.', { code: 'REP-0001' })
  repair(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.fleet.repairDetail(user.id, id);
  }

  @Get('repairs')
  @MobileOp('FL-12 Open and closed repairs on my truck. Same rows as Fleet → Repair Requests.', {
    assignedTruck: 'TRUCK 12',
    items: [{ code: 'RR-2011', assetCode: 'GAS-001' }],
    total: 1,
  })
  repairs(@CurrentUser() user: AuthUser) {
    return this.fleet.repairsFor(user.id);
  }
}
