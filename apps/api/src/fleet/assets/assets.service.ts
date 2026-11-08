import { randomUUID } from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { asciiSafe, DAY_MS, fmtShortDate, shortName } from '../common/fleet.util';
import { loadFleetPlaces, type FleetPlaceCard } from '../trucks/trucks.snapshot';

export type FleetAssetRow = {
  id: string;
  assetCode: string;
  assetLabel: string;
  equipmentType: string;
  parentTruck: string | null;
  location: string | null;
  holder: string | null;
  readiness: number | null;
  calibration: string;
  calibrationTone: string;
  repair: string;
  repairTone: string;
  status: string;
  statusLabel: string;
  statusTone: string;
  replacementValue: number | null;
  valueLabel: string | null;
  blockingDispatch: boolean;
  blockingLabel: string;
  exception: string | null;
  exceptionLabel: string | null;
  exceptionTone: string | null;
  exceptions: string[];
  inspectionId: string | null;
  calibrationId: string | null;
  repairId: string | null;
  unaccountedId: string | null;
  checkoutDue: string | null;
  checkoutRef: string | null;
  lastCheckInAt: string | null;
  dailyRate: number | null;
  rentalVendor: string | null;
};

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function money(value: number | null) {
  if (value == null) return null;
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function equipmentType(label: string) {
  const value = label.toUpperCase();
  if (value.includes('MONITOR')) return 'GAS MONITOR';
  if (value.includes('TRAILER')) return 'AIR TRAILER';
  if (value.includes('CYL') || value.includes('CALIB')) return 'CAL CYLINDER';
  if (value.includes('SCBA')) return 'SCBA';
  if (value.includes('REGUL')) return 'REGULATOR';
  if (value.includes('SENSOR')) return 'SENSOR MODULE';
  return value.slice(0, 28);
}

function isPlace(name: string | null) {
  return Boolean(name && /yard|bay|shop|hq|location|storage/i.test(name));
}

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async catalog() {
    const [calibrations, inspections, repairs, missing] = await Promise.all([
      this.prisma.fleetCalibration.findMany({
        where: { archivedAt: null },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.fleetInspection.findMany({
        where: { archivedAt: null },
        orderBy: { inspectedAt: 'desc' },
      }),
      this.prisma.fleetRepairRequest.findMany({
        where: { archivedAt: null, status: { notIn: ['CLOSED', 'CANCELLED'] } },
        orderBy: { reportedAt: 'desc' },
      }),
      this.prisma.unaccountedAsset.findMany({
        where: { archivedAt: null, status: { not: 'RECOVERED' } },
      }),
    ]);

    const byCode = new Map<string, FleetAssetRow>();
    const touch = (code: string, label: string) => {
      const key = asciiSafe(code.trim().toUpperCase());
      let row = byCode.get(key);
      if (!row) {
        row = {
          id: slug(key),
          assetCode: key,
          assetLabel: asciiSafe(label.trim().toUpperCase()) || key,
          equipmentType: equipmentType(label || key),
          parentTruck: null,
          location: null,
          holder: null,
          readiness: 100,
          calibration: 'N/A',
          calibrationTone: 'neutral',
          repair: 'NONE',
          repairTone: 'neutral',
          status: 'READY',
          statusLabel: 'READY',
          statusTone: 'success',
          replacementValue: null,
          valueLabel: null,
          blockingDispatch: false,
          blockingLabel: 'NO',
          exception: null,
          exceptionLabel: null,
          exceptionTone: null,
          exceptions: [],
          inspectionId: null,
          calibrationId: null,
          repairId: null,
          unaccountedId: null,
          checkoutDue: null,
          checkoutRef: null,
          lastCheckInAt: null,
          dailyRate: null,
          rentalVendor: null,
        };
        byCode.set(key, row);
      }
      return row;
    };

    for (const cal of calibrations) {
      const row = touch(cal.assetCode, cal.assetLabel || cal.model || cal.assetCode);
      if (!row.parentTruck && cal.parentTruck) row.parentTruck = asciiSafe(cal.parentTruck.toUpperCase());
      row.calibrationId = row.calibrationId ?? cal.id;
      const expired =
        cal.status === 'OVERDUE' ||
        cal.status === 'OUT_OF_SERVICE' ||
        (cal.nextDueAt && cal.nextDueAt.getTime() < Date.now());
      if (expired) {
        row.calibration = 'EXPIRED';
        row.calibrationTone = 'danger';
      } else if (cal.status === 'DUE_SOON' && row.calibration !== 'EXPIRED') {
        row.calibration = 'DUE SOON';
        row.calibrationTone = 'warning';
      } else if (row.calibration === 'N/A') {
        row.calibration = 'CURRENT';
        row.calibrationTone = 'success';
      }
    }

    for (const inspection of inspections) {
      const row = touch(inspection.assetCode, inspection.assetLabel);
      if (!row.parentTruck && inspection.parentTruck) {
        row.parentTruck = asciiSafe(inspection.parentTruck.toUpperCase());
      }
      row.inspectionId = row.inspectionId ?? inspection.id;
      const flags = (inspection.flags ?? {}) as { outOfService?: boolean };
      if (flags.outOfService) row.status = 'OUT_OF_SERVICE';
      if (inspection.result === 'FAILED' && !row.exceptions.includes('FAILED_INSPECTION')) {
        row.exceptions.push('FAILED_INSPECTION');
      }
    }

    for (const repair of repairs) {
      const row = touch(repair.assetCode, repair.assetLabel);
      if (!row.parentTruck && repair.parentTruck) row.parentTruck = asciiSafe(repair.parentTruck.toUpperCase());
      row.repairId = repair.id;
      row.repair = 'OPEN';
      row.repairTone = 'danger';
    }

    for (const item of missing) {
      const row = touch(item.assetCode, item.assetLabel);
      row.unaccountedId = item.id;
      row.replacementValue = Number(item.replacementValue);
      row.valueLabel = money(row.replacementValue);
      row.holder = item.lastHolder;
      if (!row.parentTruck && item.lastTruck) row.parentTruck = asciiSafe(item.lastTruck.toUpperCase());
      if (!row.exceptions.includes('MISSING')) row.exceptions.push('MISSING');
    }

    for (const saved of await this.savedProfiles()) {
      const row = touch(saved.code, saved.profile.name || saved.code);
      if (saved.profile.home) row.parentTruck = asciiSafe(saved.profile.home.toUpperCase());
      if (saved.profile.replacementValue != null) {
        row.replacementValue = saved.profile.replacementValue;
        row.valueLabel = money(saved.profile.replacementValue);
      }
      if (saved.profile.checkedOutTo) {
        row.holder = saved.profile.checkedOutTo;
        row.status = 'CHECKED_OUT';
      }
      row.checkoutDue = saved.profile.checkoutDue || null;
      row.checkoutRef = saved.profile.checkoutRef || null;
      row.lastCheckInAt = saved.profile.lastCheckInAt || null;
      row.dailyRate = saved.profile.dailyRate;
      row.rentalVendor = saved.profile.rentalVendor || null;
      if (saved.profile.status === 'OUT OF SERVICE' || saved.profile.status === 'RETIRED') {
        row.status = 'OUT_OF_SERVICE';
      }
      const kind = inferKind(saved.code, saved.profile.name || saved.profile.category, saved.profile.kind);
      if (
        kind === 'CONSUMABLE' &&
        saved.profile.quantity != null &&
        saved.profile.minimum != null &&
        saved.profile.quantity < saved.profile.minimum &&
        !row.exceptions.includes('LOW_STOCK')
      ) {
        row.exceptions.push('LOW_STOCK');
      }
    }

    const rows = [...byCode.values()].map((row) => this.score(row));
    rows.sort((a, b) => (a.readiness ?? 101) - (b.readiness ?? 101));
    return rows;
  }

  private score(row: FleetAssetRow): FleetAssetRow {
    const failed = row.exceptions.includes('FAILED_INSPECTION');
    const missing = row.exceptions.includes('MISSING');
    const expired = row.calibration === 'EXPIRED';
    const open = row.repair === 'OPEN';
    const out = row.status === 'OUT_OF_SERVICE';
    const low = row.exceptions.includes('LOW_STOCK');
    const checked = row.status === 'CHECKED_OUT';
    let readiness: number | null = 100;
    if (expired) readiness -= 45;
    else if (row.calibration === 'DUE SOON') readiness -= 12;
    if (failed) readiness -= 30;
    if (open) readiness -= 20;
    if (out) readiness = 0;
    if (missing) readiness = null;
    else readiness = Math.max(0, Math.min(100, readiness));

    const exceptions: string[] = [];
    if (missing) exceptions.push('MISSING');
    if (out) exceptions.push('OUT_OF_SERVICE');
    if (failed) exceptions.push('FAILED_INSPECTION');
    if (expired) exceptions.push('CALIBRATION_EXPIRED');
    if (open) exceptions.push('OPEN_REPAIR');
    if (low) exceptions.push('LOW_STOCK');
    const exception = exceptions[0] ?? null;

    const blocking = out || failed || (expired && row.equipmentType === 'GAS MONITOR');

    let status = 'READY';
    if (row.status === 'OUT_OF_SERVICE') status = 'OUT_OF_SERVICE';
    else if (missing || checked) status = 'CHECKED_OUT';
    else if (exception || (readiness != null && readiness < 85)) status = 'NEEDS_REVIEW';

    const tone =
      status === 'READY' ? 'success' : status === 'OUT_OF_SERVICE' || status === 'CHECKED_OUT' ? 'danger' : 'warning';
    const exceptionTone =
      exception === 'OPEN_REPAIR' || exception === 'LOW_STOCK' ? 'warning' : exception ? 'danger' : null;

    return {
      ...row,
      readiness,
      location: isPlace(row.parentTruck) ? row.parentTruck : row.holder ? `CHECKED OUT · ${row.holder}` : null,
      parentTruck: isPlace(row.parentTruck) ? null : row.parentTruck,
      exception,
      exceptionLabel: exception ? exception.replace(/_/g, ' ') : null,
      exceptionTone,
      exceptions,
      status,
      statusLabel: status.replace(/_/g, ' '),
      statusTone: tone,
      blockingDispatch: blocking,
      blockingLabel: blocking
        ? row.equipmentType === 'GAS MONITOR'
          ? 'YES · REQUIRED'
          : 'YES'
        : missing
          ? 'CHECKED OUT'
          : 'NO',
      valueLabel: row.valueLabel,
    };
  }

  async list() {
    const items = await this.catalog();
    const ready = items.filter((row) => row.status === 'READY').length;
    const review = items.filter((row) => row.status === 'NEEDS_REVIEW').length;
    const out = items.filter((row) => row.status === 'OUT_OF_SERVICE').length;
    const checked = items.filter((row) => row.status === 'CHECKED_OUT').length;
    return {
      data: {
        cells: [
          { title: 'Total Assets', value: String(items.length), meta: 'ALL ASSETS' },
          { title: 'Ready', value: String(ready), meta: `OF ${items.length} SHOWN` },
          { title: 'Needs Review', value: String(review), meta: `OF ${items.length} SHOWN` },
          { title: 'Out of Service', value: String(out), meta: `OF ${items.length} SHOWN` },
          { title: 'Checked Out', value: String(checked), meta: `OF ${items.length} SHOWN` },
        ],
        items,
      },
    };
  }

  async readiness() {
    const catalog = await this.catalog();
    const items = catalog.flatMap((row) =>
      row.exceptions.map((key) => ({
        ...row,
        id: `${row.id}-${key.toLowerCase()}`,
        exception: key,
        exceptionLabel: key.replace(/_/g, ' '),
        exceptionTone: key === 'OPEN_REPAIR' ? 'warning' : 'danger',
      })),
    );
    const count = (key: string) => items.filter((row) => row.exception === key).length;
    const trucks = new Set(
      items.map((row) => row.parentTruck).filter((name): name is string => Boolean(name)),
    );
    return {
      data: {
        cells: [
          {
            title: 'Assets Ready',
            value: String(catalog.filter((row) => row.status === 'READY').length),
            meta: 'NO EXCEPTION',
          },
          { title: 'Expired Calib', value: String(count('CALIBRATION_EXPIRED')), filterKey: 'CALIBRATION_EXPIRED' },
          { title: 'Failed Insp', value: String(count('FAILED_INSPECTION')), filterKey: 'FAILED_INSPECTION' },
          { title: 'Open Repair', value: String(count('OPEN_REPAIR')), filterKey: 'OPEN_REPAIR' },
          { title: 'Out of Service', value: String(count('OUT_OF_SERVICE')), filterKey: 'OUT_OF_SERVICE' },
          { title: 'Missing', value: String(count('MISSING')), filterKey: 'MISSING' },
          { title: 'Low Stock', value: String(count('LOW_STOCK')), filterKey: 'LOW_STOCK' },
          { title: 'Trucks w/ Issues', value: String(trucks.size), meta: 'PARENT TRUCKS' },
        ],
        items,
      },
    };
  }

  daysUntil(date: Date | null) {
    if (!date) return null;
    return Math.ceil((date.getTime() - Date.now()) / DAY_MS);
  }

  labelDate(date: Date | null) {
    return fmtShortDate(date);
  }

  async detail(code: string) {
    const items = await this.catalog();
    const key = this.resolveCode(code, items);
    const row = items.find((item) => item.assetCode === key);
    const stored = await this.readProfile(key);
    const [calibration, repair, snap] = await Promise.all([
      this.prisma.fleetCalibration.findFirst({
        where: { assetCode: key, archivedAt: null },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.fleetRepairRequest.findFirst({
        where: { assetCode: key, archivedAt: null, status: { notIn: ['CLOSED', 'CANCELLED'] } },
        orderBy: { reportedAt: 'desc' },
      }),
      loadFleetPlaces(this.prisma),
    ]);
    const home = stored.home || row?.parentTruck || (row?.location && !row.location.startsWith('CHECKED OUT') ? row.location : '') || '';
    const from = snap.cards.find((card) => card.name === home) ?? null;
    const kind = inferKind(key, stored.name || row?.assetLabel || key, stored.kind);
    const asset = {
      assetCode: key,
      kind,
      name: stored.name || row?.assetLabel || key,
      category: stored.category || row?.equipmentType || '',
      serial: stored.serial || calibration?.serial || '',
      manufacturer: stored.manufacturer || '',
      model: stored.model || calibration?.model || '',
      home,
      technician: stored.technician || from?.driver || row?.holder || '',
      status: stored.status || (kind === 'CONSUMABLE' ? 'STOCKED' : row?.statusLabel || 'READY'),
      replacementValue: stored.replacementValue ?? row?.replacementValue ?? null,
      purchaseDate: stored.purchaseDate || '',
      purchaseOrder: stored.purchaseOrder || '',
      vendor: stored.vendor || '',
      warrantyExpires: stored.warrantyExpires || '',
      rentalAgreement: stored.rentalAgreement || '',
      rentalVendor: stored.rentalVendor || '',
      dailyRate: stored.dailyRate,
      rentalStart: stored.rentalStart || '',
      contractedReturn: stored.contractedReturn || '',
      quantity: stored.quantity,
      minimum: stored.minimum,
      unit: stored.unit || 'EACH',
      unitCost: stored.unitCost,
      preferredVendor: stored.preferredVendor || '',
      lastPurchaseOrder: stored.lastPurchaseOrder || '',
      condition: stored.condition || 'GOOD',
      sizeClass: stored.sizeClass || '',
      agent: stored.agent || '',
      clocks: stored.clocks.length ? stored.clocks : clocksFor(kind, stored.category || row?.equipmentType || ''),
      photoUrl: stored.photoUrl,
      documents: stored.documents,
      notes: stored.notes,
      checkedOutTo: stored.checkedOutTo,
      calibrationRequired: stored.calibrationRequired || (kind === 'CONSUMABLE' ? 'NO' : 'YES'),
      calibrationDate: stored.calibrationDate || (calibration?.lastCalAt ? calibration.lastCalAt.toISOString().slice(0, 10) : ''),
      calibrationInterval: stored.calibrationInterval || (calibration ? `${calibration.frequencyDays} DAYS` : ''),
      nextCalibrationDue: stored.nextCalibrationDue || (calibration?.nextDueAt ? calibration.nextDueAt.toISOString().slice(0, 10) : ''),
      bumpTestDate: stored.bumpTestDate,
      bumpResult: stored.bumpResult,
      sensors: stored.sensors,
      cylinderSize: stored.cylinderSize || stored.sizeClass,
      cylinderMaterial: stored.cylinderMaterial,
      noteLog: stored.noteLog,
      calibration: row?.calibration ?? 'N/A',
      repairCode: repair?.code ?? null,
      repairId: repair?.id ?? null,
      holder: row?.holder ?? stored.checkedOutTo ?? null,
      equipmentType: row?.equipmentType ?? kind,
      readiness: row?.readiness ?? null,
      exists: Boolean(row) || Boolean(stored.name),
    };
    const record = await this.recordFor(key, asset, row?.readiness ?? null);
    return {
      data: {
        asset,
        from: from ? placeView(from) : home ? { id: slug(home), name: home, kind: 'TRUCK', unit: '', driver: null, assets: 0, readiness: null } : null,
        places: snap.cards.map(placeView),
        employees: snap.employees.map((employee) => ({
          id: employee.id,
          name: employee.displayName?.trim() || shortName(employee.firstName, employee.lastName),
        })),
        peers: items.map((item) => item.assetCode),
        record,
      },
    };
  }

  async save(code: string, body: AssetProfileInput) {
    const items = await this.catalog();
    const key = this.resolveCode(code, items);
    const current = await this.readProfile(key);
    const next = normalizeProfile(current, body);
    if (!next.name.trim()) throw new BadRequestException('Asset name is required');
    if (!next.home.trim()) throw new BadRequestException('Home location is required');
    await this.writeProfile(key, next);
    const home = asciiSafe(next.home.trim().toUpperCase());
    await Promise.all([
      this.prisma.fleetCalibration.updateMany({
        where: { assetCode: key, archivedAt: null },
        data: {
          parentTruck: home,
          assetLabel: asciiSafe(next.name.trim().toUpperCase()),
          ...(next.model ? { model: asciiSafe(next.model) } : {}),
          ...(next.serial ? { serial: asciiSafe(next.serial) } : {}),
        },
      }),
      this.prisma.fleetInspection.updateMany({
        where: { assetCode: key, archivedAt: null },
        data: { parentTruck: home, assetLabel: asciiSafe(next.name.trim().toUpperCase()) },
      }),
      this.prisma.fleetRepairRequest.updateMany({
        where: { assetCode: key, archivedAt: null, status: { notIn: ['CLOSED', 'CANCELLED'] } },
        data: { parentTruck: home },
      }),
    ]);
    await this.syncCalibration(key, next);
    return this.detail(key);
  }

  async create(body: AssetProfileInput & { assetCode?: string }) {
    const items = await this.catalog();
    const requested = asciiSafe(body.assetCode ?? '').trim().toUpperCase();
    const key = requested || this.nextCode(items, body.category || body.name || '');
    const errors: Record<string, string[]> = {};
    if (items.some((item) => item.assetCode === key)) {
      errors.assetCode = [`${key} already exists. Asset ids must be unique.`];
    }
    const serial = asciiSafe(body.serial ?? '').trim();
    if (serial) {
      const taken = await this.prisma.fleetCalibration.findFirst({
        where: { serial: { equals: serial, mode: 'insensitive' }, archivedAt: null },
      });
      const saved = (await this.savedProfiles()).find(
        (row) => row.code !== key && row.profile.serial.toUpperCase() === serial.toUpperCase(),
      );
      const owner = taken && taken.assetCode.toUpperCase() !== key ? taken.assetCode : saved?.code;
      if (owner) errors.serial = [`Serial already registered to ${owner}`];
    }
    if (body.calibrationDate && body.nextCalibrationDue && body.nextCalibrationDue <= body.calibrationDate) {
      errors.nextCalibrationDue = ['Must be after the calibration date'];
    }
    const kind = inferKind(key, `${body.name ?? ''} ${body.category ?? ''}`, body.kind ?? '');
    if (kind !== 'CONSUMABLE' && (body.replacementValue == null || Number(body.replacementValue) <= 0)) {
      errors.replacementValue = ['Required. Used for unaccounted equipment value.'];
    }
    if (!asciiSafe(body.name ?? '').trim()) errors.name = ['Asset name is required'];
    if (!asciiSafe(body.home ?? '').trim()) errors.home = ['Home is required'];
    const count = Object.keys(errors).length;
    if (count) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `${count} field${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} attention`,
        details: errors,
      });
    }
    const next = normalizeProfile(emptyProfile(), { ...body, kind });
    await this.writeProfile(key, next);
    await this.syncCalibration(key, next);
    return this.detail(key);
  }

  async bulk(codes: string[], action: string, to?: string) {
    const unique = [...new Set(codes.map((code) => asciiSafe(code).trim().toUpperCase()).filter(Boolean))];
    if (!unique.length) throw new BadRequestException('Select at least one asset');
    if ((action === 'MOVE' || action === 'ASSIGN') && !asciiSafe(to ?? '').trim()) {
      throw new BadRequestException('Choose a truck or location');
    }
    for (const code of unique) {
      if (action === 'MOVE') {
        await this.move(code, { to: to ?? '', reason: 'JOB ASSIGNMENT', newParentTruck: 'N/A' });
      } else if (action === 'ASSIGN') {
        await this.move(code, { to: to ?? '', reason: 'JOB ASSIGNMENT', newParentTruck: to });
      } else if (action === 'OUT_OF_SERVICE') {
        await this.markOut(code);
      }
    }
    return { data: { updated: unique.length, message: asciiSafe(`${unique.length} ASSETS UPDATED`) } };
  }

  async checkout(
    code: string,
    technician: string,
    due?: string,
    reference?: string,
  ) {
    const items = await this.catalog();
    const key = this.resolveCode(code, items);
    const name = asciiSafe(technician.trim());
    if (!name) throw new BadRequestException('Technician is required');
    const profile = await this.readProfile(key);
    profile.checkedOutTo = name;
    profile.checkoutDue = due?.trim() ? due.trim().slice(0, 10) : profile.checkoutDue || '';
    profile.checkoutRef = reference?.trim()
      ? asciiSafe(reference.trim())
      : profile.checkoutRef || '';
    profile.lastCheckInAt = '';
    if (!profile.name) profile.name = key;
    await this.writeProfile(key, profile);
    return this.detail(key);
  }

  async checkIn(code: string) {
    const items = await this.catalog();
    const key = this.resolveCode(code, items);
    const profile = await this.readProfile(key);
    profile.lastCheckInAt = new Date().toISOString();
    profile.lastCheckInBy = profile.checkedOutTo || '';
    profile.checkedOutTo = '';
    profile.checkoutDue = '';
    if (!profile.name) profile.name = key;
    await this.writeProfile(key, profile);
    return this.detail(key);
  }

  async retire(code: string) {
    const items = await this.catalog();
    const key = this.resolveCode(code, items);
    await this.markOut(key);
    const profile = await this.readProfile(key);
    profile.status = 'RETIRED';
    if (!profile.name) profile.name = key;
    await this.writeProfile(key, profile);
    return this.detail(key);
  }

  async addNote(code: string, textValue: string) {
    const items = await this.catalog();
    const key = this.resolveCode(code, items);
    const note = asciiSafe(textValue.trim());
    if (!note) throw new BadRequestException('Note is required');
    const profile = await this.readProfile(key);
    if (!profile.name) profile.name = items.find((item) => item.assetCode === key)?.assetLabel || key;
    profile.noteLog.unshift({ id: randomUUID(), text: note, at: new Date().toISOString() });
    profile.notes = note;
    await this.writeProfile(key, profile);
    return this.detail(key);
  }

  async move(
    code: string,
    body: {
      to: string;
      reason: string;
      newParentTruck?: string;
      checkedOutTo?: string;
      movedBy?: string;
      notes?: string;
    },
  ) {
    const items = await this.catalog();
    const key = this.resolveCode(code, items);
    const current = await this.detail(key);
    const fromName = current.data.from?.name || current.data.asset.home;
    const destination = asciiSafe((body.to ?? '').trim().toUpperCase());
    const reason = asciiSafe((body.reason ?? '').trim());
    if (!destination) throw new BadRequestException('Destination is required');
    if (!reason) throw new BadRequestException('Reason is required');
    const known = current.data.places.some((place) => place.name === destination);
    if (!known) throw new BadRequestException('Destination is not a truck or location');
    const parentChoice = asciiSafe((body.newParentTruck ?? '').trim().toUpperCase());
    const parent = !parentChoice || parentChoice === 'N/A' ? destination : parentChoice;
    const before = current.data.from?.readiness ?? null;
    await Promise.all([
      this.prisma.fleetCalibration.updateMany({
        where: { assetCode: key, archivedAt: null },
        data: { parentTruck: parent },
      }),
      this.prisma.fleetInspection.updateMany({
        where: { assetCode: key, archivedAt: null },
        data: { parentTruck: parent },
      }),
      this.prisma.fleetRepairRequest.updateMany({
        where: { assetCode: key, archivedAt: null, status: { notIn: ['CLOSED', 'CANCELLED'] } },
        data: { parentTruck: parent },
      }),
    ]);
    const profile = await this.readProfile(key);
    profile.home = parent;
    profile.checkedOutTo = body.checkedOutTo?.trim() ? asciiSafe(body.checkedOutTo.trim()) : '';
    await this.writeProfile(key, profile);
    const who = asciiSafe(body.movedBy?.trim() || 'DISPATCH');
    const why = asciiSafe(body.notes?.trim() || reason);
    await this.appendMovement(fromName, { asset: key, from: fromName || 'UNASSIGNED', to: parent, who, why });
    if (parent && parent !== fromName) {
      await this.appendMovement(parent, { asset: key, from: fromName || 'UNASSIGNED', to: parent, who, why });
    }
    const afterSnap = await loadFleetPlaces(this.prisma);
    const afterCard = afterSnap.cards.find((card) => card.name === (fromName || ''));
    const repairCode = current.data.asset.repairCode;
    return {
      data: {
        message: asciiSafe(`${current.data.asset.name} ${key} MOVED TO ${parent}`),
        assetCode: key,
        assetLabel: current.data.asset.name,
        from: fromName,
        fromId: current.data.from?.id ?? null,
        to: parent,
        toId: afterSnap.cards.find((card) => card.name === parent)?.id ?? slug(parent),
        readinessBefore: before,
        readinessAfter: afterCard?.readiness ?? null,
        repairCode,
      },
    };
  }

  async undoMove(code: string, from: string, to: string) {
    const items = await this.catalog();
    const key = this.resolveCode(code, items);
    const origin = asciiSafe(from.trim().toUpperCase());
    const destination = asciiSafe(to.trim().toUpperCase());
    if (!origin) throw new BadRequestException('Original location is required');
    await Promise.all([
      this.prisma.fleetCalibration.updateMany({
        where: { assetCode: key, archivedAt: null, parentTruck: { equals: destination, mode: 'insensitive' } },
        data: { parentTruck: origin },
      }),
      this.prisma.fleetInspection.updateMany({
        where: { assetCode: key, archivedAt: null, parentTruck: { equals: destination, mode: 'insensitive' } },
        data: { parentTruck: origin },
      }),
      this.prisma.fleetRepairRequest.updateMany({
        where: { assetCode: key, archivedAt: null, parentTruck: { equals: destination, mode: 'insensitive' } },
        data: { parentTruck: origin },
      }),
    ]);
    const profile = await this.readProfile(key);
    profile.home = origin;
    profile.checkedOutTo = '';
    await this.writeProfile(key, profile);
    await this.appendMovement(origin, {
      asset: key,
      from: destination,
      to: origin,
      who: 'DISPATCH',
      why: 'MOVE UNDONE',
    });
    return { data: { message: asciiSafe(`${key} RETURNED TO ${origin}`) } };
  }

  private async savedProfiles() {
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ assetCode: string; profile: unknown }>>(
        `SELECT "assetCode", profile FROM "FleetAssetProfile"`,
      );
      return rows.map((row) => ({
        code: asciiSafe(row.assetCode).trim().toUpperCase(),
        profile: normalizeProfile(emptyProfile(), asProfile(row.profile)),
      }));
    } catch {
      return [];
    }
  }

  private nextCode(items: FleetAssetRow[], hint: string) {
    const blob = hint.toUpperCase();
    const prefix = blob.includes('MONITOR') || blob.includes('DETECT')
      ? 'GM'
      : blob.includes('SCBA') || blob.includes('RESPIR')
        ? 'SC'
        : blob.includes('EXTING') || blob.includes('FIRE')
          ? 'FE'
          : blob.includes('TRAILER') || blob.includes('RENTAL')
            ? 'AT'
            : blob.includes('FILTER') || blob.includes('CONSUM')
              ? 'SF'
              : 'AS';
    const numbers = items
      .map((item) => item.assetCode.match(new RegExp(`^${prefix}-(\\d+)$`))?.[1])
      .filter((value): value is string => Boolean(value))
      .map((value) => Number(value));
    const next = (numbers.length ? Math.max(...numbers) : 1000) + 1;
    return `${prefix}-${next}`;
  }

  private async markOut(code: string) {
    const profile = await this.readProfile(code);
    profile.status = 'OUT OF SERVICE';
    if (!profile.name) profile.name = code;
    await this.writeProfile(code, profile);
    await this.prisma.fleetCalibration.updateMany({
      where: { assetCode: code, archivedAt: null },
      data: { status: 'OUT_OF_SERVICE' },
    });
  }

  private async syncCalibration(code: string, profile: AssetProfile) {
    const kind = inferKind(code, `${profile.name} ${profile.category}`, profile.kind);
    if (kind === 'CONSUMABLE' || profile.calibrationRequired === 'NO') return;
    const last = dateOrNull(profile.calibrationDate);
    const next = dateOrNull(profile.nextCalibrationDue);
    const frequency = intervalDays(profile.calibrationInterval);
    const status = next && next.getTime() < Date.now() ? 'OVERDUE' : 'CURRENT';
    const existing = await this.prisma.fleetCalibration.findFirst({
      where: { assetCode: code, archivedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
    if (existing) {
      await this.prisma.fleetCalibration.update({
        where: { id: existing.id },
        data: {
          parentTruck: profile.home || existing.parentTruck,
          assetLabel: asciiSafe(profile.name || code),
          ...(profile.model ? { model: asciiSafe(profile.model) } : {}),
          ...(profile.serial ? { serial: asciiSafe(profile.serial) } : {}),
          ...(last ? { lastCalAt: last } : {}),
          ...(next ? { nextDueAt: next, status } : {}),
          ...(frequency ? { frequencyDays: frequency } : {}),
        },
      });
      return;
    }
    const count = await this.prisma.fleetCalibration.count();
    await this.prisma.fleetCalibration.create({
      data: {
        code: `CAL-${String(count + 1).padStart(4, '0')}`,
        assetCode: code,
        assetLabel: asciiSafe(profile.name || code),
        model: asciiSafe(profile.model || profile.name || code),
        serial: profile.serial ? asciiSafe(profile.serial) : null,
        parentTruck: profile.home || null,
        lastCalAt: last,
        nextDueAt: next,
        result: 'PASS',
        status,
        frequencyDays: frequency || 90,
      },
    });
  }

  private async recordFor(
    code: string,
    asset: {
      condition: string;
      calibration: string;
      repairCode: string | null;
      documents: AssetDocument[];
      notes: string;
      noteLog: Array<{ id: string; text: string; at: string }>;
      bumpTestDate: string;
      bumpResult: string;
      calibrationDate: string;
      nextCalibrationDue: string;
      calibrationInterval: string;
      clocks: AssetClock[];
    },
    readiness: number | null,
  ) {
    const [inspections, calibrations, repairs] = await Promise.all([
      this.prisma.fleetInspection.findMany({
        where: { assetCode: code, archivedAt: null },
        orderBy: { inspectedAt: 'desc' },
        take: 12,
      }),
      this.prisma.fleetCalibration.findMany({
        where: { assetCode: code, archivedAt: null },
        orderBy: { lastCalAt: 'desc' },
        take: 6,
      }),
      this.prisma.fleetRepairRequest.findMany({
        where: { assetCode: code, archivedAt: null },
        orderBy: { reportedAt: 'desc' },
        take: 8,
      }),
    ]);
    let movements: Array<{ from: string; to: string; who: string; when: string; why: string }> = [];
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ movements: unknown }>>(
        `SELECT movements FROM "FleetTruckProfile"`,
      );
      movements = rows.flatMap((row) => (Array.isArray(row.movements) ? row.movements : []))
        .filter((entry) => String((entry as { asset?: string }).asset ?? '').toUpperCase() === code)
        .map((entry) => {
          const row = entry as { from?: string; to?: string; who?: string; when?: string; why?: string };
          return {
            from: asciiSafe(row.from ?? ''),
            to: asciiSafe(row.to ?? ''),
            who: asciiSafe(row.who ?? ''),
            when: row.when ?? '',
            why: asciiSafe(row.why ?? ''),
          };
        })
        .sort((a, b) => b.when.localeCompare(a.when));
    } catch {
      movements = [];
    }
    const calibrationScore = asset.calibration === 'EXPIRED' ? 40 : asset.calibration === 'DUE SOON' ? 75 : 100;
    const inspectionScore = inspections.some((row) => row.result === 'FAILED') ? 45 : 100;
    const repairScore = asset.repairCode ? 60 : 100;
    const conditionScore = asset.condition === 'POOR' ? 40 : asset.condition === 'FAIR' ? 70 : asset.condition === 'OUT OF SERVICE' ? 0 : 90;
    const weighted = Math.round((calibrationScore + inspectionScore + repairScore + conditionScore) / 4);
    return {
      readiness: readiness ?? weighted,
      health: [
        { label: 'Calibration', value: calibrationScore },
        { label: 'Inspection', value: inspectionScore },
        { label: 'Repair', value: repairScore },
        { label: 'Condition', value: conditionScore },
      ],
      weighted,
      history: [
        ...inspections.map((row) => ({
          id: row.id,
          kind: 'INSPECTION',
          code: row.code,
          label: row.type || 'INSPECTION',
          date: row.inspectedAt?.toISOString() ?? '',
          result: row.result,
          href: `/fleet/inspections/${row.id}`,
        })),
        ...calibrations.map((row) => ({
          id: row.id,
          kind: 'CALIBRATION',
          code: row.code,
          label: 'CALIBRATION',
          date: row.lastCalAt?.toISOString() ?? '',
          result: row.result,
          href: '/fleet/calibration',
        })),
        ...repairs.map((row) => ({
          id: row.id,
          kind: 'REPAIR',
          code: row.code,
          label: row.issue,
          date: row.reportedAt.toISOString(),
          result: row.status,
          href: '/fleet/repair-requests',
        })),
      ].sort((a, b) => b.date.localeCompare(a.date)),
      movements,
      incidents: [
        ...inspections
          .filter((row) => row.result === 'FAILED')
          .map((row) => ({
            id: row.id,
            code: row.code,
            severity: 'HIGH',
            summary: row.findingsSummary || row.assetLabel,
            date: row.inspectedAt?.toISOString() ?? '',
            href: `/fleet/inspections/${row.id}`,
          })),
        ...repairs.map((row) => ({
          id: row.id,
          code: row.code,
          severity: row.priority,
          summary: row.issue,
          date: row.reportedAt.toISOString(),
          href: '/fleet/repair-requests',
        })),
      ],
      clocks: asset.clocks,
      bumpTestDate: asset.bumpTestDate,
      bumpResult: asset.bumpResult,
      calibrationDate: asset.calibrationDate,
      nextCalibrationDue: asset.nextCalibrationDue,
      calibrationInterval: asset.calibrationInterval,
      documents: asset.documents,
      notes: asset.noteLog.length ? asset.noteLog : asset.notes ? [{ id: 'note', text: asset.notes, at: '' }] : [],
    };
  }

  private resolveCode(code: string, items: FleetAssetRow[]) {
    const raw = asciiSafe(decodeURIComponent(code).trim().toUpperCase());
    const hit = items.find((item) => item.assetCode === raw || item.id === code.trim().toLowerCase());
    return hit?.assetCode ?? raw;
  }

  private async readProfile(assetCode: string): Promise<AssetProfile> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ profile: unknown }>>(
        `SELECT profile FROM "FleetAssetProfile" WHERE "assetCode" = $1 LIMIT 1`,
        assetCode,
      );
      return normalizeProfile(emptyProfile(), asProfile(rows[0]?.profile));
    } catch {
      return emptyProfile();
    }
  }

  private async writeProfile(assetCode: string, profile: AssetProfile) {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "FleetAssetProfile" (id, "assetCode", profile, "updatedAt")
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT ("assetCode") DO UPDATE SET profile = EXCLUDED.profile, "updatedAt" = NOW()`,
      randomUUID(),
      assetCode,
      JSON.stringify(profile),
    );
  }

  private async appendMovement(
    place: string,
    entry: { asset: string; from: string; to: string; who: string; why: string },
  ) {
    if (!place) return;
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ movements: unknown }>>(
        `SELECT movements FROM "FleetTruckProfile" WHERE name = $1 LIMIT 1`,
        place,
      );
      const movements = Array.isArray(rows[0]?.movements) ? [...rows[0].movements] : [];
      movements.unshift({ id: randomUUID(), ...entry, when: new Date().toISOString() });
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "FleetTruckProfile" (id, name, documents, inventory, audit, movements, "updatedAt")
         VALUES ($1, $2, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, $3::jsonb, NOW())
         ON CONFLICT (name) DO UPDATE SET movements = EXCLUDED.movements, "updatedAt" = NOW()`,
        randomUUID(),
        place,
        JSON.stringify(movements),
      );
    } catch {
      return;
    }
  }
}

type AssetKind = 'ASSET' | 'RENTAL' | 'CONSUMABLE' | 'EXTINGUISHER';

type AssetClock = { test: string; lastDone: string; interval: string; nextDue: string; result: string };

type AssetDocument = { id: string; type: string; name: string; url: string; expiry: string; status: string };

type AssetProfile = {
  kind: AssetKind | '';
  name: string;
  category: string;
  serial: string;
  manufacturer: string;
  model: string;
  home: string;
  technician: string;
  status: string;
  replacementValue: number | null;
  purchaseDate: string;
  purchaseOrder: string;
  vendor: string;
  warrantyExpires: string;
  rentalAgreement: string;
  rentalVendor: string;
  dailyRate: number | null;
  rentalStart: string;
  contractedReturn: string;
  quantity: number | null;
  minimum: number | null;
  unit: string;
  unitCost: number | null;
  preferredVendor: string;
  lastPurchaseOrder: string;
  condition: string;
  sizeClass: string;
  agent: string;
  clocks: AssetClock[];
  photoUrl: string | null;
  documents: AssetDocument[];
  notes: string;
  checkedOutTo: string;
  checkoutDue: string;
  checkoutRef: string;
  lastCheckInAt: string;
  lastCheckInBy: string;
  calibrationRequired: string;
  calibrationDate: string;
  calibrationInterval: string;
  nextCalibrationDue: string;
  bumpTestDate: string;
  bumpResult: string;
  sensors: AssetSensor[];
  cylinderSize: string;
  cylinderMaterial: string;
  noteLog: Array<{ id: string; text: string; at: string }>;
};

type AssetSensor = { gas: string; range: string; alarmLow: string; alarmHigh: string };

type AssetProfileInput = Partial<AssetProfile>;

function emptyProfile(): AssetProfile {
  return {
    kind: '',
    name: '',
    category: '',
    serial: '',
    manufacturer: '',
    model: '',
    home: '',
    technician: '',
    status: '',
    replacementValue: null,
    purchaseDate: '',
    purchaseOrder: '',
    vendor: '',
    warrantyExpires: '',
    rentalAgreement: '',
    rentalVendor: '',
    dailyRate: null,
    rentalStart: '',
    contractedReturn: '',
    quantity: null,
    minimum: null,
    unit: '',
    unitCost: null,
    preferredVendor: '',
    lastPurchaseOrder: '',
    condition: '',
    sizeClass: '',
    agent: '',
    clocks: [],
    photoUrl: null,
    documents: [],
    notes: '',
    checkedOutTo: '',
    checkoutDue: '',
    checkoutRef: '',
    lastCheckInAt: '',
    lastCheckInBy: '',
    calibrationRequired: '',
    calibrationDate: '',
    calibrationInterval: '',
    nextCalibrationDue: '',
    bumpTestDate: '',
    bumpResult: '',
    sensors: [],
    cylinderSize: '',
    cylinderMaterial: '',
    noteLog: [],
  };
}

function clocksFor(kind: string, category: string): AssetClock[] {
  const blob = `${kind} ${category}`.toUpperCase();
  if (blob.includes('EXTING') || blob.includes('FIRE')) return defaultClocks();
  if (blob.includes('SCBA') || blob.includes('CYL') || blob.includes('RESPIRATORY')) return scbaClocks();
  return [];
}

function scbaClocks(): AssetClock[] {
  return [
    { test: 'HYDRO TEST', lastDone: '', interval: '5 YEARS', nextDue: '', result: '' },
    { test: 'POSI CHECK', lastDone: '', interval: '6 MONTHS', nextDue: '', result: '' },
    { test: 'FLOW TEST', lastDone: '', interval: '12 MONTHS', nextDue: '', result: '' },
  ];
}

function defaultClocks(): AssetClock[] {
  return [
    { test: 'ANNUAL INSPECTION', lastDone: '', interval: '12 MONTHS', nextDue: '', result: '' },
    { test: '6-YEAR MAINTENANCE', lastDone: '', interval: '6 YEARS', nextDue: '', result: '' },
    { test: 'HYDRO TEST', lastDone: '', interval: '12 YEARS', nextDue: '', result: '' },
  ];
}

function kindOf(value: unknown): AssetKind | '' {
  const kind = text(value).toUpperCase();
  if (kind === 'RENTAL' || kind === 'CONSUMABLE' || kind === 'EXTINGUISHER' || kind === 'ASSET') return kind;
  return '';
}

function inferKind(code: string, label: string, stored: string): AssetKind {
  if (stored === 'RENTAL' || stored === 'CONSUMABLE' || stored === 'EXTINGUISHER' || stored === 'ASSET') return stored;
  const value = `${code} ${label}`.toUpperCase();
  if (value.includes('EXTING')) return 'EXTINGUISHER';
  if (value.includes('RENTAL') || value.includes('TRAILER')) return 'RENTAL';
  if (/FILTER|GLOVE|CARTRIDGE|CONSUM/.test(value)) return 'CONSUMABLE';
  return 'ASSET';
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown) {
  return typeof value === 'string' ? asciiSafe(value) : '';
}

function asProfile(value: unknown): AssetProfileInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as AssetProfileInput;
}

function normalizeProfile(base: AssetProfile, patch: AssetProfileInput): AssetProfile {
  const clocks = Array.isArray(patch.clocks)
    ? patch.clocks.map((clock) => ({
        test: text(clock?.test),
        lastDone: text(clock?.lastDone),
        interval: text(clock?.interval),
        nextDue: text(clock?.nextDue),
        result: text(clock?.result),
      }))
    : base.clocks;
  const documents = Array.isArray(patch.documents)
    ? patch.documents.map((doc) => ({
        id: text(doc?.id) || randomUUID(),
        type: text(doc?.type),
        name: text(doc?.name),
        url: text(doc?.url),
        expiry: text(doc?.expiry),
        status: text(doc?.status) || 'CURRENT',
      }))
    : base.documents;
  return {
    ...base,
    kind: kindOf(patch.kind ?? base.kind),
    name: text(patch.name ?? base.name),
    category: text(patch.category ?? base.category),
    serial: text(patch.serial ?? base.serial),
    manufacturer: text(patch.manufacturer ?? base.manufacturer),
    model: text(patch.model ?? base.model),
    home: text(patch.home ?? base.home).toUpperCase(),
    technician: text(patch.technician ?? base.technician),
    status: text(patch.status ?? base.status).toUpperCase(),
    replacementValue: patch.replacementValue !== undefined ? num(patch.replacementValue) : base.replacementValue,
    purchaseDate: text(patch.purchaseDate ?? base.purchaseDate),
    purchaseOrder: text(patch.purchaseOrder ?? base.purchaseOrder),
    vendor: text(patch.vendor ?? base.vendor),
    warrantyExpires: text(patch.warrantyExpires ?? base.warrantyExpires),
    rentalAgreement: text(patch.rentalAgreement ?? base.rentalAgreement),
    rentalVendor: text(patch.rentalVendor ?? base.rentalVendor),
    dailyRate: patch.dailyRate !== undefined ? num(patch.dailyRate) : base.dailyRate,
    rentalStart: text(patch.rentalStart ?? base.rentalStart),
    contractedReturn: text(patch.contractedReturn ?? base.contractedReturn),
    quantity: patch.quantity !== undefined ? num(patch.quantity) : base.quantity,
    minimum: patch.minimum !== undefined ? num(patch.minimum) : base.minimum,
    unit: text(patch.unit ?? base.unit).toUpperCase(),
    unitCost: patch.unitCost !== undefined ? num(patch.unitCost) : base.unitCost,
    preferredVendor: text(patch.preferredVendor ?? base.preferredVendor),
    lastPurchaseOrder: text(patch.lastPurchaseOrder ?? base.lastPurchaseOrder),
    condition: text(patch.condition ?? base.condition).toUpperCase(),
    sizeClass: text(patch.sizeClass ?? base.sizeClass),
    agent: text(patch.agent ?? base.agent),
    clocks,
    photoUrl: patch.photoUrl === undefined ? base.photoUrl : text(patch.photoUrl) || null,
    documents,
    notes: text(patch.notes ?? base.notes),
    checkedOutTo: text(patch.checkedOutTo ?? base.checkedOutTo),
    checkoutDue: text(patch.checkoutDue ?? base.checkoutDue),
    checkoutRef: text(patch.checkoutRef ?? base.checkoutRef),
    lastCheckInAt: text(patch.lastCheckInAt ?? base.lastCheckInAt),
    lastCheckInBy: text(patch.lastCheckInBy ?? base.lastCheckInBy),
    calibrationRequired: text(patch.calibrationRequired ?? base.calibrationRequired).toUpperCase(),
    calibrationDate: text(patch.calibrationDate ?? base.calibrationDate),
    calibrationInterval: text(patch.calibrationInterval ?? base.calibrationInterval),
    nextCalibrationDue: text(patch.nextCalibrationDue ?? base.nextCalibrationDue),
    bumpTestDate: text(patch.bumpTestDate ?? base.bumpTestDate),
    bumpResult: text(patch.bumpResult ?? base.bumpResult).toUpperCase(),
    sensors: Array.isArray(patch.sensors)
      ? patch.sensors.map((sensor) => ({
          gas: text(sensor?.gas),
          range: text(sensor?.range),
          alarmLow: text(sensor?.alarmLow),
          alarmHigh: text(sensor?.alarmHigh),
        }))
      : base.sensors,
    cylinderSize: text(patch.cylinderSize ?? base.cylinderSize),
    cylinderMaterial: text(patch.cylinderMaterial ?? base.cylinderMaterial),
    noteLog: Array.isArray(patch.noteLog)
      ? patch.noteLog.map((note) => ({
          id: text(note?.id) || randomUUID(),
          text: text(note?.text),
          at: text(note?.at) || new Date().toISOString(),
        }))
      : base.noteLog,
  };
}

function dateOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function intervalDays(value: string) {
  const textValue = value.toUpperCase();
  const amount = Number(textValue.match(/\d+/)?.[0] ?? 0);
  if (!amount) {
    if (textValue.includes('QUARTER')) return 90;
    if (textValue.includes('DAILY')) return 1;
    return 0;
  }
  if (textValue.includes('YEAR')) return amount * 365;
  if (textValue.includes('MONTH')) return amount * 30;
  return amount;
}

function placeView(card: FleetPlaceCard) {
  return {
    id: card.id,
    name: card.name,
    kind: card.kind,
    unit: card.unit,
    driver: card.driver,
    assets: card.assets,
    readiness: card.readiness,
  };
}
