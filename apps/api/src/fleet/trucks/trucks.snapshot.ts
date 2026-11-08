import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { asciiSafe, DAY_MS, fmtShortDate, shortName } from '../common/fleet.util';
import { ensureFleetTables } from '../ensure-fleet-tables';

export type CardStatus = 'NEED_REVIEW' | 'READY' | 'ACTIVE' | 'IN_REPAIR' | 'AT_CAPACITY';

export type FleetPlaceCard = {
  id: string;
  kind: 'TRUCK' | 'LOCATION';
  name: string;
  unit: string;
  driver: string | null;
  site: string | null;
  readiness: number | null;
  assets: number;
  repairs: number;
  calibExpired: number;
  inspFailed: number;
  lastAudit: string | null;
  status: CardStatus;
  statusLabel: string;
};

function unitOf(name: string) {
  let n = 0;
  for (const ch of name) n = (n * 33 + ch.charCodeAt(0)) % 8000;
  return `UNIT ${2000 + n}`;
}

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isLocationName(name: string) {
  return /yard|bay|shop|hq|location|storage/i.test(name);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function loadFleetPlaces(prisma: PrismaService) {
  await ensureFleetTables(prisma);
  const [employees, calibrations, inspections, repairs, savedLocations] = await Promise.all([
    prisma.employee.findMany({
      where: { archivedAt: null, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        assignedTruck: true,
      },
      orderBy: { lastName: 'asc' },
    }),
    prisma.fleetCalibration.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        code: true,
        assetCode: true,
        assetLabel: true,
        model: true,
        parentTruck: true,
        status: true,
        lastCalAt: true,
        nextDueAt: true,
      },
    }),
    prisma.fleetInspection.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        code: true,
        assetCode: true,
        assetLabel: true,
        parentTruck: true,
        result: true,
        inspectedAt: true,
        inspectorName: true,
        type: true,
      },
    }),
    prisma.fleetRepairRequest.findMany({
      where: { archivedAt: null, status: { notIn: ['CLOSED', 'CANCELLED'] } },
      select: {
        id: true,
        code: true,
        assetCode: true,
        assetLabel: true,
        parentTruck: true,
        status: true,
        issue: true,
        reportedAt: true,
      },
    }),
    prisma.fleetLocation.findMany({
      where: { archivedAt: null },
      orderBy: { name: 'asc' },
    }),
  ]);

  const names = new Set<string>();
  for (const employee of employees) {
    const truck = employee.assignedTruck?.trim();
    if (truck) names.add(asciiSafe(truck.toUpperCase()));
  }
  for (const row of [...calibrations, ...inspections, ...repairs]) {
    const truck = row.parentTruck?.trim();
    if (truck) names.add(asciiSafe(truck.toUpperCase()));
  }
  for (const location of savedLocations) names.add(asciiSafe(location.name.toUpperCase()));
  if (![...names].some((name) => /YARD/i.test(name))) names.add('MAIN YARD');
  if (![...names].some((name) => /BAY/i.test(name))) names.add('REPAIR BAY');

  const now = Date.now();
  const cards: FleetPlaceCard[] = [...names].sort().map((name) => {
    const drivers = employees
      .filter((employee) => asciiSafe(employee.assignedTruck ?? '').toUpperCase() === name)
      .map(
        (employee) =>
          employee.displayName?.trim() || shortName(employee.firstName, employee.lastName),
      );
    const cals = calibrations.filter(
      (row) => asciiSafe(row.parentTruck ?? '').toUpperCase() === name,
    );
    const insps = inspections.filter(
      (row) => asciiSafe(row.parentTruck ?? '').toUpperCase() === name,
    );
    const openRepairs = repairs.filter(
      (row) => asciiSafe(row.parentTruck ?? '').toUpperCase() === name,
    );
    const assetIds = new Set<string>();
    for (const row of [...cals, ...insps, ...openRepairs]) {
      if (row.assetCode) assetIds.add(row.assetCode);
    }
    const calibExpired = cals.filter(
      (row) =>
        row.status === 'OVERDUE' ||
        row.status === 'OUT_OF_SERVICE' ||
        (row.nextDueAt && row.nextDueAt.getTime() < now),
    ).length;
    const inspFailed = insps.filter((row) => row.result === 'FAILED').length;
    const latest = insps
      .map((row) => row.inspectedAt)
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const saved = savedLocations.find(
      (location) => asciiSafe(location.name).toUpperCase() === name,
    );
    const location = Boolean(saved) || isLocationName(name);
    let readiness: number | null = null;
    let status: CardStatus = 'READY';
    if (!location) {
      readiness = clamp(100 - openRepairs.length * 8 - calibExpired * 6 - inspFailed * 10);
      status =
        inspFailed > 0 || calibExpired > 0 || openRepairs.length > 0 || readiness < 85
          ? 'NEED_REVIEW'
          : 'READY';
    } else if (saved?.status === 'INACTIVE') {
      status = 'IN_REPAIR';
    } else if (openRepairs.length > 0) {
      status = 'IN_REPAIR';
    } else if (saved?.maxCapacity && assetIds.size >= saved.maxCapacity) {
      status = 'AT_CAPACITY';
    } else if (assetIds.size >= 15) {
      status = 'AT_CAPACITY';
    } else {
      status = 'ACTIVE';
    }
    return {
      id: slug(name),
      kind: location ? 'LOCATION' : 'TRUCK',
      name,
      unit: location ? (saved?.type ?? name) : unitOf(name),
      driver: drivers[0] ?? saved?.responsibleName ?? null,
      site: location ? [saved?.city, saved?.state].filter(Boolean).join(', ') || 'MIDLAND HQ' : null,
      readiness,
      assets: assetIds.size,
      repairs: openRepairs.length,
      calibExpired,
      inspFailed,
      lastAudit: fmtShortDate(latest),
      status,
      statusLabel: status.replace('_', ' '),
    };
  });

  return { employees, calibrations, inspections, repairs, savedLocations, cards, now };
}

export async function fleetDetail(prisma: PrismaService, id: string) {
  const snap = await loadFleetPlaces(prisma);
  const card = snap.cards.find((row) => row.id === id);
  if (!card) throw new NotFoundException('Truck or location not found');
  const peers = snap.cards.filter((row) => row.kind === card.kind);
  const index = peers.findIndex((row) => row.id === card.id);
  const sameName = (value?: string | null) =>
    asciiSafe(value ?? '').toUpperCase() === card.name;

  const cals = snap.calibrations.filter((row) => sameName(row.parentTruck));
  const insps = snap.inspections.filter((row) => sameName(row.parentTruck));
  const openRepairs = snap.repairs.filter((row) => sameName(row.parentTruck));

  const children = new Map<
    string,
    {
      id: string;
      assetLabel: string;
      assetCode: string;
      equipmentType: string;
      status: string;
      statusLabel: string;
      statusTone: string;
      readiness: number | null;
      calibration: string;
      repair: string;
      inspectionId: string | null;
      calibrationId: string | null;
      repairId: string | null;
      lastCalibration: string | null;
      nextDue: string | null;
      dueDays: number | null;
    }
  >();

  const ensure = (code: string, label: string | null | undefined, type?: string | null) => {
    const key = code || label || 'ASSET';
    const current = children.get(key);
    if (current) {
      if (type && current.equipmentType === 'EQUIPMENT') current.equipmentType = type;
      return current;
    }
    const created = {
      id: key,
      assetLabel: asciiSafe((label || code).toUpperCase()),
      assetCode: asciiSafe(code.toUpperCase()),
      equipmentType: type ? asciiSafe(type.toUpperCase()) : 'EQUIPMENT',
      status: 'READY',
      statusLabel: 'READY',
      statusTone: 'success',
      readiness: 100,
      calibration: 'N/A',
      repair: 'NONE',
      inspectionId: null as string | null,
      calibrationId: null as string | null,
      repairId: null as string | null,
      lastCalibration: null as string | null,
      nextDue: null as string | null,
      dueDays: null as number | null,
    };
    children.set(key, created);
    return created;
  };

  for (const row of cals) {
    const child = ensure(row.assetCode, row.assetLabel, row.model);
    child.calibrationId = row.id;
    const expired =
      row.status === 'OVERDUE' ||
      row.status === 'OUT_OF_SERVICE' ||
      (row.nextDueAt && row.nextDueAt.getTime() < snap.now);
    child.calibration = expired ? 'EXPIRED' : 'CURRENT';
    child.lastCalibration = fmtShortDate(row.lastCalAt);
    child.nextDue = fmtShortDate(row.nextDueAt);
    child.dueDays = row.nextDueAt
      ? Math.ceil((row.nextDueAt.getTime() - snap.now) / DAY_MS)
      : null;
    if (expired) {
      child.status = 'NEED_REVIEW';
      child.statusLabel = 'NEED REVIEW';
      child.statusTone = 'warning';
      child.readiness = 70;
    }
  }
  for (const row of insps) {
    const child = ensure(row.assetCode, row.assetLabel);
    child.inspectionId = row.id;
    if (row.result === 'FAILED') {
      child.status = 'NEED_REVIEW';
      child.statusLabel = 'NEED REVIEW';
      child.statusTone = 'warning';
      child.readiness = Math.min(child.readiness ?? 100, 60);
    }
  }
  for (const row of openRepairs) {
    const child = ensure(row.assetCode, row.assetLabel);
    child.repairId = row.id;
    child.repair = 'OPEN';
    child.status = 'NEED_REVIEW';
    child.statusLabel = 'NEED REVIEW';
    child.statusTone = 'warning';
    child.readiness = Math.min(child.readiness ?? 100, 75);
  }

  const childList = [...children.values()];
  const withCal = childList.filter((row) => row.calibration !== 'N/A');
  const expired = withCal.filter((row) => row.calibration === 'EXPIRED').length;
  const failed = insps.filter((row) => row.result === 'FAILED').length;
  const equipment = clamp(100 - failed * 20 - (childList.length ? 0 : 40));
  const calibration = withCal.length ? clamp(100 - (expired / withCal.length) * 100) : 100;
  const inspectionScore = insps.length ? clamp(100 - (failed / insps.length) * 100) : 100;
  const repair = clamp(100 - openRepairs.length * 15);
  const inventory = 100;
  const weighted = clamp(
    equipment * 0.3 + calibration * 0.25 + inspectionScore * 0.2 + repair * 0.15 + inventory * 0.1,
  );
  if (card.kind === 'TRUCK') card.readiness = weighted;

  const activity = [...insps]
    .sort((a, b) => (b.inspectedAt?.getTime() ?? 0) - (a.inspectedAt?.getTime() ?? 0))
    .slice(0, 8)
    .map((row) => ({
      asset: `${row.assetCode} · ${row.assetLabel}`,
      event: row.result === 'FAILED' ? 'FAILED INSPECTION' : `${row.type ?? 'INSPECTION'} ${row.result}`,
      when: fmtShortDate(row.inspectedAt),
      place: card.name,
      who: row.inspectorName,
    }));

  const services = [...cals]
    .filter((row) => row.nextDueAt)
    .sort((a, b) => a.nextDueAt!.getTime() - b.nextDueAt!.getTime())
    .slice(0, 6)
    .map((row) => {
      const days = Math.ceil((row.nextDueAt!.getTime() - snap.now) / DAY_MS);
      return {
        label: `${row.assetCode} · ${row.assetLabel ?? row.model}`,
        due: fmtShortDate(row.nextDueAt),
        days,
        tone: days < 0 ? 'danger' : days <= 14 ? 'warning' : 'success',
      };
    });

  const saved = snap.savedLocations.find(
    (location) => asciiSafe(location.name).toUpperCase() === card.name,
  );

  return {
    data: {
      card,
      children: childList,
      trucks: snap.cards
        .filter((row) => row.kind === 'TRUCK')
        .map((row) => ({ id: row.id, name: row.name, unit: row.unit })),
      prevId: index > 0 ? peers[index - 1].id : null,
      nextId: index >= 0 && index < peers.length - 1 ? peers[index + 1].id : null,
      index,
      total: peers.length,
      technician: card.driver,
      baseLocation: card.site,
      lastInspection: card.lastAudit,
      openIssues: `${openRepairs.length} REPAIR · ${expired} CALIB`,
      fleetNo: card.unit,
      model: null,
      breakdown: {
        equipment,
        calibration,
        inspections: inspectionScore,
        repair,
        inventory,
        weighted,
      },
      workOrder: null,
      services,
      activity,
      employees: snap.employees.map((employee) => ({
        id: employee.id,
        name:
          employee.displayName?.trim() ||
          shortName(employee.firstName, employee.lastName),
        assignedTruck: employee.assignedTruck,
      })),
      location: saved
        ? {
            id: saved.id,
            name: saved.name,
            type: saved.type,
            address: saved.address,
            city: saved.city,
            state: saved.state,
            latitude: saved.latitude ? Number(saved.latitude) : null,
            longitude: saved.longitude ? Number(saved.longitude) : null,
            responsibleName: saved.responsibleName,
            accessHours: saved.accessHours,
            maxCapacity: saved.maxCapacity,
            bayCount: saved.bayCount,
            emergencyContact: saved.emergencyContact,
            status: saved.status,
            notes: saved.notes,
          }
        : null,
    },
  };
}

export function locationData(row: {
  id: string;
  name: string;
  type: string;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  responsibleName: string | null;
  accessHours: string | null;
  maxCapacity: number | null;
  bayCount: number | null;
  emergencyContact: string | null;
  status: string;
  notes: string | null;
}) {
  return {
    id: row.id,
    slug: slug(asciiSafe(row.name.toUpperCase())),
    name: row.name,
    type: row.type,
    address: row.address,
    city: row.city,
    state: row.state,
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    responsibleName: row.responsibleName,
    accessHours: row.accessHours,
    maxCapacity: row.maxCapacity,
    bayCount: row.bayCount,
    emergencyContact: row.emergencyContact,
    status: row.status,
    notes: row.notes,
  };
}
