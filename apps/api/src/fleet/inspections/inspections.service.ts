import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FleetInspectionResult,
  FleetInspectionStatus,
  Prisma,
} from '@prisma/client';
import { paginate, parsePage } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  asciiSafe,
  buildDueLabel,
  cmpField,
  countFailedItems,
  dateRangeWhere,
  DAY_MS,
  findingsOf,
  fmtShortDate,
  labelOf,
  shortName,
  parseDate,
  type FindingRow,
} from '../common/fleet.util';
import {
  BulkReviewDto,
  CreateCorrectiveActionDto,
  CreateRepairFromInspectionDto,
  EditInspectionDto,
  InspectionListQueryDto,
  ReinspectDto,
} from './dto/inspection.dto';

type ChecklistItem = {
  label: string;
  detail: string;
  result: 'PASS' | 'FAIL';
  note?: string;
};

const DEFAULT_CHECKLIST: Array<{ label: string; passDetail: string; failDetail: string }> = [
  {
    label: 'SENSOR RESPONSE',
    passDetail: 'SENSOR RESPONDED WITHIN RANGE TO TEST GAS.',
    failDetail: 'H2S SENSOR SHOWED NO RESPONSE. READING 0 PPM VS 25 PPM CAL GAS.',
  },
  {
    label: 'CALIBRATION CURRENT',
    passDetail: 'CALIBRATION CERTIFICATE IS WITHIN SCHEDULE.',
    failDetail: 'LAST CERTIFICATION EXPIRED. SENSOR MODULE FLAGGED FOR REPLACEMENT.',
  },
  {
    label: 'ALARM TEST',
    passDetail: 'BOTH AUDIO AND VISUAL ALARMS ACTIVATED WITHIN 2 SECS.',
    failDetail: 'ALARM DID NOT ACTIVATE WITHIN REQUIRED WINDOW.',
  },
  {
    label: 'BATTERY LEVEL',
    passDetail: '87%. ESTIMATED 4+ DAYS AT CURRENT USAGE.',
    failDetail: 'BATTERY BELOW MINIMUM OPERATING THRESHOLD.',
  },
  {
    label: 'PHYSICAL CONDITION',
    passDetail: 'NO CRACKS, CORROSION OR DAMAGE. HOUSING INTACT.',
    failDetail: 'HOUSING DAMAGE OR LOOSE CLIPS DETECTED.',
  },
];

function buildChecklist(failedLabels: string[]): ChecklistItem[] {
  const failed = new Set(failedLabels.map((l) => l.toUpperCase()));
  return DEFAULT_CHECKLIST.map((item) => {
    const isFail = failed.has(item.label);
    return {
      label: item.label,
      detail: isFail ? item.failDetail : item.passDetail,
      result: isFail ? 'FAIL' : 'PASS',
    };
  });
}

function checklistOf(value: Prisma.JsonValue | null): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x) => x && typeof x === 'object')
    .map((x): ChecklistItem | null => {
      const row = x as Record<string, unknown>;
      const label = String(row.label ?? '');
      if (!label) return null;
      const result: ChecklistItem['result'] =
        String(row.result ?? 'PASS').toUpperCase() === 'FAIL' ? 'FAIL' : 'PASS';
      return {
        label,
        detail: String(row.detail ?? ''),
        result,
        note: row.note != null ? String(row.note) : undefined,
      };
    })
    .filter((r): r is ChecklistItem => r != null);
}

function inspectionResultTone(result: FleetInspectionResult) {
  if (result === 'FAILED') return 'danger';
  if (result === 'PASS') return 'success';
  if (result === 'PASS_WITH_FINDINGS') return 'warning';
  return 'muted';
}

function inspectionStatusTone(status: FleetInspectionStatus) {
  if (status === 'EXPIRED' || status === 'MISSING') return 'danger';
  if (status === 'NEEDS_REVIEW' || status === 'REPAIR_RAISED') return 'warning';
  if (status === 'COMPLETE' || status === 'REVIEWED') return 'success';
  return 'muted';
}

function inspectionPinScore(row: {
  result: FleetInspectionResult;
  status: FleetInspectionStatus;
}) {
  if (row.result === 'FAILED') return 0;
  if (row.status === 'EXPIRED' || row.status === 'MISSING') return 1;
  if (row.status === 'NEEDS_REVIEW' && row.result === 'NOT_DONE') return 2;
  if (row.status === 'REPAIR_RAISED') return 3;
  return 99;
}

@Injectable()
export class InspectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDetailFields() {
    const stale = await this.prisma.fleetInspection.findMany({
      where: { archivedAt: null, serial: null },
      take: 50,
    });
    for (const row of stale) {
      const findings = findingsOf(row.failedItems);
      const failLabels = findings
        .filter((f) => f.failed !== false)
        .map((f) => f.label);
      const checklist = buildChecklist(failLabels);
      await this.prisma.fleetInspection.update({
        where: { id: row.id },
        data: {
          checklistItems: checklist as unknown as Prisma.InputJsonValue,
          serial: row.serial ?? `SN-${row.assetCode}`,
          source: row.source ?? 'MOBILE_APP',
          findingsSummary:
            row.findingsSummary ??
            (failLabels.length
              ? asciiSafe(
                  checklist
                    .filter((c) => c.result === 'FAIL')
                    .map((c) => c.detail)
                    .join(' '),
                )
              : null),
        },
      });
    }
  }

  private async ensureSeed() {
    const count = await this.prisma.fleetInspection.count();
    if (count > 0) {
      await this.ensureDetailFields();
      return;
    }

    const [workOrders, customers, employees] = await Promise.all([
      this.prisma.workOrder.findMany({
        where: { archivedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 12,
        include: {
          customer: { select: { id: true, name: true } },
          location: { select: { name: true, county: true } },
        },
      }),
      this.prisma.customer.findMany({
        where: { archivedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: { id: true, name: true },
      }),
      this.prisma.employee.findMany({
        where: {
          archivedAt: null,
          status: 'ACTIVE',
          assignedTruck: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { firstName: true, lastName: true, assignedTruck: true },
      }),
    ]);

    const trucks =
      employees.length > 0
        ? employees.map((e) =>
            asciiSafe((e.assignedTruck ?? 'TRUCK').toUpperCase()),
          )
        : ['TRUCK 101', 'TRUCK 204', 'TRUCK 318', 'TRUCK 422'];
    const inspectors =
      employees.length > 0
        ? employees.map((e) => shortName(e.firstName, e.lastName))
        : ['J. SMITH', 'M. JOHNSON', 'R. DAVIS', 'K. WILSON'];
    const customerNames =
      customers.length > 0
        ? customers.map((c) => asciiSafe(c.name.toUpperCase()))
        : ['PIONEER NATURAL RESOURCES', 'EOG RESOURCES', 'DEVON ENERGY'];

    const now = new Date();
    const day = (offset: number) => new Date(now.getTime() + offset * DAY_MS);

    const inspectionDefs: Array<{
      result: FleetInspectionResult;
      status: FleetInspectionStatus;
      type: string;
      assetCode: string;
      assetLabel: string;
      itemsFailed: number;
      payrollBlocking: boolean;
      hasLinkedRepair: boolean;
      inspectedOffset?: number;
      dueOffset: number;
    }> = [
      {
        result: 'FAILED',
        status: 'NEEDS_REVIEW',
        type: 'UNIT INSPECTION',
        assetCode: 'GAS-001',
        assetLabel: '4-GAS MONITOR - TRUCK 101',
        itemsFailed: 3,
        payrollBlocking: true,
        hasLinkedRepair: false,
        inspectedOffset: -2,
        dueOffset: -5,
      },
      {
        result: 'FAILED',
        status: 'REPAIR_RAISED',
        type: 'TRUCK SAFETY',
        assetCode: 'SCBA-002',
        assetLabel: 'SCBA SET - TRUCK 204',
        itemsFailed: 2,
        payrollBlocking: false,
        hasLinkedRepair: true,
        inspectedOffset: -1,
        dueOffset: -3,
      },
      {
        result: 'PASS',
        status: 'COMPLETE',
        type: 'UNIT INSPECTION',
        assetCode: 'TRP-003',
        assetLabel: 'TRIPOD AND WINCH',
        itemsFailed: 0,
        payrollBlocking: false,
        hasLinkedRepair: false,
        inspectedOffset: -7,
        dueOffset: 30,
      },
      {
        result: 'PASS_WITH_FINDINGS',
        status: 'NEEDS_REVIEW',
        type: 'EQUIPMENT CHECK',
        assetCode: 'HAR-004',
        assetLabel: 'RETRIEVAL HARNESS',
        itemsFailed: 1,
        payrollBlocking: false,
        hasLinkedRepair: false,
        inspectedOffset: -4,
        dueOffset: 14,
      },
      {
        result: 'NOT_DONE',
        status: 'MISSING',
        type: 'ANNUAL DOT',
        assetCode: 'TRK-318',
        assetLabel: 'TRUCK 318',
        itemsFailed: 0,
        payrollBlocking: true,
        hasLinkedRepair: false,
        dueOffset: -10,
      },
      {
        result: 'NOT_DONE',
        status: 'EXPIRED',
        type: 'UNIT INSPECTION',
        assetCode: 'FEX-006',
        assetLabel: 'FIRE EXTINGUISHER 20LB',
        itemsFailed: 0,
        payrollBlocking: false,
        hasLinkedRepair: false,
        dueOffset: -21,
      },
      {
        result: 'PASS',
        status: 'REVIEWED',
        type: 'UNIT INSPECTION',
        assetCode: 'FAK-007',
        assetLabel: 'FIRST AID KIT',
        itemsFailed: 0,
        payrollBlocking: false,
        hasLinkedRepair: false,
        inspectedOffset: -14,
        dueOffset: 60,
      },
      {
        result: 'FAILED',
        status: 'NEEDS_REVIEW',
        type: 'EQUIPMENT CHECK',
        assetCode: 'H2S-008',
        assetLabel: 'PERSONAL H2S MONITOR',
        itemsFailed: 4,
        payrollBlocking: true,
        hasLinkedRepair: false,
        inspectedOffset: -1,
        dueOffset: 7,
      },
      {
        result: 'PASS',
        status: 'COMPLETE',
        type: 'TRUCK SAFETY',
        assetCode: 'TRK-422',
        assetLabel: 'TRUCK 422',
        itemsFailed: 0,
        payrollBlocking: false,
        hasLinkedRepair: false,
        inspectedOffset: -3,
        dueOffset: 45,
      },
      {
        result: 'NOT_DONE',
        status: 'NEEDS_REVIEW',
        type: 'ANNUAL DOT',
        assetCode: 'TRK-101',
        assetLabel: 'TRUCK 101',
        itemsFailed: 0,
        payrollBlocking: false,
        hasLinkedRepair: false,
        dueOffset: 5,
      },
      {
        result: 'PASS_WITH_FINDINGS',
        status: 'COMPLETE',
        type: 'UNIT INSPECTION',
        assetCode: 'MGD-011',
        assetLabel: 'MULTI-GAS DETECTOR',
        itemsFailed: 1,
        payrollBlocking: false,
        hasLinkedRepair: false,
        inspectedOffset: -6,
        dueOffset: 90,
      },
      {
        result: 'FAILED',
        status: 'EXPIRED',
        type: 'EQUIPMENT CHECK',
        assetCode: 'CAL-012',
        assetLabel: 'CALIBRATION KIT',
        itemsFailed: 2,
        payrollBlocking: false,
        hasLinkedRepair: false,
        inspectedOffset: -30,
        dueOffset: -15,
      },
    ];

    await this.prisma.fleetInspection.createMany({
      data: inspectionDefs.map((def, i) => {
        const wo = workOrders[i % Math.max(workOrders.length, 1)];
        const truck = trucks[i % trucks.length]!;
        const inspector = inspectors[i % inspectors.length]!;
        const failLabels =
          def.itemsFailed > 0
            ? DEFAULT_CHECKLIST.slice(0, Math.min(def.itemsFailed, 3)).map(
                (c) => c.label,
              )
            : def.result === 'PASS_WITH_FINDINGS'
              ? []
              : [];
        const checklist = buildChecklist(failLabels);
        const failedItems: FindingRow[] | undefined =
          failLabels.length > 0
            ? checklist
                .filter((c) => c.result === 'FAIL')
                .map((c) => ({
                  label: c.label,
                  detail: c.detail,
                  failed: true,
                }))
            : def.result === 'PASS_WITH_FINDINGS'
              ? [
                  {
                    label: 'LABEL FADED',
                    detail: 'REPLACE ASSET TAG',
                    failed: false,
                  },
                ]
              : undefined;
        const findingsSummary =
          failLabels.length > 0
            ? asciiSafe(
                checklist
                  .filter((c) => c.result === 'FAIL')
                  .map((c) => c.detail)
                  .join(' '),
              )
            : null;
        return {
          code: `INS-${String(i + 1).padStart(4, '0')}`,
          assetCode: def.assetCode,
          assetLabel: asciiSafe(def.assetLabel),
          parentTruck: truck,
          inspectorName: inspector,
          inspectedAt:
            def.inspectedOffset != null ? day(def.inspectedOffset) : null,
          dueAt: day(def.dueOffset),
          result: def.result,
          status: def.status,
          type: def.type,
          failedItems: failedItems
            ? (failedItems as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          checklistItems: checklist as unknown as Prisma.InputJsonValue,
          findingsSummary,
          serial: `MA219-${String(4000 + i).padStart(6, '0')}`,
          source: i % 3 === 0 ? 'WEB' : 'MOBILE_APP',
          photos:
            failLabels.length > 0
              ? ([
                  {
                    caption: 'SENSOR DISPLAY - 0 PPM READING',
                    takenAt: 'JUN 12, 06:38',
                    gps: '32.7801, -96.8000',
                  },
                  {
                    caption: 'UNIT LABEL SHOWING CALIBRATION DATE',
                    takenAt: 'JUN 12, 06:39',
                    gps: '32.7801, -96.8000',
                  },
                ] as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          actionsTaken:
            failLabels.length > 0
              ? ([
                  `UNIT REMOVED FROM ${truck}`,
                  def.hasLinkedRepair
                    ? `REPAIR REQUEST CREATED - REP-${String(i + 1).padStart(4, '0')}`
                    : 'AWAITING REPAIR REQUEST',
                ] as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          payrollBlocking: def.payrollBlocking,
          hasLinkedRepair: def.hasLinkedRepair,
          repairCode: def.hasLinkedRepair
            ? `REP-${String(i + 1).padStart(4, '0')}`
            : null,
          workOrderId: wo?.id ?? null,
          workOrderCode: wo?.code ?? null,
          customerName: wo?.customer?.name
            ? asciiSafe(wo.customer.name.toUpperCase())
            : customerNames[i % customerNames.length]!,
          locationLabel: wo?.location?.name
            ? asciiSafe(wo.location.name.toUpperCase())
            : null,
          reviewedAt: def.status === 'REVIEWED' ? day(-1) : null,
          reviewedBy: def.status === 'REVIEWED' ? 'FLEET ADMIN' : null,
          version: 1,
        };
      }),
    });
  }

  private mapRow(row: {
    id: string;
    code: string;
    assetCode: string;
    assetLabel: string;
    parentTruck: string | null;
    inspectorName: string;
    inspectedAt: Date | null;
    dueAt: Date | null;
    result: FleetInspectionResult;
    status: FleetInspectionStatus;
    type: string | null;
    failedItems: Prisma.JsonValue | null;
    payrollBlocking: boolean;
    hasLinkedRepair: boolean;
    repairCode: string | null;
    workOrderId: string | null;
    workOrderCode: string | null;
    customerName: string | null;
    locationLabel: string | null;
    reviewedAt: Date | null;
    reviewedBy: string | null;
    serial?: string | null;
    source?: string | null;
    findingsSummary?: string | null;
    checklistItems?: Prisma.JsonValue | null;
    photos?: Prisma.JsonValue | null;
    actionsTaken?: Prisma.JsonValue | null;
    version?: number | null;
    parentInspectionId?: string | null;
    reInspectionId?: string | null;
    reInspectionDueAt?: Date | null;
    editReason?: string | null;
    editDetails?: string | null;
    editedBy?: string | null;
    editedAt?: Date | null;
  }) {
    const findings = findingsOf(row.failedItems);
    let checklist = checklistOf(row.checklistItems ?? null);
    if (!checklist.length) {
      const failLabels = findings.filter((f) => f.failed !== false).map((f) => f.label);
      checklist = buildChecklist(failLabels);
    }
    const itemsFailed = checklist.filter((c) => c.result === 'FAIL').length;
    const itemsPassed = checklist.filter((c) => c.result === 'PASS').length;
    return {
      id: row.id,
      code: row.code,
      assetCode: row.assetCode,
      assetLabel: row.assetLabel,
      parentTruck: row.parentTruck,
      inspectorName: row.inspectorName,
      inspectedAt: row.inspectedAt,
      dueAt: row.dueAt,
      dateLabel: fmtShortDate(row.inspectedAt) ?? fmtShortDate(row.dueAt),
      dueLabel: buildDueLabel(row.dueAt),
      result: row.result,
      resultLabel: labelOf(row.result),
      resultTone: inspectionResultTone(row.result),
      status: row.status,
      statusLabel: labelOf(row.status),
      statusTone: inspectionStatusTone(row.status),
      type: row.type,
      itemsFailed: itemsFailed || countFailedItems(row.failedItems),
      itemsPassed,
      checklistTotal: checklist.length || 5,
      failedItems: findings,
      findings,
      checklistItems: checklist,
      payrollBlocking: row.payrollBlocking,
      hasLinkedRepair: row.hasLinkedRepair,
      repairCode: row.repairCode,
      workOrderId: row.workOrderId,
      workOrderCode: row.workOrderCode,
      customerName: row.customerName,
      locationLabel: row.locationLabel,
      reviewedAt: row.reviewedAt,
      reviewedBy: row.reviewedBy,
      serial: row.serial ?? null,
      source: row.source ?? 'MOBILE_APP',
      sourceLabel: labelOf(row.source ?? 'MOBILE_APP'),
      findingsSummary: row.findingsSummary ?? null,
      photos: Array.isArray(row.photos) ? row.photos : [],
      actionsTaken: Array.isArray(row.actionsTaken)
        ? row.actionsTaken.map((x) => String(x))
        : [],
      version: row.version ?? 1,
      parentInspectionId: row.parentInspectionId ?? null,
      reInspectionId: row.reInspectionId ?? null,
      reInspectionDueAt: row.reInspectionDueAt ?? null,
      reInspectionDueLabel: buildDueLabel(row.reInspectionDueAt),
      editReason: row.editReason ?? null,
      editDetails: row.editDetails ?? null,
      editedBy: row.editedBy ?? null,
      editedAt: row.editedAt ?? null,
    };
  }

  async list(query: InspectionListQueryDto) {
    await this.ensureSeed();
    const { page, pageSize } = parsePage(query.page, query.pageSize);
    const dir = query.direction === 'asc' ? 'asc' : 'desc';
    const q = query.q?.trim();
    const dueRange = dateRangeWhere(query.from, query.to);
    const where: Prisma.FleetInspectionWhereInput = {
      archivedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.result ? { result: query.result } : {}),
      ...(query.type?.trim()
        ? { type: { contains: query.type.trim(), mode: 'insensitive' } }
        : {}),
      ...(query.asset?.trim()
        ? {
            OR: [
              {
                assetLabel: {
                  contains: query.asset.trim(),
                  mode: 'insensitive',
                },
              },
              {
                assetCode: { contains: query.asset.trim(), mode: 'insensitive' },
              },
            ],
          }
        : {}),
      ...(query.parentTruck?.trim()
        ? {
            parentTruck: {
              contains: query.parentTruck.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.inspector?.trim()
        ? {
            inspectorName: {
              contains: query.inspector.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.hasLinkedRepair != null
        ? { hasLinkedRepair: query.hasLinkedRepair }
        : {}),
      ...(query.payrollBlocking != null
        ? { payrollBlocking: query.payrollBlocking }
        : {}),
      ...(dueRange ? { dueAt: dueRange } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: 'insensitive' } },
              { assetLabel: { contains: q, mode: 'insensitive' } },
              { assetCode: { contains: q, mode: 'insensitive' } },
              { parentTruck: { contains: q, mode: 'insensitive' } },
              { inspectorName: { contains: q, mode: 'insensitive' } },
              { customerName: { contains: q, mode: 'insensitive' } },
              { workOrderCode: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.fleetInspection.findMany({ where });
    const sort = (query.sort ?? 'dueAt').toLowerCase();
    const mapped = rows.map((r) => this.mapRow(r));
    mapped.sort((a, b) => {
      const pin = inspectionPinScore(a) - inspectionPinScore(b);
      if (pin !== 0) return pin;
      if (sort === 'asset') return cmpField(a.assetLabel, b.assetLabel, dir);
      if (sort === 'inspector')
        return cmpField(a.inspectorName, b.inspectorName, dir);
      if (sort === 'result') return cmpField(a.result, b.result, dir);
      if (sort === 'status') return cmpField(a.status, b.status, dir);
      if (sort === 'inspected')
        return cmpField(a.inspectedAt, b.inspectedAt, dir);
      return cmpField(a.dueAt, b.dueAt, dir);
    });

    const total = mapped.length;
    const skip = (page - 1) * pageSize;
    return { data: paginate(mapped.slice(skip, skip + pageSize), total, page, pageSize) };
  }

  async kpi() {
    await this.ensureSeed();
    const rows = await this.prisma.fleetInspection.findMany({
      where: { archivedAt: null, parentInspectionId: null },
    });
    const complete = rows.filter(
      (r) => r.status === 'COMPLETE' || r.status === 'REVIEWED',
    ).length;
    const needsReview = rows.filter((r) => r.status === 'NEEDS_REVIEW').length;
    const expired = rows.filter((r) => r.status === 'EXPIRED').length;
    const missing = rows.filter((r) => r.status === 'MISSING').length;
    const total = Math.max(rows.length, 1);
    const nextDue = [...rows]
      .filter((r) => r.dueAt && r.dueAt.getTime() >= Date.now())
      .sort((a, b) => (a.dueAt!.getTime() - b.dueAt!.getTime()))[0];
    const nextDueHint = nextDue
      ? asciiSafe(
          `${nextDue.parentTruck ?? nextDue.assetLabel} ${nextDue.type ?? 'INSPECTION'} - ${fmtShortDate(nextDue.dueAt)}`,
        )
      : null;

    return {
      data: {
        cells: [
          {
            title: 'Complete',
            value: String(complete),
            meta: `${Math.round((complete / total) * 100)}% OF ${rows.length} TOTAL`,
            filterKey: 'COMPLETE',
          },
          {
            title: 'Needs Review',
            value: String(needsReview),
            meta: 'FLAGS RAISED',
            filterKey: 'NEEDS_REVIEW',
          },
          {
            title: 'Expired',
            value: String(expired),
            meta: expired === 0 ? 'NONE OVERDUE' : 'PAST DUE',
            filterKey: 'EXPIRED',
          },
          {
            title: 'Missing',
            value: String(missing),
            meta: missing > 0 ? 'PAYROLL-BLOCK' : 'NONE MISSING',
            filterKey: 'MISSING',
          },
        ],
        emptyHints: {
          EXPIRED: {
            title: 'NO EXPIRED INSPECTIONS',
            subtitle: nextDueHint
              ? `EVERY ASSET IS INSPECTION-CURRENT. NEXT DUE: ${nextDueHint}.`
              : 'EVERY ASSET IS INSPECTION-CURRENT.',
            actionLabel: 'VIEW ALL INSPECTIONS',
          },
          MISSING: {
            title: 'NO MISSING INSPECTIONS',
            subtitle: 'ALL REQUIRED INSPECTIONS HAVE BEEN SUBMITTED.',
            actionLabel: 'VIEW ALL INSPECTIONS',
          },
          NEEDS_REVIEW: {
            title: 'NOTHING NEEDS REVIEW',
            subtitle: 'ALL SUBMITTED INSPECTIONS ARE CLEARED.',
            actionLabel: 'VIEW ALL INSPECTIONS',
          },
          COMPLETE: {
            title: 'NO COMPLETE INSPECTIONS',
            subtitle: 'COMPLETED INSPECTIONS WILL APPEAR HERE.',
            actionLabel: 'VIEW ALL INSPECTIONS',
          },
        },
      },
    };
  }

  async bulkMarkReviewed(dto: BulkReviewDto) {
    await this.ensureSeed();
    if (!dto.ids?.length) throw new BadRequestException('ids required');
    const now = new Date();
    const reviewer = dto.reviewedBy?.trim()
      ? asciiSafe(dto.reviewedBy.trim().toUpperCase())
      : 'FLEET ADMIN';
    await this.prisma.fleetInspection.updateMany({
      where: { id: { in: dto.ids }, archivedAt: null },
      data: { status: 'REVIEWED', reviewedAt: now, reviewedBy: reviewer },
    });
    const rows = await this.prisma.fleetInspection.findMany({
      where: { id: { in: dto.ids } },
    });
    return {
      data: {
        updated: rows.length,
        items: rows.map((r) => this.mapRow(r)),
      },
    };
  }

  async createCorrectiveAction(id: string, dto: CreateCorrectiveActionDto) {
    await this.ensureSeed();
    const inspection = await this.prisma.fleetInspection.findFirst({
      where: {
        archivedAt: null,
        OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }],
      },
    });
    if (!inspection) throw new NotFoundException('Inspection not found');

    const count = await this.prisma.fleetCorrectiveAction.count();
    const code = `CA-${String(count + 1).padStart(4, '0')}`;
    const dueAt = parseDate(dto.dueAt);
    const action = await this.prisma.fleetCorrectiveAction.create({
      data: {
        code,
        inspectionId: inspection.id,
        inspectionCode: inspection.code,
        assetLabel: inspection.assetLabel,
        parentTruck: inspection.parentTruck,
        rootCause: asciiSafe(dto.rootCause),
        description: asciiSafe(dto.description),
        assignedTo: asciiSafe(dto.assignedTo.toUpperCase()),
        dueAt,
        priority: dto.priority ? asciiSafe(dto.priority.toUpperCase()) : 'HIGH',
        findings: dto.findings?.length
          ? (dto.findings as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    await this.prisma.fleetInspection.update({
      where: { id: inspection.id },
      data: { status: 'REPAIR_RAISED' },
    });

    return {
      data: {
        message: `${code} saved`,
        code: action.code,
        id: action.id,
        inspectionId: action.inspectionId,
        inspectionCode: action.inspectionCode,
        assetLabel: action.assetLabel,
        rootCause: action.rootCause,
        description: action.description,
        assignedTo: action.assignedTo,
        dueAt: action.dueAt,
        dueLabel: buildDueLabel(action.dueAt),
        priority: action.priority,
      },
    };
  }

  private async findInspection(id: string) {
    const row = await this.prisma.fleetInspection.findFirst({
      where: {
        archivedAt: null,
        OR: [{ id }, { code: { equals: id, mode: 'insensitive' } }],
      },
    });
    if (!row) throw new NotFoundException('Inspection not found');
    return row;
  }

  async getById(id: string) {
    await this.ensureSeed();
    const row = await this.findInspection(id);
    const mapped = this.mapRow(row);

    const [correctiveActions, linkedRepair, reInspection, siblingIds] =
      await Promise.all([
        this.prisma.fleetCorrectiveAction.findMany({
          where: { inspectionId: row.id },
          orderBy: { createdAt: 'desc' },
        }),
        row.repairCode
          ? this.prisma.fleetRepairRequest.findFirst({
              where: {
                archivedAt: null,
                OR: [
                  { code: row.repairCode },
                  { inspectionCode: row.code },
                ],
              },
            })
          : this.prisma.fleetRepairRequest.findFirst({
              where: { archivedAt: null, inspectionCode: row.code },
            }),
        row.reInspectionId
          ? this.prisma.fleetInspection.findFirst({
              where: { id: row.reInspectionId, archivedAt: null },
            })
          : Promise.resolve(null),
        this.prisma.fleetInspection.findMany({
          where: { archivedAt: null, parentInspectionId: null },
          select: { id: true, result: true, inspectedAt: true },
          orderBy: [{ inspectedAt: 'desc' }],
        }),
      ]);

    const ordered = [...siblingIds].sort((a, b) => {
      const pin =
        (a.result === 'FAILED' ? 0 : 1) - (b.result === 'FAILED' ? 0 : 1);
      if (pin !== 0) return pin;
      return (b.inspectedAt?.getTime() ?? 0) - (a.inspectedAt?.getTime() ?? 0);
    });
    const index = ordered.findIndex((r) => r.id === row.id);
    const prevId = index > 0 ? ordered[index - 1]!.id : null;
    const nextId =
      index >= 0 && index < ordered.length - 1 ? ordered[index + 1]!.id : null;

    return {
      data: {
        ...mapped,
        correctiveActions: correctiveActions.map((a) => ({
          id: a.id,
          code: a.code,
          rootCause: a.rootCause,
          description: a.description,
          assignedTo: a.assignedTo,
          dueAt: a.dueAt,
          dueLabel: buildDueLabel(a.dueAt),
          priority: a.priority,
        })),
        linkedRepair: linkedRepair
          ? {
              id: linkedRepair.id,
              code: linkedRepair.code,
              assetLabel: linkedRepair.assetLabel,
              issue: linkedRepair.issue,
              status: linkedRepair.status,
              statusLabel: labelOf(linkedRepair.status),
              priority: linkedRepair.priority,
              vendorName: linkedRepair.vendorName,
              etaLabel: linkedRepair.etaLabel,
            }
          : null,
        reInspection: reInspection
          ? {
              id: reInspection.id,
              code: reInspection.code,
              dueLabel: buildDueLabel(reInspection.dueAt),
              status: reInspection.status,
              inspectorName: reInspection.inspectorName,
            }
          : null,
        correctiveActionRaised: correctiveActions.length > 0,
        nav: {
          index: index >= 0 ? index + 1 : 1,
          total: ordered.length,
          prevId,
          nextId,
          orderLabel: 'ORDERED BY DATE - FAILURES FIRST',
        },
        lockedFields: [
          'ASSET ID',
          'SERIAL NUMBER',
          'SOURCE',
          'ORIGINAL TIMESTAMP',
          'INSPECTOR',
        ],
        editReasons: [
          'DATA ENTRY ERROR',
          'WRONG ASSET',
          'DATE CORRECTION',
          'RESULT CORRECTION',
          'OTHER',
        ],
      },
    };
  }

  async reinspect(id: string, dto: ReinspectDto) {
    await this.ensureSeed();
    const parent = await this.findInspection(id);
    const mapped = this.mapRow(parent);
    const failLabels = mapped.checklistItems
      .filter((c) => c.result === 'FAIL')
      .map((c) => c.label);
    const selected = dto.includeAll
      ? mapped.checklistItems.map((c) => c.label)
      : (dto.recheckLabels?.length ? dto.recheckLabels : failLabels).map((l) =>
          l.toUpperCase(),
        );
    if (!selected.length) {
      throw new BadRequestException('Select at least one item to re-check');
    }

    const count = await this.prisma.fleetInspection.count();
    const code = `INS-${String(count + 1).padStart(4, '0')}`;
    const dueAt =
      parseDate(dto.dueAt) ?? new Date(Date.now() + 7 * DAY_MS);
    const inspector =
      dto.inspectorName?.trim()
        ? asciiSafe(dto.inspectorName.trim().toUpperCase())
        : parent.inspectorName;
    const source = dto.source?.trim()
      ? asciiSafe(dto.source.trim().toUpperCase())
      : parent.source ?? 'MOBILE_APP';
    const checklist = buildChecklist(
      selected.filter((l) => failLabels.includes(l) || dto.includeAll),
    ).map((item) =>
      selected.includes(item.label)
        ? item
        : { ...item, result: 'PASS' as const, detail: item.detail },
    );
    const recheckChecklist = dto.includeAll
      ? buildChecklist([])
      : buildChecklist(selected);

    const created = await this.prisma.fleetInspection.create({
      data: {
        code,
        assetCode: parent.assetCode,
        assetLabel: parent.assetLabel,
        parentTruck: parent.parentTruck,
        inspectorName: inspector,
        inspectedAt: null,
        dueAt,
        result: 'NOT_DONE',
        status: 'MISSING',
        type: 'RE-INSPECTION',
        serial: parent.serial,
        source,
        parentInspectionId: parent.id,
        findingsSummary: dto.notes?.trim()
          ? asciiSafe(dto.notes.trim())
          : asciiSafe(`RE-CHECK BASED ON ${parent.code}`),
        checklistItems: (dto.includeAll
          ? buildChecklist([])
          : recheckChecklist) as unknown as Prisma.InputJsonValue,
        failedItems: Prisma.JsonNull,
        flags: {
          basedOn: parent.code,
          recheckLabels: selected,
          draft: true,
        } as unknown as Prisma.InputJsonValue,
        version: 1,
      },
    });

    await this.prisma.fleetInspection.update({
      where: { id: parent.id },
      data: {
        reInspectionId: created.id,
        reInspectionDueAt: dueAt,
      },
    });

    return {
      data: {
        ...this.mapRow(created),
        basedOn: {
          id: parent.id,
          code: parent.code,
          result: parent.result,
          dateLabel: fmtShortDate(parent.inspectedAt),
        },
        recheckLabels: selected,
        message: asciiSafe(
          `RE-INSPECTION ${code} CREATED FOR ${parent.assetCode}. DUE ${fmtShortDate(dueAt)} - ASSIGNED TO ${inspector}.`,
        ),
        checklistPreview: checklist,
      },
    };
  }

  async edit(id: string, dto: EditInspectionDto) {
    await this.ensureSeed();
    if (!dto.reason?.trim() || !dto.details?.trim()) {
      throw new BadRequestException('Reason and details are required');
    }
    const row = await this.findInspection(id);
    const before = this.mapRow(row);
    const nextChecklist = dto.checklistItems?.length
      ? before.checklistItems.map((item) => {
          const patch = dto.checklistItems!.find(
            (p) => p.label.toUpperCase() === item.label.toUpperCase(),
          );
          if (!patch) return item;
          const result =
            String(patch.result ?? item.result).toUpperCase() === 'FAIL'
              ? 'FAIL'
              : 'PASS';
          return {
            ...item,
            result,
            note: patch.note ?? item.note,
            detail: patch.note?.trim() || item.detail,
          };
        })
      : before.checklistItems;

    const failed = nextChecklist.filter((c) => c.result === 'FAIL');
    let nextResult: FleetInspectionResult = row.result;
    if (dto.result) {
      const r = dto.result.toUpperCase();
      if (
        r === 'PASS' ||
        r === 'FAILED' ||
        r === 'NOT_DONE' ||
        r === 'PASS_WITH_FINDINGS'
      ) {
        nextResult = r as FleetInspectionResult;
      }
    } else if (failed.length === 0) {
      nextResult = 'PASS';
    } else {
      nextResult = 'FAILED';
    }

    const editor = dto.editedBy?.trim()
      ? asciiSafe(dto.editedBy.trim().toUpperCase())
      : 'FLEET ADMIN';
    const now = new Date();
    const updated = await this.prisma.fleetInspection.update({
      where: { id: row.id },
      data: {
        result: nextResult,
        findingsSummary: dto.findingsSummary?.trim()
          ? asciiSafe(dto.findingsSummary.trim())
          : row.findingsSummary,
        checklistItems: nextChecklist as unknown as Prisma.InputJsonValue,
        failedItems: failed.map((f) => ({
          label: f.label,
          detail: f.detail,
          failed: true,
        })) as unknown as Prisma.InputJsonValue,
        version: (row.version ?? 1) + 1,
        editReason: asciiSafe(dto.reason.trim().toUpperCase()),
        editDetails: asciiSafe(dto.details.trim()),
        editedBy: editor,
        editedAt: now,
        originalSnapshot:
          row.originalSnapshot ??
          ({
            version: row.version ?? 1,
            result: row.result,
            checklistItems: before.checklistItems,
            findingsSummary: row.findingsSummary,
            inspectedAt: row.inspectedAt,
          } as unknown as Prisma.InputJsonValue),
      },
    });

    return {
      data: {
        ...this.mapRow(updated),
        message: asciiSafe(
          `${updated.code} UPDATED. V${row.version ?? 1} ARCHIVED.`,
        ),
      },
    };
  }

  async createRepair(id: string, dto: CreateRepairFromInspectionDto) {
    await this.ensureSeed();
    const inspection = await this.findInspection(id);
    const count = await this.prisma.fleetRepairRequest.count();
    const code = `RR-${String(2000 + count + 1).padStart(4, '0')}`;
    const issue =
      dto.issue?.trim() ||
      inspection.findingsSummary ||
      `${inspection.assetLabel} FAILED INSPECTION ${inspection.code}`;
    const repair = await this.prisma.fleetRepairRequest.create({
      data: {
        code,
        assetCode: inspection.assetCode,
        assetLabel: inspection.assetLabel,
        issue: asciiSafe(issue),
        priority: dto.priority ?? 'HIGH',
        vendorName: dto.vendorName
          ? asciiSafe(dto.vendorName.toUpperCase())
          : null,
        assignedName: dto.assignedName
          ? asciiSafe(dto.assignedName.toUpperCase())
          : inspection.inspectorName,
        status: 'OPEN',
        parentTruck: inspection.parentTruck,
        inspectionCode: inspection.code,
      },
    });
    await this.prisma.fleetInspection.update({
      where: { id: inspection.id },
      data: {
        hasLinkedRepair: true,
        repairCode: repair.code,
        status: 'REPAIR_RAISED',
      },
    });
    return {
      data: {
        id: repair.id,
        code: repair.code,
        message: asciiSafe(`${repair.code} CREATED FROM ${inspection.code}`),
      },
    };
  }
}
