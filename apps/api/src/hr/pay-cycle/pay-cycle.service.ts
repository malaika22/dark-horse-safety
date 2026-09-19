import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PayCycleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AddPayCycleNoteDto,
  UpdateCadenceDto,
  UpdateHolidayDto,
  UpdateOvertimeRulesDto,
  UpdatePtoRulesDto,
} from './dto/pay-cycle.dto';

const SETTINGS_ID = 'default';

function dec(v: Prisma.Decimal | number | null | undefined, fallback = 0) {
  if (v == null) return fallback;
  return Number(v);
}

function startOfUtcDay(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function fmtRange(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

function fmtLock(d: Date | null | undefined) {
  if (!d) return '—';
  return d
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
    .replace(',', '');
}

function fmtHolidayDate(d: Date) {
  return d
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    .toUpperCase();
}

@Injectable()
export class PayCycleService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureSettings() {
    return this.prisma.payCycleSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    });
  }

  private resolveStatus(
    start: Date,
    end: Date,
    stored: PayCycleStatus,
    closedAt: Date | null,
  ): PayCycleStatus {
    if (closedAt || stored === PayCycleStatus.CLOSED) return PayCycleStatus.CLOSED;
    const today = startOfUtcDay(new Date());
    const s = startOfUtcDay(start);
    const e = startOfUtcDay(end);
    if (today < s) return PayCycleStatus.UPCOMING;
    if (today > e) return PayCycleStatus.CLOSED;
    return PayCycleStatus.OPEN;
  }

  private mapSettings(row: Awaited<ReturnType<PayCycleService['ensureSettings']>>) {
    return {
      dailyOtThresholdHrs: dec(row.dailyOtThresholdHrs, 8),
      weeklyOtThresholdHrs: dec(row.weeklyOtThresholdHrs, 40),
      otMultiplier: dec(row.otMultiplier, 1.5),
      doubleTimeAfterHrs: dec(row.doubleTimeAfterHrs, 12),
      minBillableBlock: row.minBillableBlock,
      roundTo: row.roundTo,
      annualPtoDays: dec(row.annualPtoDays, 20),
      accrualRatePerPeriod: dec(row.accrualRatePerPeriod, 0.77),
      annualSickDays: dec(row.annualSickDays, 10),
      carryoverCapDays: dec(row.carryoverCapDays, 5),
      noticeRequiredDays: row.noticeRequiredDays,
      blackout: row.blackout || 'NONE',
      cadence: row.cadence,
      cycleLengthDays: row.cycleLengthDays,
      lockTime: row.lockTime,
      autoApproveRules: row.autoApproveRules,
      gracePeriodDays: row.gracePeriodDays,
      notes: row.notes,
    };
  }

  async getOverview(year?: number) {
    const settings = await this.ensureSettings();
    const y = year ?? new Date().getUTCFullYear();

    const [cycles, holidays, activeEmployees, pendingEdits] =
      await Promise.all([
        this.prisma.payCycle.findMany({
          where: { code: { startsWith: `${y}-` } },
          orderBy: { startDate: 'asc' },
        }),
        this.prisma.observedHoliday.findMany({
          where: { year: y },
          orderBy: [{ sortOrder: 'asc' }, { observedOn: 'asc' }],
        }),
        this.prisma.employee.count({
          where: { status: 'ACTIVE', archivedAt: null },
        }),
        this.prisma.timeEditRequest.count({
          where: { status: { in: ['PENDING', 'NEEDS_CLARIFICATION'] } },
        }),
      ]);

    const mappedCycles = cycles.map((c) => {
      const status = this.resolveStatus(
        c.startDate,
        c.endDate,
        c.status,
        c.closedAt,
      );
      const isOpen = status === PayCycleStatus.OPEN;
      const isUpcoming = status === PayCycleStatus.UPCOMING;
      return {
        id: c.id,
        code: c.code,
        cycleLabel: c.code.includes('-')
          ? c.code
          : `${y}-${String(c.cycleNumber).padStart(2, '0')}`,
        dateRange: fmtRange(c.startDate, c.endDate),
        startDate: c.startDate.toISOString().slice(0, 10),
        endDate: c.endDate.toISOString().slice(0, 10),
        lockTime: fmtLock(c.lockAt),
        status,
        hours: isUpcoming ? null : dec(c.totalHours, isOpen ? 0 : 0),
        amount: isUpcoming ? null : dec(c.totalAmount, isOpen ? 0 : 0),
        isCurrent: isOpen,
      };
    });

    const current =
      mappedCycles.find((c) => c.isCurrent) ??
      mappedCycles.find((c) => c.status === PayCycleStatus.OPEN) ??
      null;

    const currentDb = current
      ? cycles.find((c) => c.id === current.id)
      : null;

    let daysRemaining = 0;
    if (currentDb) {
      const today = startOfUtcDay(new Date());
      const end = startOfUtcDay(currentDb.endDate);
      daysRemaining = Math.max(
        0,
        Math.round((end.getTime() - today.getTime()) / 86400000),
      );
    }

    const lockedEntries = currentDb
      ? await this.prisma.timeEntry.count({
          where: {
            workDate: {
              gte: currentDb.startDate,
              lte: currentDb.endDate,
            },
            status: 'LOCKED',
          },
        })
      : 0;

    const mappedSettings = this.mapSettings(settings);
    const currentEndsLabel = currentDb
      ? currentDb.endDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : '—';

    return {
      data: {
        year: y,
        cycleCount: mappedCycles.length,
        headerSubtitle: `${mappedSettings.cadence.replaceAll('-', ' ')} CADENCE — CURRENT CYCLE ENDS ${currentEndsLabel}`.toUpperCase(),
        cycles: mappedCycles,
        overtime: {
          dailyOtThresholdHrs: mappedSettings.dailyOtThresholdHrs,
          weeklyOtThresholdHrs: mappedSettings.weeklyOtThresholdHrs,
          otMultiplier: mappedSettings.otMultiplier,
          doubleTimeAfterHrs: mappedSettings.doubleTimeAfterHrs,
          minBillableBlock: mappedSettings.minBillableBlock,
          roundTo: mappedSettings.roundTo,
        },
        holidays: holidays.map((h) => ({
          id: h.id,
          dateLabel: fmtHolidayDate(h.observedOn),
          observedOn: h.observedOn.toISOString().slice(0, 10),
          name: h.name,
          hoursCredited: dec(h.hoursCredited, 8),
        })),
        holidaysMeta: `${holidays.length} OF ${holidays.length} SET`,
        currentCycle: current
          ? {
              id: current.id,
              code: current.cycleLabel,
              dateRange: current.dateRange,
              status: current.status,
              activeEmployees,
              daysRemaining,
              totalHours: current.hours ?? 0,
              pendingEdits,
              lockedEntries,
            }
          : null,
        ptoRules: {
          annualPtoDays: mappedSettings.annualPtoDays,
          accrualRatePerPeriod: mappedSettings.accrualRatePerPeriod,
          annualSickDays: mappedSettings.annualSickDays,
          carryoverCapDays: mappedSettings.carryoverCapDays,
          noticeRequiredDays: mappedSettings.noticeRequiredDays,
          blackout: mappedSettings.blackout,
        },
        cadence: {
          cadence: mappedSettings.cadence,
          cycleLengthDays: mappedSettings.cycleLengthDays,
          lockTime: mappedSettings.lockTime,
          autoApproveRules: mappedSettings.autoApproveRules,
          gracePeriodDays: mappedSettings.gracePeriodDays,
        },
        notes: mappedSettings.notes,
      },
    };
  }

  async closeCycle(id: string) {
    const row = await this.prisma.payCycle.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Pay cycle not found');
    const status = this.resolveStatus(
      row.startDate,
      row.endDate,
      row.status,
      row.closedAt,
    );
    if (status === PayCycleStatus.CLOSED) {
      throw new BadRequestException('Cycle is already closed');
    }
    if (status === PayCycleStatus.UPCOMING) {
      throw new BadRequestException('Cannot close an upcoming cycle');
    }

    const updated = await this.prisma.payCycle.update({
      where: { id },
      data: {
        status: PayCycleStatus.CLOSED,
        closedAt: new Date(),
        lockAt: row.lockAt ?? new Date(),
      },
    });

    // Promote next upcoming cycle to OPEN if none open
    const next = await this.prisma.payCycle.findFirst({
      where: {
        startDate: { gt: row.endDate },
        closedAt: null,
        status: { not: PayCycleStatus.CLOSED },
      },
      orderBy: { startDate: 'asc' },
    });
    if (next) {
      await this.prisma.payCycle.update({
        where: { id: next.id },
        data: { status: PayCycleStatus.OPEN },
      });
    }

    return { data: { id: updated.id, status: PayCycleStatus.CLOSED } };
  }

  async reopenCycle(id: string) {
    const row = await this.prisma.payCycle.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Pay cycle not found');

    const status = this.resolveStatus(
      row.startDate,
      row.endDate,
      row.status,
      row.closedAt,
    );

    // Already open — treat as success (UI shows both actions on current cycle)
    if (status === PayCycleStatus.OPEN && !row.closedAt) {
      return { data: { id: row.id, status: PayCycleStatus.OPEN } };
    }

    // Only one OPEN cycle at a time — close any other currently open cycle
    const others = await this.prisma.payCycle.findMany({
      where: {
        id: { not: id },
        closedAt: null,
        status: PayCycleStatus.OPEN,
      },
    });
    if (others.length > 0) {
      await this.prisma.payCycle.updateMany({
        where: { id: { in: others.map((o) => o.id) } },
        data: { status: PayCycleStatus.CLOSED, closedAt: new Date() },
      });
    }

    const updated = await this.prisma.payCycle.update({
      where: { id },
      data: {
        status: PayCycleStatus.OPEN,
        closedAt: null,
      },
    });

    return { data: { id: updated.id, status: PayCycleStatus.OPEN } };
  }

  async resyncCycle(id: string) {
    const row = await this.prisma.payCycle.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Pay cycle not found');

    const agg = await this.prisma.timeEntry.aggregate({
      where: {
        workDate: { gte: row.startDate, lte: row.endDate },
        status: { in: ['APPROVED', 'PENDING'] },
      },
      _sum: { hours: true },
    });
    const hours = dec(agg._sum.hours, 0);
    const amount = Math.round(hours * 28.5 * 100) / 100;

    const updated = await this.prisma.payCycle.update({
      where: { id },
      data: {
        totalHours: hours,
        totalAmount: amount,
      },
    });

    return {
      data: {
        id: updated.id,
        hours: dec(updated.totalHours),
        amount: dec(updated.totalAmount),
      },
    };
  }

  async updateOvertime(dto: UpdateOvertimeRulesDto) {
    await this.ensureSettings();
    const updated = await this.prisma.payCycleSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        ...(dto.dailyOtThresholdHrs !== undefined
          ? { dailyOtThresholdHrs: dto.dailyOtThresholdHrs }
          : {}),
        ...(dto.weeklyOtThresholdHrs !== undefined
          ? { weeklyOtThresholdHrs: dto.weeklyOtThresholdHrs }
          : {}),
        ...(dto.otMultiplier !== undefined
          ? { otMultiplier: dto.otMultiplier }
          : {}),
        ...(dto.doubleTimeAfterHrs !== undefined
          ? { doubleTimeAfterHrs: dto.doubleTimeAfterHrs }
          : {}),
        ...(dto.minBillableBlock !== undefined
          ? { minBillableBlock: dto.minBillableBlock }
          : {}),
        ...(dto.roundTo !== undefined ? { roundTo: dto.roundTo } : {}),
      },
    });
    return { data: this.mapSettings(updated) };
  }

  async updatePto(dto: UpdatePtoRulesDto) {
    await this.ensureSettings();
    const updated = await this.prisma.payCycleSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        ...(dto.annualPtoDays !== undefined
          ? { annualPtoDays: dto.annualPtoDays }
          : {}),
        ...(dto.accrualRatePerPeriod !== undefined
          ? { accrualRatePerPeriod: dto.accrualRatePerPeriod }
          : {}),
        ...(dto.annualSickDays !== undefined
          ? { annualSickDays: dto.annualSickDays }
          : {}),
        ...(dto.carryoverCapDays !== undefined
          ? { carryoverCapDays: dto.carryoverCapDays }
          : {}),
        ...(dto.noticeRequiredDays !== undefined
          ? { noticeRequiredDays: dto.noticeRequiredDays }
          : {}),
        ...(dto.blackout !== undefined ? { blackout: dto.blackout } : {}),
      },
    });
    return { data: this.mapSettings(updated) };
  }

  async updateCadence(dto: UpdateCadenceDto) {
    await this.ensureSettings();
    const updated = await this.prisma.payCycleSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        ...(dto.cadence !== undefined ? { cadence: dto.cadence } : {}),
        ...(dto.cycleLengthDays !== undefined
          ? { cycleLengthDays: dto.cycleLengthDays }
          : {}),
        ...(dto.lockTime !== undefined ? { lockTime: dto.lockTime } : {}),
        ...(dto.autoApproveRules !== undefined
          ? { autoApproveRules: dto.autoApproveRules }
          : {}),
        ...(dto.gracePeriodDays !== undefined
          ? { gracePeriodDays: dto.gracePeriodDays }
          : {}),
      },
    });
    return { data: this.mapSettings(updated) };
  }

  async updateHoliday(id: string, dto: UpdateHolidayDto) {
    const row = await this.prisma.observedHoliday.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Holiday not found');
    const updated = await this.prisma.observedHoliday.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.hoursCredited !== undefined
          ? { hoursCredited: dto.hoursCredited }
          : {}),
        ...(dto.observedOn
          ? { observedOn: new Date(`${dto.observedOn.slice(0, 10)}T12:00:00.000Z`) }
          : {}),
      },
    });
    return {
      data: {
        id: updated.id,
        dateLabel: fmtHolidayDate(updated.observedOn),
        observedOn: updated.observedOn.toISOString().slice(0, 10),
        name: updated.name,
        hoursCredited: dec(updated.hoursCredited, 8),
      },
    };
  }

  async addNote(dto: AddPayCycleNoteDto) {
    const text = dto.text?.trim();
    if (!text) throw new BadRequestException('Note is required');
    await this.ensureSettings();
    const existing = await this.prisma.payCycleSettings.findUniqueOrThrow({
      where: { id: SETTINGS_ID },
    });
    const stamp = new Date().toISOString().slice(0, 10);
    const next = existing.notes
      ? `${existing.notes}\n[${stamp}] ${text}`
      : `[${stamp}] ${text}`;
    const updated = await this.prisma.payCycleSettings.update({
      where: { id: SETTINGS_ID },
      data: { notes: next },
    });
    return { data: { notes: updated.notes } };
  }
}
