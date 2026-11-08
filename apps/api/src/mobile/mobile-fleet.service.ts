import { Injectable } from '@nestjs/common';
import { Employee } from '@prisma/client';
import { AssetsService } from '../fleet/assets/assets.service';
import { CalibrationService } from '../fleet/calibration/calibration.service';
import { InspectionsService } from '../fleet/inspections/inspections.service';
import { RepairRequestsService } from '../fleet/repair-requests/repair-requests.service';
import { TrucksService } from '../fleet/trucks/trucks.service';
import { UnaccountedService } from '../fleet/unaccounted/unaccounted.service';
import { MobileAssetNoteDto, MobileCalibrationDto, MobileInspectionDto, MobileMoveDto, MobileRepairDto } from './dto/mobile.dto';
import { MobileContext } from './mobile-context.service';

function personName(employee: Employee) {
  return (employee.displayName?.trim() || `${employee.firstName} ${employee.lastName}`).trim();
}

function samePlace(left?: string | null, right?: string | null) {
  const a = (left ?? '').trim().toUpperCase();
  const b = (right ?? '').trim().toUpperCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

@Injectable()
export class MobileFleetService {
  constructor(
    private readonly ctx: MobileContext,
    private readonly assets: AssetsService,
    private readonly inspections: InspectionsService,
    private readonly calibration: CalibrationService,
    private readonly repairs: RepairRequestsService,
    private readonly trucks: TrucksService,
    private readonly unaccounted: UnaccountedService,
  ) {}

  private async mine(userId: string) {
    const { employee } = await this.ctx.actor(userId);
    const overview = await this.trucks.overview();
    const truckName = employee.assignedTruck;
    const card = overview.data.cards.find(
      (item) => item.kind === 'TRUCK' && samePlace(item.name, truckName),
    );
    return { employee, name: personName(employee), truckName, card };
  }

  /** The truck the admin portal has assigned to this employee. */
  async truck(userId: string) {
    const { truckName, card } = await this.mine(userId);
    if (!card) return { data: { assignedTruck: truckName, truck: null } };
    const detail = await this.trucks.detail(card.id);
    return { data: { assignedTruck: truckName, truck: detail.data } };
  }

  /** Assets on the assigned truck, plus anything checked out to this employee. Same rows as Fleet → Assets. */
  async assetsFor(userId: string) {
    const { employee, name, truckName } = await this.mine(userId);
    const listed = await this.assets.list();
    const items = listed.data.items.filter((row) => {
      const onTruck = samePlace(row.parentTruck, truckName);
      const held = samePlace(row.holder, name) || samePlace(row.holder, employee.lastName);
      return onTruck || held;
    });
    return { data: { assignedTruck: truckName, items } };
  }

  asset(userId: string, code: string) {
    return this.ctx.actor(userId).then(() => this.assets.detail(code));
  }

  async checkout(userId: string, code: string, clientRequestId?: string) {
    const { name } = await this.mine(userId);
    return this.ctx.idempotent(userId, clientRequestId, () => this.assets.checkout(code, name));
  }

  async checkIn(userId: string, code: string, clientRequestId?: string) {
    await this.ctx.actor(userId);
    return this.ctx.idempotent(userId, clientRequestId, () => this.assets.checkIn(code));
  }

  /** Reports the asset missing through the unaccounted register the admin portal lists. */
  async reportMissing(userId: string, code: string, clientRequestId?: string) {
    const { name, card } = await this.mine(userId);
    return this.ctx.idempotent(userId, clientRequestId, async () => {
      const detail = await this.assets.detail(code);
      const asset = detail.data.asset;
      const value = Number(asset.replacementValue ?? 0);
      if (card) {
        await this.trucks.markMissing(card.id, asset.assetCode, asset.name, value, name);
        return { data: { assetCode: asset.assetCode, status: 'LOCATING' } };
      }
      const reported = await this.unaccounted.report({
        assetLabel: asset.name,
        assetCode: asset.assetCode,
        replacementValue: value,
        lastTruck: asset.home || undefined,
        lastHolder: name,
      });
      return { data: { assetCode: reported.data.assetCode, status: reported.data.status } };
    });
  }

  async inspectionsFor(userId: string) {
    const { name, truckName } = await this.mine(userId);
    const listed = await this.inspections.list({ page: 1, pageSize: 200, parentTruck: truckName || undefined });
    const last = name.split(' ').pop() ?? name;
    const items = listed.data.items.filter(
      (row) => samePlace(row.parentTruck, truckName) || samePlace(row.inspectorName, last),
    );
    return { data: { assignedTruck: truckName, items, total: items.length } };
  }

  async formOptions(userId: string) {
    const { name, truckName } = await this.mine(userId);
    const options = await this.inspections.formOptions();
    const assets = options.data.assets.filter((row) => !truckName || samePlace(row.parentTruck, truckName));
    return {
      data: {
        ...options.data,
        assets: assets.length ? assets : options.data.assets,
        inspectors: [name],
        source: 'MOBILE_APP',
      },
    };
  }

  /** Creates the inspection with source MOBILE_APP. The admin inspections list reads that same row. */
  async createInspection(userId: string, dto: MobileInspectionDto) {
    const { name, truckName } = await this.mine(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, () =>
      this.inspections.createRecord({
        ...dto,
        parentTruck: dto.parentTruck || truckName || undefined,
        inspectorName: name,
        source: 'MOBILE_APP',
      }),
    );
  }

  inspection(userId: string, id: string) {
    return this.ctx.actor(userId).then(() => this.inspections.getById(id));
  }

  calibrationDetail(userId: string, id: string) {
    return this.ctx.actor(userId).then(() => this.calibration.getById(id));
  }

  /** Same create path as Fleet → Calibration → Add record. Technician and truck come from the employee. */
  async createCalibration(userId: string, dto: MobileCalibrationDto) {
    const { name, truckName } = await this.mine(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, () =>
      this.calibration.create({
        assetCode: dto.assetCode,
        result: dto.result,
        lastCalAt: dto.lastCalAt,
        frequencyDays: dto.frequencyDays,
        calType: dto.calType,
        lot: dto.lot,
        notes: dto.notes,
        parentTruck: truckName || undefined,
        technician: name,
      }),
    );
  }

  async calibrationFor(userId: string) {
    const { truckName } = await this.mine(userId);
    const listed = await this.calibration.list({ page: 1, pageSize: 200, parentTruck: truckName || undefined });
    return { data: { assignedTruck: truckName, ...listed.data } };
  }

  repairDetail(userId: string, id: string) {
    return this.ctx.actor(userId).then(() => this.repairs.getById(id));
  }

  /** Same create path as Fleet → Repair Requests. The request is filed under the assigned truck. */
  async createRepair(userId: string, dto: MobileRepairDto) {
    const { name, truckName } = await this.mine(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, () =>
      this.repairs.create({
        assetCode: dto.assetCode,
        issue: dto.issue,
        priority: dto.priority,
        notes: dto.notes,
        parentTruck: truckName || undefined,
        reportedBy: name,
        assignedName: name,
      }),
    );
  }

  async moveAsset(userId: string, code: string, dto: MobileMoveDto) {
    const { name } = await this.mine(userId);
    return this.ctx.idempotent(userId, dto.clientRequestId, () =>
      this.assets.move(code, { to: dto.to, reason: dto.reason, movedBy: name }),
    );
  }

  note(userId: string, code: string, dto: MobileAssetNoteDto) {
    return this.ctx.idempotent(userId, dto.clientRequestId, async () => {
      await this.ctx.actor(userId);
      return this.assets.addNote(code, dto.text);
    });
  }

  async repairsFor(userId: string) {
    const { truckName } = await this.mine(userId);
    if (!truckName) return { data: { assignedTruck: null, items: [], total: 0 } };
    const listed = await this.repairs.list({ page: 1, pageSize: 200, parentTruck: truckName });
    return { data: { assignedTruck: truckName, items: listed.data.items, total: listed.data.total } };
  }
}
