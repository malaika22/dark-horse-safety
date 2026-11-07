import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Employee, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const MILES_PER_METER = 0.000621371;

export function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** "HH:mm" in server local time — the format TimeEntry.clockIn/clockOut use. */
export function hhmm(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Date-only (local midnight) used for @db.Date columns. */
export function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return Number(v);
}

export type MobileActor = { userId: string; employee: Employee };

@Injectable()
export class MobileContext {
  constructor(readonly prisma: PrismaService) {}

  /** Resolve the signed-in user's Employee record (User.id -> Employee.userId). */
  async actor(userId: string): Promise<MobileActor> {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });
    if (!employee || employee.archivedAt) {
      throw new ForbiddenException({
        code: 'EMPLOYEE_NOT_LINKED',
        message: 'This account is not linked to an employee record.',
      });
    }
    if (!employee.mobileAppAccess) {
      throw new ForbiddenException({
        code: 'MOBILE_ACCESS_DISABLED',
        message: 'Mobile app access is disabled for this employee.',
      });
    }
    return { userId, employee };
  }

  /**
   * Idempotent write: the first call with a clientRequestId runs `fn` and stores
   * its response; replays return the stored response without running again.
   */
  async idempotent<T>(
    userId: string,
    clientRequestId: string | undefined,
    fn: () => Promise<T>,
  ): Promise<T> {
    if (!clientRequestId) return fn();
    const key = `${userId}:${clientRequestId}`;
    const hit = await this.prisma.mobileRequestLog.findUnique({
      where: { key },
    });
    if (hit) return hit.response as T;
    const result = await fn();
    try {
      await this.prisma.mobileRequestLog.create({
        data: { key, response: result as unknown as Prisma.InputJsonValue },
      });
    } catch {
      // concurrent duplicate; the first write wins
    }
    return result;
  }

  async cycleLabelFor(date: Date): Promise<string> {
    const d = dateOnly(date);
    const cycle = await this.prisma.payCycle.findFirst({
      where: { startDate: { lte: d }, endDate: { gte: d } },
    });
    if (!cycle) return `${d.getUTCFullYear()}-00`;
    return cycle.code.includes('-')
      ? cycle.code
      : `${d.getUTCFullYear()}-${pad(cycle.cycleNumber)}`;
  }

  async notify(
    userId: string,
    n: {
      dedupeKey: string;
      type: string;
      title: string;
      body: string;
      actionLabel?: string;
      reference?: Record<string, unknown>;
      requiresAction?: boolean;
    },
  ) {
    try {
      await this.prisma.mobileNotification.create({
        data: {
          userId,
          dedupeKey: n.dedupeKey,
          type: n.type,
          title: n.title,
          body: n.body,
          actionLabel: n.actionLabel,
          reference: (n.reference ?? undefined) as Prisma.InputJsonValue | undefined,
          requiresAction: n.requiresAction ?? false,
        },
      });
    } catch {
      // duplicate dedupeKey — already notified
    }
  }

  async mustFind<T>(p: Promise<T | null>, what: string): Promise<T> {
    const row = await p;
    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `${what} not found`,
      });
    }
    return row;
  }
}
