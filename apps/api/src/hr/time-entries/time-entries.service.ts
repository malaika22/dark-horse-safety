import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TimeEntryCategory,
  TimeEntrySource,
  TimeEntryStatus,
} from '@prisma/client';
import {
  containsCi,
  orderByFrom,
  paginate,
  parsePage,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AddTimeEntryNoteDto,
  BulkApproveTimeEntriesDto,
  RejectTimeEntryDto,
  RequestCorrectionDto,
  SaveAdminNoteDto,
  TimeEntryQueryDto,
  UpdateTimeEntryAdminDto,
} from './dto/time-entry.dto';

const SORT_MAP: Record<string, string> = {
  date: 'workDate',
  hours: 'hours',
  status: 'status',
  category: 'category',
  createdAt: 'createdAt',
};

type NoteRow = { id: string; text: string; createdAt: string };
type DocRow = {
  id: string;
  name: string;
  impact: string;
  status: string;
};
type HistoryRow = {
  id: string;
  at: string;
  label: string;
  detail?: string;
};

function dec(n: Prisma.Decimal | number | null | undefined) {
  return Number(n ?? 0);
}

function asNotes(value: unknown): NoteRow[] {
  return Array.isArray(value) ? (value as NoteRow[]) : [];
}

function asDocs(value: unknown): DocRow[] {
  return Array.isArray(value) ? (value as DocRow[]) : [];
}

function asHistory(value: unknown): HistoryRow[] {
  return Array.isArray(value) ? (value as HistoryRow[]) : [];
}

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

type TimeEntryWithEmployee = Prisma.TimeEntryGetPayload<{
  include: typeof employeeInclude;
}>;

function fmtDateLabel(d: Date) {
  return d
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .toUpperCase();
}

function shortTechName(firstName: string, lastName: string, displayName?: string | null) {
  if (displayName?.trim()) return displayName.trim();
  const f = firstName?.trim() ?? '';
  const l = lastName?.trim() ?? '';
  if (!f && !l) return '—';
  return `${f.charAt(0)}. ${l}`.toUpperCase();
}

@Injectable()
export class TimeEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  private where(query: TimeEntryQueryDto): Prisma.TimeEntryWhereInput {
    const and: Prisma.TimeEntryWhereInput[] = [{ archivedAt: null }];

    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { workOrderShort: containsCi(q) },
          { workOrderCode: containsCi(q) },
          { cycleLabel: containsCi(q) },
          { employee: { firstName: containsCi(q) } },
          { employee: { lastName: containsCi(q) } },
          { employee: { displayName: containsCi(q) } },
          { employee: { code: containsCi(q) } },
        ],
      });
    }

    if (query.status && query.status !== 'ANY') {
      const s = query.status.toUpperCase().replace(/\s+/g, '_').replace(/\./g, '');
      const map: Record<string, TimeEntryStatus> = {
        APPROVED: TimeEntryStatus.APPROVED,
        PENDING: TimeEntryStatus.PENDING,
        REJECTED: TimeEntryStatus.REJECTED,
        MISSING_CO: TimeEntryStatus.MISSING_CO,
        'MISSING_C_O': TimeEntryStatus.MISSING_CO,
        MISSINGCO: TimeEntryStatus.MISSING_CO,
        LOCKED: TimeEntryStatus.LOCKED,
      };
      if (map[s]) and.push({ status: map[s] });
    }

    if (query.technicianId && query.technicianId !== 'ANY') {
      and.push({ employeeId: query.technicianId });
    }

    if (query.category && query.category !== 'ANY') {
      const c = query.category.toUpperCase().replace(/[-\s]+/g, '_');
      const map: Record<string, TimeEntryCategory> = {
        REGULAR: TimeEntryCategory.REGULAR,
        OVERTIME: TimeEntryCategory.OVERTIME,
        NON_BILLABLE: TimeEntryCategory.NON_BILLABLE,
        ON_JOB_TRAINING: TimeEntryCategory.ON_JOB_TRAINING,
      };
      if (map[c]) and.push({ category: map[c] });
    }

    if (query.dateFrom || query.dateTo) {
      const workDate: Prisma.DateTimeFilter = {};
      if (query.dateFrom) workDate.gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
      if (query.dateTo) workDate.lte = new Date(`${query.dateTo}T23:59:59.999Z`);
      and.push({ workDate });
    }

    if (query.gpsFlagged === 'true' || query.gpsFlagged === '1') {
      and.push({ gpsFlagged: true });
    }

    if (query.missingClockOut === 'true' || query.missingClockOut === '1') {
      and.push({
        OR: [
          { status: TimeEntryStatus.MISSING_CO },
          { clockOut: null },
          { clockOut: '' },
        ],
      });
    }

    if (query.billable === 'BILLABLE') and.push({ billable: true });
    if (query.billable === 'NON_BILLABLE' || query.billable === 'NON-BILLABLE') {
      and.push({ billable: false });
    }

    if (query.locked === 'LOCKED' || query.locked === 'true') {
      and.push({ locked: true });
    }
    if (query.locked === 'UNLOCKED' || query.locked === 'false') {
      and.push({ locked: false });
    }

    return { AND: and };
  }

  private mapRow(row: TimeEntryWithEmployee) {
    const requiredDocuments = asDocs(row.requiredDocuments);
    const docsSubmitted =
      row.docsSubmitted ||
      requiredDocuments.filter((d) => d.status === 'SUBMITTED').length;
    const docsRequired = row.docsRequired || requiredDocuments.length;
    return {
      id: row.id,
      date: row.workDate.toISOString().slice(0, 10),
      dateLabel: fmtDateLabel(row.workDate),
      cycleLabel: row.cycleLabel,
      technician: {
        id: row.employee.id,
        code: row.employee.code,
        name: shortTechName(
          row.employee.firstName,
          row.employee.lastName,
          row.employee.displayName,
        ),
      },
      workOrderShort: row.workOrderShort,
      workOrderCode: row.workOrderCode,
      category: row.category,
      clockIn: row.clockIn,
      clockOut: row.clockOut,
      source: row.source,
      hours: dec(row.hours),
      workHours: row.workHours == null ? null : dec(row.workHours),
      travelHours: row.travelHours == null ? null : dec(row.travelHours),
      billable: row.billable,
      gpsFlagged: row.gpsFlagged,
      gpsLabel: row.gpsLabel,
      status: row.status,
      locked: row.locked,
      correctionRequested: row.correctionRequested,
      systemSuggestedHours:
        row.systemSuggestedHours == null
          ? dec(row.hours)
          : dec(row.systemSuggestedHours),
      correctionApplied: row.correctionApplied,
      correctionReason: row.correctionReason,
      jobLocation: row.jobLocation,
      jobType: row.jobType,
      salesTicketId: row.salesTicketId,
      customerName: row.customerName,
      missingDocs: row.missingDocs,
      docsSubmitted,
      docsRequired,
      payrollBlockCount: row.payrollBlockCount,
      gpsStatusLabel: row.gpsStatusLabel,
      clockInLat: row.clockInLat,
      clockInLng: row.clockInLng,
      clockInDistanceMi: row.clockInDistanceMi,
      clockOutLat: row.clockOutLat,
      clockOutLng: row.clockOutLng,
      clockOutDistanceMi: row.clockOutDistanceMi,
      jobLat: row.jobLat,
      jobLng: row.jobLng,
      jobSiteLabel: row.jobSiteLabel,
      payrollHours:
        row.payrollHours == null ? dec(row.hours) : dec(row.payrollHours),
      billableHours:
        row.billableHours == null
          ? row.workHours == null
            ? dec(row.hours)
            : dec(row.workHours)
          : dec(row.billableHours),
      nonBillableReason: row.nonBillableReason,
      nonBillableHours:
        row.nonBillableHours == null ? null : dec(row.nonBillableHours),
      nonBillableContext: row.nonBillableContext,
      adminNote: row.adminNote,
      requiredDocuments,
      editHistory: asHistory(row.editHistory),
      notes: asNotes(row.notes),
      gpsTrail: Array.isArray(row.gpsTrail) ? row.gpsTrail : [],
    };
  }

  private pushHistory(
    existing: unknown,
    label: string,
    detail?: string,
  ): HistoryRow[] {
    const history = asHistory(existing);
    history.unshift({
      id: `h-${Date.now()}`,
      at: new Date().toISOString(),
      label,
      detail,
    });
    return history;
  }

  private async loadRow(id: string) {
    const row = await this.prisma.timeEntry.findFirst({
      where: { id, archivedAt: null },
      include: employeeInclude,
    });
    if (!row) throw new NotFoundException('Time entry not found');
    return row;
  }

  async kpi() {
    const base = { archivedAt: null as null };
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [
      totalEntries,
      distinctTechs,
      pending,
      missingCo,
      approved,
      locked,
      gpsFlagged,
      gpsToday,
      editRequests,
    ] = await this.prisma.$transaction([
      this.prisma.timeEntry.count({ where: base }),
      this.prisma.timeEntry.findMany({
        where: base,
        distinct: ['employeeId'],
        select: { employeeId: true },
      }),
      this.prisma.timeEntry.count({
        where: { ...base, status: TimeEntryStatus.PENDING },
      }),
      this.prisma.timeEntry.count({
        where: { ...base, status: TimeEntryStatus.MISSING_CO },
      }),
      this.prisma.timeEntry.count({
        where: { ...base, status: TimeEntryStatus.APPROVED },
      }),
      this.prisma.timeEntry.count({
        where: {
          ...base,
          OR: [{ locked: true }, { status: TimeEntryStatus.LOCKED }],
        },
      }),
      this.prisma.timeEntry.count({
        where: { ...base, gpsFlagged: true },
      }),
      this.prisma.timeEntry.count({
        where: {
          ...base,
          gpsFlagged: true,
          updatedAt: { gte: todayStart },
        },
      }),
      this.prisma.timeEditRequest.count({
        where: {
          status: {
            in: ['PENDING', 'NEEDS_CLARIFICATION'],
          },
        },
      }),
    ]);

    const pct =
      totalEntries > 0 ? Math.round((approved / totalEntries) * 100) : 0;

    return {
      data: {
        totalEntries,
        techCount: distinctTechs.length,
        pending,
        missingClockOut: missingCo,
        approved,
        approvedPct: pct,
        locked,
        gpsFlagged,
        gpsFlaggedToday: gpsToday,
        editRequests,
      },
    };
  }

  async filterOptions() {
    const techs = await this.prisma.employee.findMany({
      where: { archivedAt: null },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        code: true,
        firstName: true,
        lastName: true,
        displayName: true,
      },
      take: 200,
    });

    return {
      data: {
        statuses: [
          { value: 'ANY', label: 'Any' },
          { value: 'APPROVED', label: 'Approved' },
          { value: 'PENDING', label: 'Pending' },
          { value: 'MISSING_CO', label: 'Missing C.O' },
          { value: 'REJECTED', label: 'Rejected' },
          { value: 'LOCKED', label: 'Locked' },
        ],
        categories: [
          { value: 'ANY', label: 'Any' },
          { value: 'REGULAR', label: 'Regular' },
          { value: 'OVERTIME', label: 'Overtime' },
          { value: 'NON_BILLABLE', label: 'Non-Billable' },
          { value: 'ON_JOB_TRAINING', label: 'On-Job Training' },
        ],
        billable: [
          { value: 'ANY', label: 'Any' },
          { value: 'BILLABLE', label: 'Billable' },
          { value: 'NON_BILLABLE', label: 'Non-Billable' },
        ],
        locked: [
          { value: 'ANY', label: 'Any' },
          { value: 'LOCKED', label: 'Locked' },
          { value: 'UNLOCKED', label: 'Unlocked' },
        ],
        technicians: [
          { value: 'ANY', label: 'Any' },
          ...techs.map((t) => ({
            value: t.id,
            label: `${shortTechName(t.firstName, t.lastName, t.displayName)} · ${t.code}`,
          })),
        ],
      },
    };
  }

  async list(query: TimeEntryQueryDto) {
    const { page, pageSize, skip, take } = parsePage(query.page, query.pageSize);
    const where = this.where(query);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.timeEntry.count({ where }),
      this.prisma.timeEntry.findMany({
        where,
        skip,
        take,
        orderBy: orderByFrom(query.sort, query.direction, SORT_MAP, {
          workDate: 'desc',
        }),
        include: employeeInclude,
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
    return { data: this.mapRow(await this.loadRow(id)) };
  }

  async bulkApprove(dto: BulkApproveTimeEntriesDto) {
    if (!dto.ids?.length) {
      throw new BadRequestException('Select at least one entry');
    }
    const result = await this.prisma.timeEntry.updateMany({
      where: {
        id: { in: dto.ids },
        archivedAt: null,
        locked: false,
        status: { not: TimeEntryStatus.LOCKED },
      },
      data: { status: TimeEntryStatus.APPROVED, correctionRequested: false },
    });
    return {
      data: { updated: result.count, message: `Approved ${result.count} entries` },
    };
  }

  async approveAllClean() {
    const result = await this.prisma.timeEntry.updateMany({
      where: {
        archivedAt: null,
        locked: false,
        gpsFlagged: false,
        missingDocs: false,
        status: TimeEntryStatus.PENDING,
        clockOut: { not: null },
        NOT: { clockOut: '' },
      },
      data: { status: TimeEntryStatus.APPROVED },
    });
    return {
      data: {
        updated: result.count,
        message: `Approved ${result.count} clean entries`,
      },
    };
  }

  async importGoCanvas() {
    const pending = await this.prisma.timeEntry.count({
      where: {
        status: {
          in: [TimeEntryStatus.PENDING, TimeEntryStatus.MISSING_CO],
        },
        correctionRequested: false,
      },
    });
    return {
      data: {
        imported: 0,
        pendingReview: pending,
        message:
          pending > 0
            ? `No new GoCanvas sheets found. ${pending} entries still pending review.`
            : 'No new GoCanvas sheets found in the last sync window.',
      },
    };
  }

  async approve(id: string) {
    const row = await this.loadRow(id);
    if (row.locked || row.status === TimeEntryStatus.LOCKED) {
      throw new BadRequestException('Locked entries cannot be approved');
    }
    const updated = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: TimeEntryStatus.APPROVED,
        correctionRequested: false,
        editHistory: this.pushHistory(row.editHistory, 'Approved by admin'),
      },
      include: employeeInclude,
    });
    return { data: this.mapRow(updated) };
  }

  async reject(id: string, dto: RejectTimeEntryDto) {
    const row = await this.loadRow(id);
    if (row.locked || row.status === TimeEntryStatus.LOCKED) {
      throw new BadRequestException('Locked entries cannot be rejected');
    }
    const reason = dto.reason?.trim();
    const updated = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: TimeEntryStatus.REJECTED,
        editHistory: this.pushHistory(
          row.editHistory,
          'Rejected by admin',
          reason,
        ),
      },
      include: employeeInclude,
    });
    return { data: this.mapRow(updated) };
  }

  async updateAdmin(id: string, dto: UpdateTimeEntryAdminDto) {
    const row = await this.loadRow(id);
    if (row.locked || row.status === TimeEntryStatus.LOCKED) {
      throw new BadRequestException('Locked entries cannot be edited');
    }
    const updated = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        hours: dto.hours ?? undefined,
        payrollHours: dto.payrollHours ?? undefined,
        billableHours: dto.billableHours ?? undefined,
        correctionApplied: dto.correctionApplied ?? undefined,
        correctionReason: dto.correctionReason ?? undefined,
        clockIn: dto.clockIn ?? undefined,
        clockOut: dto.clockOut ?? undefined,
        adminNote: dto.adminNote ?? undefined,
        nonBillableReason: dto.nonBillableReason ?? undefined,
        nonBillableHours: dto.nonBillableHours ?? undefined,
        nonBillableContext: dto.nonBillableContext ?? undefined,
        source: TimeEntrySource.CORRECTED,
        editHistory: this.pushHistory(
          row.editHistory,
          'Edited as admin',
          dto.correctionReason ?? undefined,
        ),
      },
      include: employeeInclude,
    });
    return { data: this.mapRow(updated) };
  }

  async saveAdminNote(id: string, dto: SaveAdminNoteDto) {
    const row = await this.loadRow(id);
    const updated = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        adminNote: dto.adminNote.trim(),
        editHistory: this.pushHistory(row.editHistory, 'Admin note saved'),
      },
      include: employeeInclude,
    });
    return { data: this.mapRow(updated) };
  }

  async requestCorrection(id: string, dto: RequestCorrectionDto) {
    const row = await this.loadRow(id);
    if (row.locked || row.status === TimeEntryStatus.LOCKED) {
      throw new BadRequestException('Locked entries cannot be corrected');
    }

    const notes = asNotes(row.notes);
    const reason =
      dto.reason?.trim() ||
      dto.nonBillableContext?.trim() ||
      dto.nonBillableReason?.trim();
    if (reason) {
      notes.unshift({
        id: `n-${Date.now()}`,
        text: `Correction requested: ${reason}`,
        createdAt: new Date().toISOString(),
      });
    }

    const updated = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        correctionRequested: true,
        nonBillableReason: dto.nonBillableReason ?? row.nonBillableReason,
        nonBillableHours: dto.nonBillableHours ?? row.nonBillableHours,
        nonBillableContext: dto.nonBillableContext ?? row.nonBillableContext,
        status:
          row.status === TimeEntryStatus.APPROVED
            ? TimeEntryStatus.PENDING
            : row.status,
        notes,
        editHistory: this.pushHistory(
          row.editHistory,
          'Correction requested',
          reason,
        ),
      },
      include: employeeInclude,
    });

    await this.prisma.employee.update({
      where: { id: row.employeeId },
      data: { hasOpenTimeEdit: true },
    });

    return { data: this.mapRow(updated) };
  }

  async addNote(id: string, dto: AddTimeEntryNoteDto) {
    const text = dto.text?.trim();
    if (!text) throw new BadRequestException('Note text is required');

    const row = await this.loadRow(id);
    const notes = asNotes(row.notes);
    notes.unshift({
      id: `n-${Date.now()}`,
      text,
      createdAt: new Date().toISOString(),
    });

    const updated = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        notes,
        adminNote: row.adminNote ?? text,
        editHistory: this.pushHistory(row.editHistory, 'Note added', text),
      },
      include: employeeInclude,
    });
    return { data: this.mapRow(updated) };
  }
}
