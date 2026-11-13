import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Employee, Prisma, User, UserRole } from '@prisma/client';
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
export class MobileContext implements OnModuleInit {
  private readonly log = new Logger(MobileContext.name);

  constructor(readonly prisma: PrismaService) {}

  /** Every technician account gets an employee before mobile routes run. */
  async onModuleInit() {
    try {
      const linked = await this.linkAllTechnicians();
      if (linked) this.log.log(`Linked ${linked} technician account${linked === 1 ? '' : 's'} to employees`);
    } catch (error) {
      this.log.warn(`Technician link skipped: ${(error as Error).message}`);
    }
  }

  /**
   * Resolve the signed-in user to an Employee.
   * Technician accounts are linked here as well, so a user created after startup
   * can call every mobile route.
   */
  async actor(userId: string): Promise<MobileActor> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    let employee = await this.prisma.employee.findUnique({
      where: { userId },
    });
    if (user?.role === UserRole.TECHNICIAN) {
      employee = await this.ensureTechnician(user);
    } else if (!employee && user) {
      employee = await this.matchEmployee(user);
    }
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

  /** Link every user with the technician role. Returns how many were newly attached. */
  async linkAllTechnicians() {
    const users = await this.prisma.user.findMany({ where: { role: UserRole.TECHNICIAN } });
    let linked = 0;
    for (const user of users) {
      const before = await this.prisma.employee.findUnique({ where: { userId: user.id } });
      await this.ensureTechnician(user);
      if (!before) linked += 1;
    }
    return linked;
  }

  /** Find or create the employee for this technician and turn mobile access on. */
  private async ensureTechnician(user: User): Promise<Employee> {
    const employee = (await this.matchEmployee(user)) ?? (await this.provision(user));
    if (employee.userId === user.id && employee.mobileAppAccess && !employee.archivedAt) {
      return employee;
    }
    return this.prisma.employee.update({
      where: { id: employee.id },
      data: {
        userId: user.id,
        mobileAppAccess: true,
        archivedAt: null,
        email: employee.email ?? user.email,
      },
    });
  }

  private async matchEmployee(user: User): Promise<Employee | null> {
    const linked = await this.prisma.employee.findUnique({ where: { userId: user.id } });
    if (linked) return linked;
    let employee: Employee | null = null;
    if (user.email) {
      const byEmail = await this.prisma.employee.findFirst({
        where: { email: { equals: user.email, mode: 'insensitive' }, archivedAt: null },
      });
      if (byEmail && (!byEmail.userId || byEmail.userId === user.id)) employee = byEmail;
    }
    if (!employee && user.lastName) {
      const candidates = await this.prisma.employee.findMany({
        where: {
          lastName: { equals: user.lastName, mode: 'insensitive' },
          archivedAt: null,
          userId: null,
        },
      });
      const initial = (user.firstName ?? '').trim().charAt(0).toUpperCase();
      const hits = candidates.filter((row) => row.firstName.trim().charAt(0).toUpperCase() === initial);
      if (hits.length === 1) employee = hits[0];
    }
    if (employee) {
      if (employee.userId === user.id) return employee;
      return this.prisma.employee.update({
        where: { id: employee.id },
        data: { userId: user.id, email: employee.email ?? user.email },
      });
    }
    return null;
  }

  /** Create the employee row this login was missing and attach it to the user. */
  private async provision(user: User): Promise<Employee> {
    const firstName = user.firstName?.trim() || 'Field';
    const lastName = user.lastName?.trim() || 'Technician';
    const displayName = `${firstName.charAt(0)}. ${lastName}`.trim();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.employee.create({
          data: {
            code: await this.nextEmployeeCode(),
            firstName,
            lastName,
            displayName,
            roleTitle: 'Field Technician',
            email: user.email,
            phone: user.phone,
            userId: user.id,
            mobileAppAccess: true,
            status: 'ACTIVE',
          },
        });
      } catch (error) {
        const linked = await this.prisma.employee.findUnique({ where: { userId: user.id } });
        if (linked && !linked.archivedAt) return linked;
        const retry = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && attempt < 2;
        if (!retry) throw error;
      }
    }
    throw new ForbiddenException({
      code: 'EMPLOYEE_NOT_LINKED',
      message: 'This account is not linked to an employee record.',
    });
  }

  private async nextEmployeeCode() {
    const rows = await this.prisma.employee.findMany({ select: { code: true } });
    let max = 1000;
    for (const row of rows) {
      const match = /^EMP-(\d+)$/i.exec(row.code);
      if (match) max = Math.max(max, Number(match[1]));
    }
    return `EMP-${max + 1}`;
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
