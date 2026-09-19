import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PayCycleStatus,
  Prisma,
  TimeEntryCategory,
  TimeEntryStatus,
  TimeEditRequestStatus,
  TimeOffStatus,
  TimeOffType,
} from '@prisma/client';
import { parsePage, paginate } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { PayrollReviewQueryDto } from './dto/payroll-review.dto';

function dec(n: Prisma.Decimal | number | null | undefined, fallback = 0) {
  if (n == null) return fallback;
  return Number(n);
}

function money(n: number) {
  return Math.round(n * 100) / 100;
}

function hoursLabel(n: number) {
  return `${n.toFixed(1)}H`;
}

function moneyLabel(n: number) {
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shortName(first: string, last: string, display?: string | null) {
  if (display?.trim()) {
    const parts = display.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}. ${parts.slice(1).join(' ')}`.toUpperCase();
    }
    return display.trim().toUpperCase();
  }
  const f = first.trim();
  const l = last.trim();
  if (!f) return l.toUpperCase();
  return `${f[0]}. ${l}`.toUpperCase();
}

type ExceptionTone = 'warn' | 'danger' | 'info';

type ExceptionKind =
  | 'clock-out'
  | 'edit'
  | 'gps'
  | 'docs'
  | 'form'
  | 'locked';

type ExceptionChip = {
  id: string;
  label: string;
  tone: ExceptionTone;
  kind: ExceptionKind;
  targetId?: string;
  href?: string;
};

type PayrollStatus = 'READY' | 'REVIEW' | 'BLOCK';

type PayrollRow = {
  id: string;
  employeeId: string;
  name: string;
  code: string;
  rtHours: number;
  otHours: number;
  holidayHours: number;
  sickHours: number;
  vacationHours: number;
  totalHours: number;
  gross: number;
  payRate: number;
  exceptions: ExceptionChip[];
  status: PayrollStatus;
  missingDocs: number;
  adpEmployeeId?: string | null;
  reviewerName?: string;
};

@Injectable()
export class PayrollReviewService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveCycle(cycleId?: string) {
    if (cycleId) {
      const row = await this.prisma.payCycle.findUnique({
        where: { id: cycleId },
      });
      if (!row) throw new NotFoundException('Pay cycle not found');
      return row;
    }

    const open = await this.prisma.payCycle.findFirst({
      where: { status: PayCycleStatus.OPEN, closedAt: null },
      orderBy: { startDate: 'desc' },
    });
    if (open) return open;

    const latest = await this.prisma.payCycle.findFirst({
      orderBy: { startDate: 'desc' },
    });
    if (!latest) throw new NotFoundException('No pay cycles configured');
    return latest;
  }

  private async buildRows(cycle: {
    id: string;
    startDate: Date;
    endDate: Date;
  }): Promise<PayrollRow[]> {
    const settings = await this.prisma.payCycleSettings.findUnique({
      where: { id: 'default' },
    });
    const otMultiplier = dec(settings?.otMultiplier, 1.5);

    const [employees, entries, timeOff, editRequests] = await Promise.all([
      this.prisma.employee.findMany({
        where: { archivedAt: null },
        select: {
          id: true,
          code: true,
          firstName: true,
          lastName: true,
          displayName: true,
          payRate: true,
          status: true,
          adpEmployeeId: true,
          supervisor: {
            select: {
              firstName: true,
              lastName: true,
              displayName: true,
            },
          },
        },
      }),
      this.prisma.timeEntry.findMany({
        where: {
          archivedAt: null,
          workDate: { gte: cycle.startDate, lte: cycle.endDate },
          status: {
            in: [
              TimeEntryStatus.APPROVED,
              TimeEntryStatus.PENDING,
              TimeEntryStatus.MISSING_CO,
              TimeEntryStatus.LOCKED,
            ],
          },
        },
        select: {
          id: true,
          employeeId: true,
          hours: true,
          payrollHours: true,
          billableHours: true,
          billable: true,
          category: true,
          status: true,
          locked: true,
          gpsFlagged: true,
          missingDocs: true,
          docsRequired: true,
          docsSubmitted: true,
          payrollBlockCount: true,
        },
      }),
      this.prisma.timeOffRequest.findMany({
        where: {
          status: TimeOffStatus.APPROVED,
          OR: [
            {
              startDate: { lte: cycle.endDate },
              endDate: { gte: cycle.startDate },
            },
          ],
        },
        select: {
          employeeId: true,
          type: true,
          hoursRequested: true,
          startDate: true,
          endDate: true,
        },
      }),
      this.prisma.timeEditRequest.findMany({
        where: {
          workDate: { gte: cycle.startDate, lte: cycle.endDate },
          status: {
            in: [
              TimeEditRequestStatus.PENDING,
              TimeEditRequestStatus.NEEDS_CLARIFICATION,
            ],
          },
        },
        select: { employeeId: true, id: true },
      }),
    ]);

    const byEmp = new Map<string, PayrollRow>();

    for (const emp of employees) {
      const reviewer = emp.supervisor
        ? shortName(
            emp.supervisor.firstName,
            emp.supervisor.lastName,
            emp.supervisor.displayName,
          )
        : '';
      byEmp.set(emp.id, {
        id: emp.id,
        employeeId: emp.id,
        name: shortName(emp.firstName, emp.lastName, emp.displayName),
        code: emp.code,
        rtHours: 0,
        otHours: 0,
        holidayHours: 0,
        sickHours: 0,
        vacationHours: 0,
        totalHours: 0,
        gross: 0,
        payRate: dec(emp.payRate, 35),
        exceptions: [],
        status: 'READY',
        missingDocs: 0,
        adpEmployeeId: emp.adpEmployeeId,
        reviewerName: reviewer,
      });
    }

    const editCount = new Map<string, number>();
    const editFirstId = new Map<string, string>();
    for (const er of editRequests) {
      editCount.set(er.employeeId, (editCount.get(er.employeeId) ?? 0) + 1);
      if (!editFirstId.has(er.employeeId)) {
        editFirstId.set(er.employeeId, er.id);
      }
    }

    const missingCo = new Map<string, string>();
    const gpsFirst = new Map<string, string>();
    const gpsCount = new Map<string, number>();
    const docsMissing = new Map<string, number>();
    const formFirst = new Map<
      string,
      { entryId: string; formName: string }
    >();
    const lockedFirst = new Map<string, string>();

    for (const e of entries) {
      const row = byEmp.get(e.employeeId);
      if (!row) continue;

      const hrs = dec(
        e.payrollHours ?? e.billableHours ?? e.hours,
        dec(e.hours),
      );

      if (
        e.billable &&
        (e.status === TimeEntryStatus.APPROVED ||
          e.status === TimeEntryStatus.LOCKED)
      ) {
        if (e.category === TimeEntryCategory.OVERTIME) {
          row.otHours += hrs;
        } else if (
          e.category === TimeEntryCategory.REGULAR ||
          e.category === TimeEntryCategory.ON_JOB_TRAINING
        ) {
          row.rtHours += hrs;
        }
      }

      if (e.status === TimeEntryStatus.MISSING_CO) {
        if (!missingCo.has(e.employeeId)) missingCo.set(e.employeeId, e.id);
      }
      if (e.status === TimeEntryStatus.LOCKED || e.locked) {
        if (!lockedFirst.has(e.employeeId)) {
          lockedFirst.set(e.employeeId, e.id);
        }
      }
      if (e.gpsFlagged) {
        gpsCount.set(
          e.employeeId,
          (gpsCount.get(e.employeeId) ?? 0) + 1,
        );
        if (!gpsFirst.has(e.employeeId)) gpsFirst.set(e.employeeId, e.id);
      }
      if (e.missingDocs || (e.docsRequired ?? 0) > (e.docsSubmitted ?? 0)) {
        const gap = Math.max(
          0,
          (e.docsRequired ?? 0) - (e.docsSubmitted ?? 0),
        );
        const add = gap > 0 ? gap : e.missingDocs ? 1 : 0;
        if (add > 0) {
          docsMissing.set(
            e.employeeId,
            (docsMissing.get(e.employeeId) ?? 0) + add,
          );
        }
      }
      if ((e.payrollBlockCount ?? 0) > 0) {
        docsMissing.set(
          e.employeeId,
          (docsMissing.get(e.employeeId) ?? 0) + e.payrollBlockCount,
        );
        if (!formFirst.has(e.employeeId)) {
          formFirst.set(e.employeeId, {
            entryId: e.id,
            formName: 'JSA — JOB SAFETY ANALYSIS',
          });
        }
      }
    }

    for (const to of timeOff) {
      const row = byEmp.get(to.employeeId);
      if (!row) continue;
      const hrs = dec(to.hoursRequested, 8);
      if (to.type === TimeOffType.HOLIDAY) row.holidayHours += hrs;
      else if (to.type === TimeOffType.SICK) row.sickHours += hrs;
      else if (
        to.type === TimeOffType.PTO ||
        to.type === TimeOffType.BEREAVEMENT
      ) {
        row.vacationHours += hrs;
      }
    }

    const rows: PayrollRow[] = [];
    for (const row of byEmp.values()) {
      row.rtHours = Math.round(row.rtHours * 10) / 10;
      row.otHours = Math.round(row.otHours * 10) / 10;
      row.holidayHours = Math.round(row.holidayHours * 10) / 10;
      row.sickHours = Math.round(row.sickHours * 10) / 10;
      row.vacationHours = Math.round(row.vacationHours * 10) / 10;
      row.totalHours =
        Math.round(
          (row.rtHours +
            row.otHours +
            row.holidayHours +
            row.sickHours +
            row.vacationHours) *
            10,
        ) / 10;

      const leave =
        row.holidayHours + row.sickHours + row.vacationHours;
      row.gross = money(
        row.rtHours * row.payRate +
          row.otHours * row.payRate * otMultiplier +
          leave * row.payRate,
      );

      const exceptions: ExceptionChip[] = [];
      const edits = editCount.get(row.employeeId) ?? 0;
      if (edits > 0) {
        exceptions.push({
          id: 'edit',
          label: `${edits} EDIT →`,
          tone: 'warn',
          kind: 'edit',
          targetId: editFirstId.get(row.employeeId),
        });
      }
      if (missingCo.has(row.employeeId)) {
        exceptions.push({
          id: 'clock-out',
          label: 'CLOCK-OUT →',
          tone: 'danger',
          kind: 'clock-out',
          targetId: missingCo.get(row.employeeId),
        });
      }
      const gps = gpsCount.get(row.employeeId) ?? 0;
      if (gps > 0) {
        exceptions.push({
          id: 'gps',
          label: `GPS ${gps} →`,
          tone: 'warn',
          kind: 'gps',
          targetId: gpsFirst.get(row.employeeId),
        });
      }
      const docs = docsMissing.get(row.employeeId) ?? 0;
      if (docs > 0) {
        row.missingDocs = docs;
        exceptions.push({
          id: 'docs',
          label: `${docs} DOCS →`,
          tone: 'danger',
          kind: 'docs',
          targetId: row.employeeId,
        });
      }
      const form = formFirst.get(row.employeeId);
      if (form) {
        exceptions.push({
          id: 'form',
          label: 'FORM →',
          tone: 'danger',
          kind: 'form',
          targetId: form.entryId,
        });
      }
      if (lockedFirst.has(row.employeeId)) {
        exceptions.push({
          id: 'locked',
          label: 'LOCKED →',
          tone: 'warn',
          kind: 'locked',
          targetId: lockedFirst.get(row.employeeId),
        });
      }
      row.exceptions = exceptions;

      if (missingCo.has(row.employeeId) || docs > 0 || form) {
        row.status = 'BLOCK';
      } else if (edits > 0 || gps > 0) {
        row.status = 'REVIEW';
      } else {
        row.status = 'READY';
      }

      if (row.totalHours > 0 || exceptions.length > 0) {
        rows.push(row);
      }
    }

    return rows;
  }

  private mapRow(row: PayrollRow) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      name: row.name,
      code: row.code,
      rtHours: row.rtHours,
      otHours: row.otHours,
      holidayHours: row.holidayHours,
      sickHours: row.sickHours,
      vacationHours: row.vacationHours,
      totalHours: row.totalHours,
      gross: row.gross,
      exceptions: row.exceptions,
      status: row.status,
    };
  }

  async kpi(cycleId?: string) {
    const cycle = await this.resolveCycle(cycleId);
    const rows = await this.buildRows(cycle);

    let rt = 0;
    let ot = 0;
    let leave = 0;
    let rtPay = 0;
    let otPay = 0;
    let leavePay = 0;
    let exceptions = 0;
    let missingDocs = 0;

    const settings = await this.prisma.payCycleSettings.findUnique({
      where: { id: 'default' },
    });
    const otMultiplier = dec(settings?.otMultiplier, 1.5);

    for (const r of rows) {
      rt += r.rtHours;
      ot += r.otHours;
      const leaveHrs = r.holidayHours + r.sickHours + r.vacationHours;
      leave += leaveHrs;
      rtPay += r.rtHours * r.payRate;
      otPay += r.otHours * r.payRate * otMultiplier;
      leavePay += leaveHrs * r.payRate;
      if (r.exceptions.length > 0) exceptions += 1;
      missingDocs += r.missingDocs;
    }

    const gross = money(rtPay + otPay + leavePay);
    const totalHours = Math.round((rt + ot + leave) * 10) / 10;

    return {
      data: {
        cycleId: cycle.id,
        cycleCode: cycle.code,
        cycleLabel: cycle.label,
        dateRange: `${cycle.startDate.toISOString().slice(0, 10)} – ${cycle.endDate.toISOString().slice(0, 10)}`,
        payrollApprovedAt: cycle.payrollApprovedAt?.toISOString() ?? null,
        banner:
          'Payroll totals come from approved billable time entries. Non-billable time (breaks, travel, standby) is excluded from RT / OT.',
        regularTimeTotal: hoursLabel(Math.round(rt * 10) / 10),
        regularTimeMeta: moneyLabel(money(rtPay)),
        overTimeTotal: hoursLabel(Math.round(ot * 10) / 10),
        overTimeMeta: moneyLabel(money(otPay)),
        leaveTotal: hoursLabel(Math.round(leave * 10) / 10),
        leaveMeta: moneyLabel(money(leavePay)),
        totalGross: moneyLabel(gross),
        totalGrossMeta: hoursLabel(totalHours),
        exceptions,
        exceptionsMeta: `${missingDocs} Missing Docs`,
      },
    };
  }

  async list(query: PayrollReviewQueryDto) {
    const cycle = await this.resolveCycle(query.cycleId);
    let rows = await this.buildRows(cycle);

    const q = query.q?.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q),
      );
    }

    if (query.status && query.status !== 'ANY') {
      rows = rows.filter((r) => r.status === query.status);
    }

    if (query.hasExceptions === 'YES') {
      rows = rows.filter((r) => r.exceptions.length > 0);
    } else if (query.hasExceptions === 'NO') {
      rows = rows.filter((r) => r.exceptions.length === 0);
    }

    const sort = query.sort ?? 'name';
    const dir = query.direction === 'desc' ? -1 : 1;
    rows.sort((a, b) => {
      const av =
        sort === 'gross'
          ? a.gross
          : sort === 'total'
            ? a.totalHours
            : sort === 'status'
              ? a.status
              : sort === 'rt'
                ? a.rtHours
                : a.name;
      const bv =
        sort === 'gross'
          ? b.gross
          : sort === 'total'
            ? b.totalHours
            : sort === 'status'
              ? b.status
              : sort === 'rt'
                ? b.rtHours
                : b.name;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    const { page, pageSize, skip, take } = parsePage(
      query.page,
      query.pageSize,
    );
    const total = rows.length;
    const slice = rows.slice(skip, skip + take);

    return {
      data: paginate(
        slice.map((r) => this.mapRow(r)),
        total,
        page,
        pageSize,
      ),
      meta: {
        cycleId: cycle.id,
        cycleCode: cycle.code,
      },
    };
  }

  async approve(cycleId?: string) {
    const cycle = await this.resolveCycle(cycleId);
    const rows = await this.buildRows(cycle);
    const blocked = rows.filter((r) => r.status === 'BLOCK');
    if (blocked.length > 0) {
      throw new BadRequestException(
        `Cannot approve payroll: ${blocked.length} employee(s) are blocked`,
      );
    }

    const updated = await this.prisma.payCycle.update({
      where: { id: cycle.id },
      data: { payrollApprovedAt: new Date() },
    });

    return {
      data: {
        id: updated.id,
        payrollApprovedAt: updated.payrollApprovedAt?.toISOString() ?? null,
        message: `Payroll total approved for ${cycle.code}`,
      },
    };
  }

  async generateReport(cycleId?: string) {
    const cycle = await this.resolveCycle(cycleId);
    const rows = await this.buildRows(cycle);
    await this.prisma.payCycle.update({
      where: { id: cycle.id },
      data: { payrollReportAt: new Date() },
    });

    const header = [
      'Employee',
      'Code',
      'RT',
      'OT',
      'Holiday',
      'Sick',
      'Vacation',
      'Total',
      'Gross',
      'Status',
      'Exceptions',
    ];
    const lines = [
      header.join(','),
      ...rows.map((r) =>
        [
          `"${r.name}"`,
          r.code,
          r.rtHours.toFixed(1),
          r.otHours.toFixed(1),
          r.holidayHours.toFixed(1),
          r.sickHours.toFixed(1),
          r.vacationHours.toFixed(1),
          r.totalHours.toFixed(1),
          r.gross.toFixed(2),
          r.status,
          `"${r.exceptions.map((e) => e.label).join('; ')}"`,
        ].join(','),
      ),
    ];

    return {
      data: {
        csv: lines.join('\n'),
        filename: `payroll-review-${cycle.code}.csv`,
        cycleId: cycle.id,
        cycleCode: cycle.code,
      },
    };
  }

  async exportCsv(query: PayrollReviewQueryDto) {
    const res = await this.list({ ...query, page: 1, pageSize: 200 });
    const cycleCode =
      (res.meta?.cycleCode as string | undefined) ?? 'cycle';
    const header = [
      'Employee',
      'Code',
      'RT',
      'OT',
      'Holiday',
      'Sick',
      'Vacation',
      'Total',
      'Gross',
      'Status',
      'Exceptions',
    ];
    const lines = [
      header.join(','),
      ...res.data.items.map((r) =>
        [
          `"${r.name}"`,
          r.code,
          r.rtHours.toFixed(1),
          r.otHours.toFixed(1),
          r.holidayHours.toFixed(1),
          r.sickHours.toFixed(1),
          r.vacationHours.toFixed(1),
          r.totalHours.toFixed(1),
          r.gross.toFixed(2),
          r.status,
          `"${r.exceptions.map((e) => e.label).join('; ')}"`,
        ].join(','),
      ),
    ];
    return {
      data: {
        csv: lines.join('\n'),
        filename: `payroll-export-${cycleCode}.csv`,
      },
    };
  }

  async resolveContext(kind: string, targetId: string) {
    if (!targetId) throw new BadRequestException('targetId is required');

    if (kind === 'clock-out' || kind === 'gps' || kind === 'form' || kind === 'locked') {
      const entry = await this.prisma.timeEntry.findUnique({
        where: { id: targetId },
        include: {
          employee: {
            select: {
              id: true,
              code: true,
              firstName: true,
              lastName: true,
              displayName: true,
            },
          },
        },
      });
      if (!entry) throw new NotFoundException('Time entry not found');
      const name = shortName(
        entry.employee.firstName,
        entry.employee.lastName,
        entry.employee.displayName,
      );
      const dateLabel = entry.workDate
        .toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        })
        .toUpperCase();
      const wo =
        entry.workOrderCode || entry.workOrderShort || entry.customerName || '';

      if (kind === 'clock-out') {
        return {
          data: {
            kind,
            targetId,
            metaLine: [name, dateLabel, wo].filter(Boolean).join(' · '),
            issue: '',
            clockIn: '',
            clockOut: '',
            entry: {
              issue: 'MISSING CLOCK-OUT',
              clockIn: entry.clockIn || '',
              clockOut: entry.clockOut || '',
            },
          },
        };
      }

      if (kind === 'gps') {
        return {
          data: {
            kind,
            targetId,
            metaLine: [
              name,
              'CLOCK-IN',
              dateLabel,
              entry.clockIn || '',
            ]
              .filter(Boolean)
              .join(' · '),
            location: '',
            jobSite: '',
            flagReason: '',
            entry: {
              location:
                entry.clockInDistanceMi != null
                  ? `${entry.clockInDistanceMi.toFixed(1)} MI FROM JOB SITE`
                  : entry.gpsLabel || '',
              jobSite: [wo, entry.customerName].filter(Boolean).join(' · '),
              flagReason:
                entry.gpsStatusLabel ||
                entry.gpsLabel ||
                'OUTSIDE GEOFENCE AT CLOCK-IN',
            },
          },
        };
      }

      if (kind === 'form') {
        return {
          data: {
            kind,
            targetId,
            metaLine: [name, entry.jobType || '', dateLabel]
              .filter(Boolean)
              .join(' · '),
            form: '',
            status: '',
            impact: '',
            entry: {
              form: 'JSA — JOB SAFETY ANALYSIS',
              status: 'INCOMPLETE',
              impact: 'BLOCKS PAYROLL APPROVAL',
            },
          },
        };
      }

      // locked
      return {
        data: {
          kind,
          targetId,
          metaLine: [name, wo, `CYCLE ${entry.cycleLabel}`]
            .filter(Boolean)
            .join(' · '),
          lockedOn: '',
          payrollExported: '',
          impact: '',
          entry: {
            lockedOn: entry.updatedAt
              .toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC',
              })
              .toUpperCase(),
            payrollExported: 'YES',
            impact: 'CANNOT EDIT WITHOUT UNLOCK APPROVAL',
          },
        },
      };
    }

    if (kind === 'edit') {
      const req = await this.prisma.timeEditRequest.findUnique({
        where: { id: targetId },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              displayName: true,
            },
          },
        },
      });
      if (!req) throw new NotFoundException('Time edit request not found');
      const name = shortName(
        req.employee.firstName,
        req.employee.lastName,
        req.employee.displayName,
      );
      return {
        data: {
          kind,
          targetId,
          metaLine: [
            name,
            req.differenceKind,
            req.dateLabel,
            `REQUESTED ${req.relativeTime || ''}`.trim(),
          ]
            .filter(Boolean)
            .join(' · '),
          original: '',
          requested: '',
          difference: '',
          entry: {
            original: `${req.originalClockIn ?? '—'} → ${req.originalClockOut ?? '—'}`,
            requested: `${req.requestedClockIn ?? '—'} → ${req.requestedClockOut ?? '—'}`,
            difference: req.deltaLabel || `${dec(req.deltaHours)}H`,
            deltaLabel: req.deltaLabel || `${dec(req.deltaHours).toFixed(2)}H`,
          },
        },
      };
    }

    if (kind === 'docs') {
      const emp = await this.prisma.employee.findUnique({
        where: { id: targetId },
      });
      if (!emp) throw new NotFoundException('Employee not found');
      const entries = await this.prisma.timeEntry.findMany({
        where: {
          employeeId: targetId,
          OR: [
            { missingDocs: true },
            { payrollBlockCount: { gt: 0 } },
          ],
        },
        take: 5,
        orderBy: { workDate: 'desc' },
      });
      const required = entries.reduce((s, e) => s + (e.docsRequired || 0), 0);
      const submitted = entries.reduce(
        (s, e) => s + (e.docsSubmitted || 0),
        0,
      );
      const missing = Math.max(0, required - submitted) || entries.length;
      const name = shortName(emp.firstName, emp.lastName, emp.displayName);
      const wo = entries[0]?.workOrderCode || '';
      return {
        data: {
          kind,
          targetId,
          metaLine: [name, wo, `PAYROLL CYCLE ${entries[0]?.cycleLabel || ''}`]
            .filter(Boolean)
            .join(' · '),
          missingDocuments: '',
          outstanding: '',
          impact: '',
          entry: {
            missingDocuments: `${missing} OF ${required || missing} REQUIRED`,
            outstanding: 'PERMIT TO WORK, AQR',
            impact: 'BLOCKS PAYROLL APPROVAL',
          },
        },
      };
    }

    throw new BadRequestException(`Unknown resolve kind: ${kind}`);
  }

  async resolveClockOut(entryId: string, clockOut?: string) {
    const entry = await this.prisma.timeEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) throw new NotFoundException('Time entry not found');
    const value = clockOut?.trim();
    if (!value) {
      throw new BadRequestException('Clock-out time is required');
    }
    const updated = await this.prisma.timeEntry.update({
      where: { id: entryId },
      data: {
        clockOut: value.toUpperCase(),
        status: TimeEntryStatus.PENDING,
      },
    });
    return {
      data: { id: updated.id, clockOut: updated.clockOut, message: 'Clock-out saved' },
    };
  }

  async askEmployee(targetId: string, message?: string) {
    const note =
      message?.trim() ||
      'Please complete your missing clock-out for payroll review.';
    const entry = await this.prisma.timeEntry.findUnique({
      where: { id: targetId },
    });
    if (entry) {
      await this.prisma.timeEntry.update({
        where: { id: targetId },
        data: {
          adminNote: note,
          correctionRequested: true,
        },
      });
      return { data: { message: 'Employee notified via time-entry note' } };
    }
    const emp = await this.prisma.employee.findUnique({
      where: { id: targetId },
    });
    if (!emp) throw new NotFoundException('Target not found');
    const notes = Array.isArray(emp.notes)
      ? ([...(emp.notes as object[])] as Record<string, unknown>[])
      : [];
    notes.unshift({
      id: `note-${Date.now()}`,
      text: note,
      createdAt: new Date().toISOString(),
      source: 'payroll-ask',
    });
    await this.prisma.employee.update({
      where: { id: targetId },
      data: { notes: notes as Prisma.InputJsonValue },
    });
    return { data: { message: 'Note added to employee record' } };
  }

  async resolveDocs(employeeId: string) {
    await this.prisma.timeEntry.updateMany({
      where: { employeeId, missingDocs: true },
      data: { missingDocs: false, payrollBlockCount: 0 },
    });
    return { data: { message: 'Documents marked resolved' } };
  }

  async resolveForm(entryId: string) {
    const entry = await this.prisma.timeEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) throw new NotFoundException('Time entry not found');
    await this.prisma.timeEntry.update({
      where: { id: entryId },
      data: {
        payrollBlockCount: 0,
        missingDocs: false,
        docsSubmitted: Math.max(entry.docsSubmitted, entry.docsRequired || 1),
      },
    });
    return { data: { message: 'Form marked complete' } };
  }

  async resolveGps(entryId: string, action: 'confirm' | 'error') {
    const entry = await this.prisma.timeEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) throw new NotFoundException('Time entry not found');
    if (action === 'error') {
      await this.prisma.timeEntry.update({
        where: { id: entryId },
        data: {
          gpsFlagged: false,
          gpsLabel: 'CLEAR',
          gpsStatusLabel: 'GPS ERROR — CLEARED',
        },
      });
      return { data: { message: 'Marked as GPS error (cleared)' } };
    }
    await this.prisma.timeEntry.update({
      where: { id: entryId },
      data: {
        gpsStatusLabel: 'FLAG CONFIRMED',
        adminNote: [entry.adminNote, 'GPS flag confirmed in payroll review']
          .filter(Boolean)
          .join(' · '),
      },
    });
    return { data: { message: 'GPS flag confirmed' } };
  }

  async lockPreview(cycleId?: string) {
    const cycle = await this.resolveCycle(cycleId);
    const rows = await this.buildRows(cycle);
    const missingCo = rows.filter((r) =>
      r.exceptions.some((e) => e.kind === 'clock-out'),
    ).length;
    const gps = rows.filter((r) =>
      r.exceptions.some((e) => e.kind === 'gps'),
    ).length;
    const pendingTo = await this.prisma.timeOffRequest.count({
      where: {
        status: TimeOffStatus.PENDING,
        startDate: { lte: cycle.endDate },
        endDate: { gte: cycle.startDate },
      },
    });
    const active = rows.length;
    const totalHours = rows.reduce((s, r) => s + r.totalHours, 0);
    const gross = rows.reduce((s, r) => s + r.gross, 0);
    return {
      data: {
        cycleId: cycle.id,
        cycle: cycle.code,
        dateRange: `${cycle.startDate
          .toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          })
          .toUpperCase()} – ${cycle.endDate
          .toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          })
          .toUpperCase()}`,
        employees: `${active} ACTIVE`,
        totalHours: hoursLabel(Math.round(totalHours * 10) / 10),
        grossTotal: moneyLabel(money(gross)),
        unresolved: [
          {
            id: 'clock-out',
            label: `${missingCo} MISSING CLOCK-OUTS`,
            count: missingCo,
            tone: 'danger' as const,
          },
          {
            id: 'gps',
            label: `${gps} GPS-FLAGGED ENTR${gps === 1 ? 'Y' : 'IES'}`,
            count: gps,
            tone: 'warn' as const,
          },
          {
            id: 'time-off',
            label: `${pendingTo} PENDING TIME-OFF REQUESTS`,
            count: pendingTo,
            tone: 'warn' as const,
          },
        ],
        warning:
          'Locking this cycle finalizes hours for payroll export. Once locked, entries can only be changed through an approved unlock request, which is permanently logged to the audit trail.',
      },
    };
  }

  async lockCycle(cycleId?: string) {
    const cycle = await this.resolveCycle(cycleId);
    const updated = await this.prisma.payCycle.update({
      where: { id: cycle.id },
      data: {
        status: PayCycleStatus.CLOSED,
        closedAt: new Date(),
        lockAt: new Date(),
      },
    });
    await this.prisma.timeEntry.updateMany({
      where: {
        workDate: { gte: cycle.startDate, lte: cycle.endDate },
        status: {
          in: [TimeEntryStatus.APPROVED, TimeEntryStatus.PENDING],
        },
      },
      data: { locked: true, status: TimeEntryStatus.LOCKED },
    });
    return {
      data: {
        id: updated.id,
        status: updated.status,
        message: `Cycle ${cycle.code} locked`,
      },
    };
  }

  async unlockPreview(cycleId?: string) {
    const cycle = await this.resolveCycle(cycleId);
    const settings = await this.prisma.payCycleSettings.findUnique({
      where: { id: 'default' },
    });
    return {
      data: {
        cycleId: cycle.id,
        metaLine: `CYCLE ${cycle.code} · ${cycle.startDate
          .toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          })
          .toUpperCase()} – ${cycle.endDate
          .toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          })
          .toUpperCase()}`,
        lockedOn: '',
        lockedBy: '',
        payrollExported: '',
        exportedBadge: cycle.payrollApprovedAt ? 'EXPORTED' : 'NOT EXPORTED',
        entry: {
          lockedOn: (cycle.lockAt || cycle.closedAt || cycle.updatedAt)
            .toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'UTC',
            })
            .toUpperCase()
            .replace(',', ' ·'),
          lockedBy: 'SYSTEM',
          payrollExported: cycle.payrollApprovedAt
            ? `YES — EXPORTED ${cycle.payrollApprovedAt
                .toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC',
                })
                .toUpperCase()}`
            : 'NO',
        },
        auditItems: [
          'WHO UNLOCKED AND SUBMITTED THE REQUEST',
          'TIMESTAMP OF THE UNLOCK',
          'ORIGINAL VS. NEW HOURS FOR EVERY CHANGED ENTRY',
          'DOLLAR DELTA PER ENTRY',
          'THE OFF-CYCLE ADJUSTMENT RUN IT LANDS IN',
        ],
        notes: settings?.notes ?? null,
      },
    };
  }

  async requestUnlock(cycleId: string | undefined, reason: string) {
    const text = reason?.trim();
    if (!text) throw new BadRequestException('Reason is required');
    const cycle = await this.resolveCycle(cycleId);
    const settings = await this.ensureSettingsRow();
    const stamp = new Date().toISOString();
    const line = `[UNLOCK REQUEST ${stamp}] ${cycle.code}: ${text}`;
    await this.prisma.payCycleSettings.update({
      where: { id: settings.id },
      data: {
        notes: settings.notes ? `${settings.notes}\n${line}` : line,
      },
    });
    return {
      data: {
        message: 'Unlock request submitted',
        cycleId: cycle.id,
      },
    };
  }

  private async ensureSettingsRow() {
    return this.prisma.payCycleSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
  }

  async offCycleKpi() {
    const rows = await this.prisma.timeEditRequest.findMany({
      where: {
        OR: [{ lockedCycle: true }, { offCycleRunLabel: { not: null } }],
      },
    });
    const pending = rows.filter(
      (r) =>
        r.status === TimeEditRequestStatus.PENDING ||
        r.status === TimeEditRequestStatus.NEEDS_CLARIFICATION,
    );
    const processed = rows.filter(
      (r) => r.status === TimeEditRequestStatus.APPROVED,
    );
    const deltaHours = rows.reduce((s, r) => s + dec(r.deltaHours), 0);
    const deltaDollars = rows.reduce((s, r) => s + dec(r.dollarDelta), 0);
    const approvedBy =
      processed.find((r) => r.overrideByName)?.overrideByName || '—';
    return {
      data: {
        entriesReopened: rows.length,
        totalDeltaHours:
          deltaHours >= 0
            ? `+${deltaHours.toFixed(1)}H`
            : `${deltaHours.toFixed(1)}H`,
        totalDeltaDollars:
          deltaDollars >= 0
            ? `+${moneyLabel(money(deltaDollars))}`
            : `-${moneyLabel(money(Math.abs(deltaDollars)))}`,
        approvedBy: approvedBy === '—' ? '—' : approvedBy.toUpperCase(),
        runStatus: pending.length > 0 ? 'PENDING' : 'PROCESSED',
        pendingCount: pending.length,
        processedCount: processed.length,
      },
    };
  }

  async offCycleList(query: PayrollReviewQueryDto) {
    const { page, pageSize, skip, take } = parsePage(
      query.page,
      query.pageSize,
    );
    const where: Prisma.TimeEditRequestWhereInput = {
      OR: [{ lockedCycle: true }, { offCycleRunLabel: { not: null } }],
    };
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.AND = [
        {
          OR: [
            { cycleLabel: { contains: q, mode: 'insensitive' } },
            { technicianReason: { contains: q, mode: 'insensitive' } },
            { employee: { code: { contains: q, mode: 'insensitive' } } },
            {
              employee: {
                lastName: { contains: q, mode: 'insensitive' },
              },
            },
          ],
        },
      ];
    }
    if (query.status === 'PENDING') {
      where.status = {
        in: [
          TimeEditRequestStatus.PENDING,
          TimeEditRequestStatus.NEEDS_CLARIFICATION,
        ],
      };
    } else if (query.status === 'PROCESSED') {
      where.status = TimeEditRequestStatus.APPROVED;
    }

    const [total, rows] = await Promise.all([
      this.prisma.timeEditRequest.count({ where }),
      this.prisma.timeEditRequest.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              code: true,
              firstName: true,
              lastName: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return {
      data: paginate(
        rows.map((r) => ({
          id: r.id,
          employeeId: r.employeeId,
          name: shortName(
            r.employee.firstName,
            r.employee.lastName,
            r.employee.displayName,
          ),
          code: r.employee.code,
          originalCycle: r.payrollCycleLabel || r.cycleLabel,
          reason: r.technicianReason || r.differenceKind || '—',
          original: `${r.originalClockIn ?? '—'} → ${r.originalClockOut ?? '—'}`,
          updated: `${r.requestedClockIn ?? '—'} → ${r.requestedClockOut ?? '—'}`,
          delta: r.deltaLabel || `${dec(r.deltaHours).toFixed(1)}H`,
          dollarImpact:
            r.dollarDeltaLabel ||
            (r.dollarDelta != null ? moneyLabel(dec(r.dollarDelta)) : '—'),
          status:
            r.status === TimeEditRequestStatus.APPROVED
              ? 'PROCESSED'
              : 'PENDING',
        })),
        total,
        page,
        pageSize,
      ),
    };
  }

  async processOffCycleRun() {
    const pending = await this.prisma.timeEditRequest.findMany({
      where: {
        OR: [{ lockedCycle: true }, { offCycleRunLabel: { not: null } }],
        status: {
          in: [
            TimeEditRequestStatus.PENDING,
            TimeEditRequestStatus.NEEDS_CLARIFICATION,
          ],
        },
      },
    });
    const label = `OFF-CYCLE ${new Date().toISOString().slice(0, 10)}`;
    for (const row of pending) {
      await this.prisma.timeEditRequest.update({
        where: { id: row.id },
        data: {
          status: TimeEditRequestStatus.APPROVED,
          resolvedAt: new Date(),
          offCycleRunLabel: label,
          overrideByName: 'R. CRAWFORD',
          overrideAt: new Date(),
        },
      });
    }
    return {
      data: {
        processed: pending.length,
        runLabel: label,
        message: `Processed ${pending.length} off-cycle adjustment(s)`,
      },
    };
  }

  private mapAdpRow(
    row: PayrollRow,
    cycle: { id: string; code: string; cycleNumber: number; payrollReportAt: Date | null },
  ) {
    const ptoHours = row.holidayHours + row.sickHours + row.vacationHours;
    const ptoDays = Math.round((ptoHours / 8) * 10) / 10;
    let exportStatus: 'READY' | 'EXPORTED' | 'HOLD' | 'ERROR' = 'READY';
    if (!row.adpEmployeeId?.trim()) {
      exportStatus = 'ERROR';
    } else if (row.status === 'BLOCK' || row.status === 'REVIEW') {
      exportStatus = 'HOLD';
    } else if (cycle.payrollReportAt) {
      exportStatus = 'EXPORTED';
    }
    const adpCode =
      row.adpEmployeeId?.trim() ||
      `ADP-${row.code.replace(/\D/g, '') || '000'}`;
    return {
      id: row.employeeId,
      employeeId: row.employeeId,
      name: row.name,
      code: row.code,
      exportCode: `PE-${row.code.replace(/\D/g, '').padStart(3, '0') || '000'}`,
      cycleCode: cycle.code,
      rtHours: row.rtHours,
      otHours: row.otHours,
      ptoHours,
      ptoDays,
      gross: row.gross,
      adpCode,
      batchCode: `B-${String(cycle.cycleNumber).padStart(3, '0')}`,
      reviewerName: row.reviewerName || '—',
      status: exportStatus,
      errorReason:
        exportStatus === 'ERROR'
          ? 'Missing valid ADP / SSN on file'
          : null,
    };
  }

  async adpExportKpi(cycleId?: string) {
    const cycle = await this.resolveCycle(cycleId);
    const rows = (await this.buildRows(cycle)).map((r) =>
      this.mapAdpRow(r, cycle),
    );
    const ready = rows.filter((r) => r.status === 'READY').length;
    const exported = rows.filter((r) => r.status === 'EXPORTED').length;
    const holds = rows.filter((r) => r.status === 'HOLD').length;
    const errors = rows.filter((r) => r.status === 'ERROR').length;
    const gross = money(rows.reduce((s, r) => s + r.gross, 0));
    return {
      data: {
        cycleId: cycle.id,
        cycleCode: cycle.code,
        ready,
        readyMeta: 'Approved and ready to export',
        exported,
        exportedMeta: 'Have crossed pay cycles',
        holds,
        holdsMeta: 'Missing time approval',
        errors,
        errorsMeta: 'Missing required fields',
        gross: moneyLabel(gross),
        grossMeta: 'Before deductions, this cycle',
      },
    };
  }

  async adpExportList(query: PayrollReviewQueryDto) {
    const cycle = await this.resolveCycle(query.cycleId);
    let rows = (await this.buildRows(cycle)).map((r) =>
      this.mapAdpRow(r, cycle),
    );

    const q = query.q?.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.cycleCode.toLowerCase().includes(q) ||
          r.adpCode.toLowerCase().includes(q) ||
          r.batchCode.toLowerCase().includes(q),
      );
    }
    if (query.status && query.status !== 'ANY') {
      rows = rows.filter((r) => r.status === query.status);
    }

    const sort = query.sort ?? 'name';
    const dir = query.direction === 'desc' ? -1 : 1;
    rows.sort((a, b) => {
      const av =
        sort === 'gross'
          ? a.gross
          : sort === 'status'
            ? a.status
            : sort === 'cycle'
              ? a.cycleCode
              : a.name;
      const bv =
        sort === 'gross'
          ? b.gross
          : sort === 'status'
            ? b.status
            : sort === 'cycle'
              ? b.cycleCode
              : b.name;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    const { page, pageSize, skip, take } = parsePage(
      query.page,
      query.pageSize,
    );
    return {
      data: paginate(rows.slice(skip, skip + take), rows.length, page, pageSize),
      meta: { cycleId: cycle.id, cycleCode: cycle.code },
    };
  }

  async adpConfirmPreview(cycleId?: string) {
    const cycle = await this.resolveCycle(cycleId);
    const rows = (await this.buildRows(cycle)).map((r) =>
      this.mapAdpRow(r, cycle),
    );
    const exportable = rows.filter((r) => r.status !== 'ERROR');
    const exceptions = rows.filter(
      (r) => r.status === 'HOLD' || r.status === 'ERROR',
    ).length;
    const totalHours = exportable.reduce(
      (s, r) => s + r.rtHours + r.otHours + r.ptoHours,
      0,
    );
    const gross = money(exportable.reduce((s, r) => s + r.gross, 0));
    const locked =
      cycle.status === PayCycleStatus.CLOSED || Boolean(cycle.closedAt);

    return {
      data: {
        cycleId: cycle.id,
        payCycle: cycle.code,
        employeeCount: `${exportable.length} ACTIVE`,
        totalHours: hoursLabel(Math.round(totalHours * 10) / 10),
        grossTotal: moneyLabel(gross),
        fileFormat: 'ADP CSV',
        destination: 'ADP PAYROLL — AUTO-UPLOAD',
        exceptionsRemaining: exceptions,
        cycleLocked: locked,
        warning:
          exceptions > 0
            ? `${exceptions} EXCEPTIONS REMAINING UNRESOLVED. REVIEW BEFORE EXPORTING.`
            : null,
      },
    };
  }

  async adpExportNow(cycleId?: string) {
    const cycle = await this.resolveCycle(cycleId);
    const rows = (await this.buildRows(cycle)).map((r) =>
      this.mapAdpRow(r, cycle),
    );
    const missingAdp = rows.filter((r) => r.status === 'ERROR');
    if (missingAdp.length > 0) {
      return {
        data: {
          ok: false as const,
          errorReason: `ADP rejected the file — ${missingAdp.length} employee${missingAdp.length === 1 ? ' is' : 's are'} missing a valid SSN on file. Correct these records and retry the export.`,
          missingCount: missingAdp.length,
          log: missingAdp
            .map((r) => `${r.code} ${r.name}: missing ADP/SSN`)
            .join('\n'),
        },
      };
    }

    const exportable = rows.filter((r) => r.status !== 'HOLD');
    const toExport = exportable.length > 0 ? exportable : rows;
    const filename = `PAYROLL_${cycle.code}_EXPORT.CSV`;
    const header = [
      'Employee',
      'Code',
      'ADP Code',
      'Cycle',
      'RT',
      'OT',
      'PTO',
      'Gross',
      'Batch',
      'Reviewer',
    ];
    const csv = [
      header.join(','),
      ...toExport.map((r) =>
        [
          `"${r.name}"`,
          r.code,
          r.adpCode,
          r.cycleCode,
          r.rtHours.toFixed(1),
          r.otHours.toFixed(1),
          r.ptoHours.toFixed(1),
          r.gross.toFixed(2),
          r.batchCode,
          `"${r.reviewerName}"`,
        ].join(','),
      ),
    ].join('\n');

    const now = new Date();
    await this.prisma.payCycle.update({
      where: { id: cycle.id },
      data: {
        payrollReportAt: now,
        payrollApprovedAt: cycle.payrollApprovedAt ?? now,
        totalAmount: money(toExport.reduce((s, r) => s + r.gross, 0)),
        totalHours: toExport.reduce(
          (s, r) => s + r.rtHours + r.otHours + r.ptoHours,
          0,
        ),
      },
    });

    const locked =
      cycle.status === PayCycleStatus.CLOSED || Boolean(cycle.closedAt);
    const gross = money(toExport.reduce((s, r) => s + r.gross, 0));
    const ts = now
      .toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      })
      .toUpperCase()
      .replace(',', ' •');

    return {
      data: {
        ok: true as const,
        csv,
        filename,
        file: filename,
        payCycle: cycle.code,
        employees: toExport.length,
        grossTotal: moneyLabel(gross),
        timestamp: `${ts} CT`,
        cycleLocked: locked,
        cycleId: cycle.id,
        warning: locked
          ? null
          : `CYCLE ${cycle.code} IS NOT LOCKED YET. LOCK IT TO FINALIZE THIS PAYROLL.`,
      },
    };
  }
}
