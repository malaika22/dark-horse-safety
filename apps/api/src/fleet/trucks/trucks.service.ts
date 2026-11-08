import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { asciiSafe, shortName } from '../common/fleet.util';
import { ensureFleetTables } from '../ensure-fleet-tables';
import { fleetDetail, loadFleetPlaces, locationData } from './trucks.snapshot';

@Injectable()
export class TrucksService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureLocations() {
    await ensureFleetTables(this.prisma);
    const count = await this.prisma.fleetLocation.count();
    if (count > 0) return;
    await this.prisma.fleetLocation.createMany({
      data: [
        {
          name: 'MAIN YARD',
          type: 'YARD',
          address: '2201 W INDUSTRIAL AVE',
          city: 'MIDLAND',
          state: 'TX',
          latitude: new Prisma.Decimal('31.997300'),
          longitude: new Prisma.Decimal('-102.077900'),
          accessHours: '24-HOUR YARD',
          maxCapacity: 20,
          status: 'ACTIVE',
          notes: 'MAX 20 ASSETS',
        },
        {
          name: 'REPAIR BAY',
          type: 'REPAIR_BAY',
          address: '2201 W INDUSTRIAL AVE',
          city: 'MIDLAND',
          state: 'TX',
          latitude: new Prisma.Decimal('31.997300'),
          longitude: new Prisma.Decimal('-102.077900'),
          accessHours: 'SHOP HOURS',
          maxCapacity: 8,
          bayCount: 2,
          status: 'ACTIVE',
          notes: '2 BAYS',
        },
      ],
    });
  }

  async overview() {
    await this.ensureLocations();
    const snap = await loadFleetPlaces(this.prisma);
    const trucks = snap.cards.filter((card) => card.kind === 'TRUCK');
    const locations = snap.cards.filter((card) => card.kind === 'LOCATION');
    const needsReview = trucks.filter((card) => card.status === 'NEED_REVIEW').length;
    const ready = trucks.filter((card) => card.status === 'READY').length;
    const expiredCalib = trucks.reduce((sum, card) => sum + card.calibExpired, 0);
    return {
      data: {
        cells: [
          { title: 'Total Trucks', value: String(trucks.length), meta: 'IN FLEET' },
          { title: 'Ready', value: String(ready), meta: 'NO OPEN ISSUES' },
          {
            title: 'Needs Review',
            value: String(needsReview),
            meta: 'LOWEST READINESS',
            filterKey: 'NEEDS_REVIEW',
          },
          {
            title: 'On the Road',
            value: String(trucks.length),
            meta: `${locations.length} LOCATIONS`,
          },
          {
            title: 'Open Repairs',
            value: String(snap.repairs.length),
            meta: 'ACROSS FLEET',
            filterKey: 'REPAIRS',
          },
          {
            title: 'Expired Calib',
            value: String(expiredCalib),
            meta: 'ASSETS',
            filterKey: 'CALIB',
          },
        ],
        cards: snap.cards,
        employees: snap.employees.map((employee) => ({
          id: employee.id,
          name:
            employee.displayName?.trim() ||
            shortName(employee.firstName, employee.lastName),
          assignedTruck: employee.assignedTruck,
        })),
      },
    };
  }

  async detail(id: string) {
    const base = await fleetDetail(this.prisma, id);
    const profile = await this.readProfile(base.data.card.name);
    const tracked = profile.inventory.length;
    const short = profile.inventory.filter((item) => item.qty < item.minimum).length;
    const inventory = tracked ? Math.max(0, Math.round(100 - (short / tracked) * 100)) : 100;
    const weighted = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          base.data.breakdown.equipment * 0.3 +
            base.data.breakdown.calibration * 0.25 +
            base.data.breakdown.inspections * 0.2 +
            base.data.breakdown.repair * 0.15 +
            inventory * 0.1,
        ),
      ),
    );
    if (base.data.card.kind === 'TRUCK') base.data.card.readiness = weighted;
    return {
      data: {
        ...base.data,
        documents: profile.documents,
        inventory: profile.inventory,
        audit: profile.audit,
        movements: profile.movements,
        breakdown: { ...base.data.breakdown, inventory, weighted },
      },
    };
  }

  async assign(employeeId: string, truckName: string) {
    const name = asciiSafe(truckName.trim().toUpperCase());
    if (!name) throw new NotFoundException('Truck name is required');
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, archivedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { assignedTruck: name },
    });
    await this.pushAudit(name, {
      field: 'ASSIGNED TECHNICIAN',
      from: employee.assignedTruck ?? 'UNASSIGNED',
      to: shortName(employee.firstName, employee.lastName),
      who: 'DISPATCH',
    });
    return {
      data: {
        id: employee.id,
        truck: name,
        message: asciiSafe(
          `${name} ASSIGNED TO ${shortName(employee.firstName, employee.lastName)}`,
        ),
      },
    };
  }

  async unassign(truckName: string) {
    const name = asciiSafe(truckName.trim().toUpperCase());
    const result = await this.prisma.employee.updateMany({
      where: { assignedTruck: { equals: name, mode: 'insensitive' }, archivedAt: null },
      data: { assignedTruck: null },
    });
    return {
      data: {
        updated: result.count,
        message: asciiSafe(`${name} UNASSIGNED FROM ${result.count} TECHNICIAN${result.count === 1 ? '' : 'S'}`),
      },
    };
  }

  async listLocations() {
    await this.ensureLocations();
    const rows = await this.prisma.fleetLocation.findMany({
      where: { archivedAt: null },
      orderBy: { name: 'asc' },
    });
    const snap = await loadFleetPlaces(this.prisma);
    return {
      data: {
        items: rows.map((row) => {
          const card = snap.cards.find(
            (item) => item.name === asciiSafe(row.name).toUpperCase(),
          );
          return {
            ...locationData(row),
            assets: card?.assets ?? 0,
            repairs: card?.repairs ?? 0,
            lastAudit: card?.lastAudit ?? null,
            cardStatus: card?.status ?? row.status,
          };
        }),
      },
    };
  }

  async getLocation(id: string) {
    await ensureFleetTables(this.prisma);
    const name = asciiSafe(id.replace(/-/g, ' ').toUpperCase());
    const row = await this.prisma.fleetLocation.findFirst({
      where: {
        archivedAt: null,
        OR: [{ id }, { name: { equals: name, mode: 'insensitive' } }],
      },
    });
    if (!row) throw new NotFoundException('Location not found');
    return { data: locationData(row) };
  }

  async saveLocation(
    dto: {
      name: string;
      type: string;
      address?: string;
      city?: string;
      state?: string;
      latitude?: number;
      longitude?: number;
      responsibleName?: string;
      accessHours?: string;
      maxCapacity?: number;
      bayCount?: number;
      emergencyContact?: string;
      status?: string;
      notes?: string;
    },
    id?: string,
  ) {
    await ensureFleetTables(this.prisma);
    const data = {
      name: asciiSafe(dto.name.trim().toUpperCase()),
      type: asciiSafe(dto.type.trim().toUpperCase()).replace(/\s+/g, '_'),
      address: dto.address ? asciiSafe(dto.address.trim().toUpperCase()) : null,
      city: dto.city ? asciiSafe(dto.city.trim().toUpperCase()) : null,
      state: dto.state ? asciiSafe(dto.state.trim().toUpperCase()) : null,
      latitude: dto.latitude == null ? null : new Prisma.Decimal(dto.latitude.toFixed(6)),
      longitude: dto.longitude == null ? null : new Prisma.Decimal(dto.longitude.toFixed(6)),
      responsibleName: dto.responsibleName
        ? asciiSafe(dto.responsibleName.trim().toUpperCase())
        : null,
      accessHours: dto.accessHours ? asciiSafe(dto.accessHours.trim().toUpperCase()) : null,
      maxCapacity: dto.maxCapacity ?? null,
      bayCount: dto.bayCount ?? null,
      emergencyContact: dto.emergencyContact
        ? asciiSafe(dto.emergencyContact.trim().toUpperCase())
        : null,
      status: dto.status ? asciiSafe(dto.status.trim().toUpperCase()) : 'ACTIVE',
      notes: dto.notes ? asciiSafe(dto.notes.trim()) : null,
    };
    const row = id
      ? await this.prisma.fleetLocation.update({ where: { id }, data })
      : await this.prisma.fleetLocation.create({ data });
    return { data: locationData(row) };
  }

  async addDocument(id: string, name: string, url: string) {
    const place = await this.placeName(id);
    const profile = await this.readProfile(place);
    profile.documents.unshift({
      id: randomUUID(),
      name: asciiSafe(name.trim()),
      url,
      at: new Date().toISOString(),
    });
    await this.writeProfile(place, profile);
    return { data: profile.documents[0] };
  }

  async addInventory(
    id: string,
    item: string,
    qty: number,
    minimum: number,
    extra?: { sku?: string; unit?: string; preferredVendor?: string },
  ) {
    if (!item.trim()) throw new BadRequestException('Item name is required');
    const place = await this.placeName(id);
    const profile = await this.readProfile(place);
    const row: InventoryItem = {
      id: randomUUID(),
      item: asciiSafe(item.trim().toUpperCase()),
      qty: Math.max(0, Math.round(qty)),
      minimum: Math.max(0, Math.round(minimum)),
      sku: extra?.sku ? asciiSafe(extra.sku.trim()) : undefined,
      unit: extra?.unit ? asciiSafe(extra.unit.trim()) : undefined,
      preferredVendor: extra?.preferredVendor ? asciiSafe(extra.preferredVendor.trim()) : undefined,
      tracked: true,
      documents: [],
    };
    profile.inventory.unshift(row);
    await this.writeProfile(place, profile);
    return { data: row };
  }

  async updateInventory(
    id: string,
    itemId: string,
    patch: {
      qty?: number;
      minimum?: number;
      sku?: string;
      unit?: string;
      preferredVendor?: string;
      tracked?: boolean;
      purchaseQty?: number;
    },
  ) {
    const place = await this.placeName(id);
    const profile = await this.readProfile(place);
    const row = profile.inventory.find((item) => item.id === itemId);
    if (!row) throw new NotFoundException('Inventory item not found');
    if (patch.qty != null) row.qty = Math.max(0, Math.round(patch.qty));
    if (patch.minimum != null) row.minimum = Math.max(0, Math.round(patch.minimum));
    if (patch.sku !== undefined) row.sku = patch.sku ? asciiSafe(patch.sku.trim()) : undefined;
    if (patch.unit !== undefined) row.unit = patch.unit ? asciiSafe(patch.unit.trim()) : undefined;
    if (patch.preferredVendor !== undefined) {
      row.preferredVendor = patch.preferredVendor ? asciiSafe(patch.preferredVendor.trim()) : undefined;
    }
    if (patch.tracked != null) row.tracked = patch.tracked;
    if (patch.purchaseQty != null) {
      const needed = Math.max(1, Math.round(patch.purchaseQty));
      row.purchaseRequest = {
        qty: needed,
        vendor: row.preferredVendor ?? '',
        sku: row.sku ?? row.item,
        at: new Date().toISOString(),
      };
    }
    await this.writeProfile(place, profile);
    return { data: row };
  }

  async moveInventory(id: string, itemId: string, to: string, qty: number) {
    const from = await this.placeName(id);
    const destination = asciiSafe(to.trim());
    const amount = Math.max(1, Math.round(qty || 1));
    if (!destination) throw new BadRequestException('Destination is required');
    const source = await this.readProfile(from);
    const row = source.inventory.find((item) => item.id === itemId);
    if (!row) throw new NotFoundException('Inventory item not found');
    if (row.qty < amount) throw new BadRequestException('Not enough quantity to move');
    row.qty -= amount;
    await this.writeProfile(from, source);
    const target = await this.readProfile(destination);
    const match = target.inventory.find((item) => item.item === row.item);
    if (match) match.qty += amount;
    else {
      target.inventory.unshift({
        ...row,
        id: randomUUID(),
        qty: amount,
      });
    }
    await this.writeProfile(destination, target);
    return { data: { from, to: destination, item: row.item, qty: amount } };
  }

  async addInventoryDocument(
    id: string,
    itemId: string,
    doc: { type?: string; name: string; url?: string },
  ) {
    const place = await this.placeName(id);
    const profile = await this.readProfile(place);
    const row = profile.inventory.find((item) => item.id === itemId);
    if (!row) throw new NotFoundException('Inventory item not found');
    row.documents = row.documents ?? [];
    row.documents.unshift({
      id: randomUUID(),
      type: asciiSafe((doc.type || 'DOCUMENT').trim()),
      name: asciiSafe(doc.name.trim()),
      url: doc.url,
    });
    await this.writeProfile(place, profile);
    return { data: row };
  }

  async issueInventory(id: string, itemId: string, qty: number) {
    const place = await this.placeName(id);
    const profile = await this.readProfile(place);
    const row = profile.inventory.find((item) => item.id === itemId);
    if (!row) throw new NotFoundException('Inventory item not found');
    row.qty = Math.max(0, row.qty - Math.max(1, Math.round(qty || 1)));
    await this.writeProfile(place, profile);
    return { data: row };
  }

  async moveAsset(id: string, assetCode: string, to: string, why: string, who: string) {
    const from = await this.placeName(id);
    const destination = asciiSafe(to.trim().toUpperCase());
    const code = asciiSafe(assetCode.trim().toUpperCase());
    if (!destination || !code) throw new BadRequestException('Asset and destination are required');
    await Promise.all([
      this.prisma.fleetCalibration.updateMany({
        where: { assetCode: code, archivedAt: null, parentTruck: { equals: from, mode: 'insensitive' } },
        data: { parentTruck: destination },
      }),
      this.prisma.fleetInspection.updateMany({
        where: { assetCode: code, archivedAt: null, parentTruck: { equals: from, mode: 'insensitive' } },
        data: { parentTruck: destination },
      }),
      this.prisma.fleetRepairRequest.updateMany({
        where: { assetCode: code, archivedAt: null, parentTruck: { equals: from, mode: 'insensitive' } },
        data: { parentTruck: destination },
      }),
    ]);
    const profile = await this.readProfile(from);
    profile.movements.unshift({
      id: randomUUID(),
      asset: code,
      from,
      to: destination,
      who: asciiSafe(who),
      when: new Date().toISOString(),
      why: asciiSafe(why.trim() || 'MOVED'),
    });
    await this.writeProfile(from, profile);
    return { data: { message: asciiSafe(`${code} MOVED TO ${destination}`) } };
  }

  async markMissing(id: string, assetCode: string, assetLabel: string, value: number, holder: string | null) {
    const from = await this.placeName(id);
    const code = asciiSafe(assetCode.trim().toUpperCase());
    const existing = await this.prisma.unaccountedAsset.findFirst({
      where: { assetCode: code, archivedAt: null, status: { not: 'RECOVERED' } },
    });
    if (!existing) {
      await this.prisma.unaccountedAsset.create({
        data: {
          assetLabel: asciiSafe((assetLabel || code).trim().toUpperCase()),
          assetCode: code,
          replacementValue: new Prisma.Decimal(Math.max(0, value || 0)),
          lastTruck: from,
          lastHolder: holder ? asciiSafe(holder) : null,
          markedMissingAt: new Date(),
          locateDays: 14,
          status: 'LOCATING',
          history: [{ at: new Date().toISOString(), entry: `REPORTED MISSING FROM ${from}` }],
        },
      });
    }
    const profile = await this.readProfile(from);
    profile.movements.unshift({
      id: randomUUID(),
      asset: code,
      from,
      to: 'UNACCOUNTED',
      who: holder ? asciiSafe(holder) : 'DISPATCH',
      when: new Date().toISOString(),
      why: 'MARKED MISSING',
    });
    await this.writeProfile(from, profile);
    return { data: { message: asciiSafe(`${code} REPORTED MISSING FROM ${from}`) } };
  }

  private async placeName(id: string) {
    const snap = await fleetDetail(this.prisma, id);
    return snap.data.card.name;
  }

  private async pushAudit(
    name: string,
    entry: { field: string; from: string; to: string; who: string },
  ) {
    const profile = await this.readProfile(name);
    profile.audit.unshift({
      id: randomUUID(),
      field: asciiSafe(entry.field),
      from: asciiSafe(entry.from),
      to: asciiSafe(entry.to),
      who: asciiSafe(entry.who),
      when: new Date().toISOString(),
    });
    await this.writeProfile(name, profile);
  }

  async listInventory() {
    await this.ensureLocations();
    const snap = await loadFleetPlaces(this.prisma);
    let rows: Array<{ name: string; inventory: unknown; updatedAt: Date | null }> = [];
    try {
      rows = await this.prisma.$queryRawUnsafe(
        `SELECT name, inventory, "updatedAt" FROM "FleetTruckProfile"`,
      );
    } catch {
      rows = [];
    }
    const lines: Array<{
      id: string;
      placeId: string;
      place: string;
      kind: string;
      item: string;
      sku: string;
      unit: string;
      qty: number;
      minimum: number;
      status: string;
      statusTone: string;
      vendor: string;
      docs: number;
      countedAt: string | null;
    }> = [];
    for (const row of rows) {
      const card = snap.cards.find(
        (entry) => entry.name.toUpperCase() === String(row.name).toUpperCase(),
      );
      const kind =
        card?.kind ??
        (/YARD|BAY|SHOP|STORAGE|HQ|LOCATION/i.test(row.name) ? 'LOCATION' : 'TRUCK');
      for (const item of asList<InventoryItem>(row.inventory)) {
        if (item.tracked === false) continue;
        const qty = Number(item.qty) || 0;
        const minimum = Number(item.minimum) || 0;
        const ratio = minimum > 0 ? qty / minimum : 1;
        const status = qty <= 0 || (minimum > 0 && ratio <= 0.3) ? 'CRITICAL' : qty < minimum ? 'LOW' : 'STOCKED';
        lines.push({
          id: item.id,
          placeId: card?.id ?? row.name,
          place: row.name,
          kind,
          item: item.item,
          sku: item.sku ?? '',
          unit: item.unit ?? '',
          qty,
          minimum,
          status,
          statusTone: status === 'CRITICAL' ? 'danger' : status === 'LOW' ? 'warning' : 'success',
          vendor: item.preferredVendor ?? '',
          docs: item.documents?.length ?? 0,
          countedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
        });
      }
    }
    lines.sort((a, b) => a.item.localeCompare(b.item));
    return {
      data: {
        items: lines,
        places: snap.cards.map((card) => ({ id: card.id, name: card.name, kind: card.kind })),
      },
    };
  }

  private async readProfile(name: string): Promise<TruckProfile> {
    const empty = (): TruckProfile => ({
      documents: [],
      inventory: [],
      audit: [],
      movements: [],
    });
    try {
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{ documents: unknown; inventory: unknown; audit: unknown; movements: unknown }>
      >(`SELECT documents, inventory, audit, movements FROM "FleetTruckProfile" WHERE name = $1 LIMIT 1`, name);
      const row = rows[0];
      if (!row) return empty();
      return {
        documents: asList(row.documents),
        inventory: asList(row.inventory),
        audit: asList(row.audit),
        movements: asList(row.movements),
      };
    } catch {
      return empty();
    }
  }

  private async writeProfile(name: string, profile: TruckProfile) {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "FleetTruckProfile" (id, name, documents, inventory, audit, movements, "updatedAt")
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, NOW())
       ON CONFLICT (name) DO UPDATE SET
         documents = EXCLUDED.documents,
         inventory = EXCLUDED.inventory,
         audit = EXCLUDED.audit,
         movements = EXCLUDED.movements,
         "updatedAt" = NOW()`,
      randomUUID(),
      name,
      JSON.stringify(profile.documents),
      JSON.stringify(profile.inventory),
      JSON.stringify(profile.audit),
      JSON.stringify(profile.movements),
    );
  }
}

type TruckProfile = {
  documents: Array<{ id: string; name: string; url: string; at: string }>;
  inventory: InventoryItem[];
  audit: Array<{ id: string; field: string; from: string; to: string; who: string; when: string }>;
  movements: Array<{ id: string; asset: string; from: string; to: string; who: string; when: string; why: string }>;
};

type InventoryItem = {
  id: string;
  item: string;
  qty: number;
  minimum: number;
  sku?: string;
  unit?: string;
  preferredVendor?: string;
  tracked?: boolean;
  documents?: Array<{ id: string; type: string; name: string; url?: string }>;
  purchaseRequest?: { qty: number; vendor: string; sku: string; at: string } | null;
};

function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
