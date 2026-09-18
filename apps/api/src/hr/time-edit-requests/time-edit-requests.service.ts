import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TimeEditRequestStatus,
  TimeEditRequestType,
  TimeEntryStatus,
} from '@prisma/client';
import { orderByFrom, paginate, parsePage } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AddTimeEditNoteDto,
  AdminOverrideTimeEditDto,
  ClarifyTimeEditRequestDto,
  RejectTimeEditRequestDto,
  SaveTimeEditAdminNoteDto,
  TimeEditRequestQueryDto,
} from './dto/time-edit-request.dto';

const SORT_MAP: Record<string, string> = {
  createdAt: 'createdAt',
  workDate: 'workDate',
  status: 'status',
  type: 'type',
};

const employeeInclude = {
  employee: {
    select: {
      id: true,
      code: true,
      firstName: true,
      lastName: true,
      displayName: true,
    },
  },
} as const;

type Row = Prisma.TimeEditRequestGetPayload<{ include: typeof employeeInclude }>;

function dec(n: Prisma.Decimal | number | null | undefined) {
  return Number(n ?? 0);
}

function typeLabel(type: TimeEditRequestType) {
  return type.replaceAll('_', '-');
}

function techName(row: Row) {
  return (
    row.employee.displayName ||
    `${row.employee.firstName} ${row.employee.lastName}`.trim()
  );
}

@Injectable()
export class TimeEditRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapRow(row: Row) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      technician: {
        id: row.employee.id,
        code: row.employee.code,
        name: techName(row),
      },
      timeEntryId: row.timeEntryId,
      workDate: row.workDate.toISOString().slice(0, 10),
      dateLabel: row.dateLabel,
      cycleLabel: row.cycleLabel,
      workOrderCode: row.workOrderCode,
      customerName: row.customerName,
      type: row.type,
      typeLabel: typeLabel(row.type),
      status: row.status,
      deltaHours: dec(row.deltaHours),
      deltaLabel: row.deltaLabel,
      differenceKind: row.differenceKind,
      relativeTime: row.relativeTime,
      originalClockIn: row.originalClockIn,
      originalClockOut: row.originalClockOut,
      originalHours: row.originalHours != null ? dec(row.originalHours) : null,
      requestedClockIn: row.requestedClockIn,
      requestedClockOut: row.requestedClockOut,
      requestedHours:
        row.requestedHours != null ? dec(row.requestedHours) : null,
      technicianReason: row.technicianReason,
      gpsContext: row.gpsContext,
      adminNote: row.adminNote,
      needsClarification: row.needsClarification,
      lockedCycle: row.lockedCycle,
      payrollCycleLabel: row.payrollCycleLabel,
      cycleClosedLabel: row.cycleClosedLabel,
      dollarDelta: row.dollarDelta != null ? dec(row.dollarDelta) : null,
      dollarDeltaLabel: row.dollarDeltaLabel,
      auditWarning: row.auditWarning,
      offCycleRunLabel: row.offCycleRunLabel,
      overrideByName: row.overrideByName,
      overrideAt: row.overrideAt?.toISOString() ?? null,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async load(id: string) {
    const row = await this.prisma.timeEditRequest.findUnique({
      where: { id },
      include: employeeInclude,
    });
    if (!row) throw new NotFoundException('Time edit request not found');
    return row;
  }

  async kpi() {
    const cycle = await this.currentCycleLabel();
    const base = { cycleLabel: cycle };

    const [pending, needsClarification, approved, rejected, approvedRows] =
      await Promise.all([
        this.prisma.timeEditRequest.count({
          where: {
            ...base,
            status: {
              in: [
                TimeEditRequestStatus.PENDING,
                TimeEditRequestStatus.NEEDS_CLARIFICATION,
              ],
            },
          },
        }),
        this.prisma.timeEditRequest.count({
          where: {
            ...base,
            needsClarification: true,
            status: {
              in: [
                TimeEditRequestStatus.PENDING,
                TimeEditRequestStatus.NEEDS_CLARIFICATION,
              ],
            },
          },
        }),
        this.prisma.timeEditRequest.count({
          where: { ...base, status: TimeEditRequestStatus.APPROVED },
        }),
        this.prisma.timeEditRequest.count({
          where: { ...base, status: TimeEditRequestStatus.REJECTED },
        }),
        this.prisma.timeEditRequest.findMany({
          where: {
            ...base,
            status: TimeEditRequestStatus.APPROVED,
            resolvedAt: { not: null },
          },
          select: { createdAt: true, resolvedAt: true },
        }),
      ]);

    let avgTurnaroundHours = 0;
    if (approvedRows.length > 0) {
      const totalMs = approvedRows.reduce((sum, r) => {
        if (!r.resolvedAt) return sum;
        return sum + (r.resolvedAt.getTime() - r.createdAt.getTime());
      }, 0);
      avgTurnaroundHours = Math.round(totalMs / approvedRows.length / 36e5);
    }

    return {
      data: {
        pending,
        needsClarification,
        approvedCycle: approved,
        avgTurnaroundHours,
        rejectedCycle: rejected,
        lockedCycle: rejected > 0,
        cycleLabel: cycle,
      },
    };
  }

  private async currentCycleLabel() {
    const latest = await this.prisma.timeEditRequest.findFirst({
      orderBy: { workDate: 'desc' },
      select: { cycleLabel: true },
    });
    return latest?.cycleLabel ?? 'JUN 1–15 2026';
  }

  async list(query: TimeEditRequestQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const and: Prisma.TimeEditRequestWhereInput[] = [];

    if (query.status && query.status !== 'ANY') {
      and.push({ status: query.status as TimeEditRequestStatus });
    } else {
      and.push({
        status: {
          in: [
            TimeEditRequestStatus.PENDING,
            TimeEditRequestStatus.NEEDS_CLARIFICATION,
          ],
        },
      });
    }

    if (query.type && query.type !== 'ANY') {
      and.push({ type: query.type as TimeEditRequestType });
    }

    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { employee: { displayName: { contains: q, mode: 'insensitive' } } },
          { employee: { firstName: { contains: q, mode: 'insensitive' } } },
          { employee: { lastName: { contains: q, mode: 'insensitive' } } },
          { workOrderCode: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.TimeEditRequestWhereInput =
      and.length > 0 ? { AND: and } : {};

    const [total, rows] = await Promise.all([
      this.prisma.timeEditRequest.count({ where }),
      this.prisma.timeEditRequest.findMany({
        where,
        include: employeeInclude,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          createdAt: 'desc',
        }),
        skip,
        take,
      }),
    ]);

    return {
      data: paginate(
        rows.map((r) => this.mapRow(r)),
        total,
        page,
        pageSize,
      ),
    };
  }

  async getOne(id: string) {
    return { data: this.mapRow(await this.load(id)) };
  }

  async approve(id: string, adminNote?: string) {
    const row = await this.load(id);
    if (
      row.status === TimeEditRequestStatus.APPROVED ||
      row.status === TimeEditRequestStatus.REJECTED
    ) {
      throw new BadRequestException('Request already resolved');
    }
    if (row.lockedCycle || row.type === TimeEditRequestType.ADMIN_OVERRIDE) {
      throw new BadRequestException(
        'Locked-cycle request requires admin override',
      );
    }

    if (row.timeEntryId) {
      await this.prisma.timeEntry.updateMany({
        where: { id: row.timeEntryId },
        data: {
          clockIn: row.requestedClockIn ?? undefined,
          clockOut: row.requestedClockOut ?? undefined,
          hours: row.requestedHours ?? undefined,
          correctionApplied: true,
          correctionReason: row.technicianReason ?? undefined,
          correctionRequested: false,
          status: TimeEntryStatus.APPROVED,
        },
      });
    }

    const note = adminNote?.trim();
    const updated = await this.prisma.timeEditRequest.update({
      where: { id },
      data: {
        status: TimeEditRequestStatus.APPROVED,
        needsClarification: false,
        resolvedAt: new Date(),
        adminNote: note ?? row.adminNote,
      },
      include: employeeInclude,
    });

    await this.syncEmployeeOpenFlag(row.employeeId);
    return { data: this.mapRow(updated) };
  }

  async adminOverride(id: string, dto: AdminOverrideTimeEditDto) {
    const row = await this.load(id);
    if (
      row.status === TimeEditRequestStatus.APPROVED ||
      row.status === TimeEditRequestStatus.REJECTED
    ) {
      throw new BadRequestException('Request already resolved');
    }
    if (!row.lockedCycle && row.type !== TimeEditRequestType.ADMIN_OVERRIDE) {
      throw new BadRequestException(
        'Admin override is only for locked-cycle requests',
      );
    }

    const now = new Date();
    if (row.timeEntryId) {
      await this.prisma.timeEntry.updateMany({
        where: { id: row.timeEntryId },
        data: {
          clockIn: row.requestedClockIn ?? undefined,
          clockOut: row.requestedClockOut ?? undefined,
          hours: row.requestedHours ?? undefined,
          correctionApplied: true,
          correctionReason: row.technicianReason ?? undefined,
          correctionRequested: false,
          status: TimeEntryStatus.APPROVED,
          locked: false,
        },
      });
    }

    const note = dto.adminNote?.trim();
    const updated = await this.prisma.timeEditRequest.update({
      where: { id },
      data: {
        status: TimeEditRequestStatus.APPROVED,
        needsClarification: false,
        resolvedAt: now,
        overrideAt: now,
        overrideByName: dto.overrideByName?.trim() || 'Ryan Crawford (CEO)',
        adminNote: note ?? row.adminNote,
      },
      include: employeeInclude,
    });

    await this.syncEmployeeOpenFlag(row.employeeId);
    return { data: this.mapRow(updated) };
  }

  async reject(id: string, dto: RejectTimeEditRequestDto) {
    const row = await this.load(id);
    if (
      row.status === TimeEditRequestStatus.APPROVED ||
      row.status === TimeEditRequestStatus.REJECTED
    ) {
      throw new BadRequestException('Request already resolved');
    }

    if (row.timeEntryId) {
      await this.prisma.timeEntry.updateMany({
        where: { id: row.timeEntryId },
        data: { correctionRequested: false },
      });
    }

    const note = dto.reason?.trim();
    const updated = await this.prisma.timeEditRequest.update({
      where: { id },
      data: {
        status: TimeEditRequestStatus.REJECTED,
        needsClarification: false,
        resolvedAt: new Date(),
        adminNote: note
          ? [row.adminNote, note].filter(Boolean).join('\n')
          : row.adminNote,
      },
      include: employeeInclude,
    });

    await this.syncEmployeeOpenFlag(row.employeeId);
    return { data: this.mapRow(updated) };
  }

  async clarify(id: string, dto: ClarifyTimeEditRequestDto) {
    const row = await this.load(id);
    if (
      row.status === TimeEditRequestStatus.APPROVED ||
      row.status === TimeEditRequestStatus.REJECTED
    ) {
      throw new BadRequestException('Request already resolved');
    }

    const message = dto.message?.trim();
    const updated = await this.prisma.timeEditRequest.update({
      where: { id },
      data: {
        status: TimeEditRequestStatus.NEEDS_CLARIFICATION,
        needsClarification: true,
        adminNote: message
          ? [row.adminNote, `Clarification: ${message}`]
              .filter(Boolean)
              .join('\n')
          : row.adminNote,
      },
      include: employeeInclude,
    });

    return { data: this.mapRow(updated) };
  }

  async saveAdminNote(id: string, dto: SaveTimeEditAdminNoteDto) {
    const updated = await this.prisma.timeEditRequest.update({
      where: { id },
      data: { adminNote: dto.adminNote },
      include: employeeInclude,
    });
    return { data: this.mapRow(updated) };
  }

  async addNote(dto: AddTimeEditNoteDto) {
    const text = dto.text.trim();
    if (!text) throw new BadRequestException('Note text is required');

    if (dto.requestId) {
      const row = await this.load(dto.requestId);
      const updated = await this.prisma.timeEditRequest.update({
        where: { id: dto.requestId },
        data: {
          adminNote: [row.adminNote, text].filter(Boolean).join('\n'),
        },
        include: employeeInclude,
      });
      return { data: this.mapRow(updated) };
    }

    const open = await this.prisma.timeEditRequest.findFirst({
      where: {
        status: {
          in: [
            TimeEditRequestStatus.PENDING,
            TimeEditRequestStatus.NEEDS_CLARIFICATION,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: employeeInclude,
    });
    if (!open) throw new NotFoundException('No open request to attach note');

    const updated = await this.prisma.timeEditRequest.update({
      where: { id: open.id },
      data: {
        adminNote: [open.adminNote, text].filter(Boolean).join('\n'),
      },
      include: employeeInclude,
    });
    return { data: this.mapRow(updated) };
  }

  async exportLog() {
    const rows = await this.prisma.timeEditRequest.findMany({
      include: employeeInclude,
      orderBy: { createdAt: 'desc' },
    });
    const header = [
      'id',
      'technician',
      'date',
      'type',
      'status',
      'delta',
      'workOrder',
      'customer',
      'original',
      'requested',
      'reason',
    ];
    const lines = rows.map((r) => {
      const m = this.mapRow(r);
      return [
        m.id,
        m.technician.name,
        m.dateLabel,
        m.typeLabel,
        m.status,
        m.deltaLabel,
        m.workOrderCode ?? '',
        m.customerName ?? '',
        `${m.originalClockIn ?? ''} -> ${m.originalClockOut ?? ''}`,
        `${m.requestedClockIn ?? ''} -> ${m.requestedClockOut ?? ''}`,
        (m.technicianReason ?? '').replaceAll('"', '""'),
      ]
        .map((v) => `"${String(v)}"`)
        .join(',');
    });
    return {
      data: {
        csv: [header.join(','), ...lines].join('\n'),
        filename: 'time-edit-requests.csv',
      },
    };
  }

  private async syncEmployeeOpenFlag(employeeId: string) {
    const open = await this.prisma.timeEditRequest.count({
      where: {
        employeeId,
        status: {
          in: [
            TimeEditRequestStatus.PENDING,
            TimeEditRequestStatus.NEEDS_CLARIFICATION,
          ],
        },
      },
    });
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { hasOpenTimeEdit: open > 0 },
    });
  }
}
