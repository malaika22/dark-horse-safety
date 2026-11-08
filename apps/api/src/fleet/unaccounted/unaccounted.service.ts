import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UnaccountedStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { asciiSafe, DAY_MS, fmtShortDate } from '../common/fleet.util';

function money(value: Prisma.Decimal | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function quarterLabel(date = new Date()) {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
}

@Injectable()
export class UnaccountedService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureSeed() {
    const count = await this.prisma.unaccountedAsset.count();
    if (count > 0) return;
    const now = Date.now();
    const rows: Prisma.UnaccountedAssetCreateManyInput[] = [
      {
        assetLabel: 'GAS MONITOR',
        assetCode: 'GM-8841',
        replacementValue: new Prisma.Decimal(2200),
        lastTruck: 'TRUCK 07',
        lastHolder: 'D. REED',
        markedMissingAt: new Date(now - 12 * DAY_MS),
        locateDays: 14,
        status: 'LOCATING',
      },
      {
        assetLabel: 'SCBA SET',
        assetCode: 'SC-1180',
        replacementValue: new Prisma.Decimal(3400),
        lastTruck: 'TRUCK 03',
        lastHolder: 'T. WHITLOCK',
        markedMissingAt: new Date(now - 20 * DAY_MS),
        locateDays: 14,
        status: 'CHARGE_PENDING',
      },
      {
        assetLabel: 'TRIPOD & WINCH',
        assetCode: 'TR-0473',
        replacementValue: new Prisma.Decimal(1850),
        lastTruck: 'TRUCK 15',
        lastHolder: 'P. GRANT',
        markedMissingAt: new Date(now - 14 * DAY_MS),
        locateDays: 14,
        status: 'OVERDUE',
      },
      {
        assetLabel: 'REGULATOR',
        assetCode: 'RG-0091',
        replacementValue: new Prisma.Decimal(3790),
        lastTruck: 'TRUCK 15',
        lastHolder: 'J. MARTINEZ',
        markedMissingAt: new Date(now - 30 * DAY_MS),
        locateDays: 14,
        status: 'WRITTEN_OFF',
      },
    ];
    await this.prisma.unaccountedAsset.createMany({ data: rows });
  }

  private daysLeft(row: { markedMissingAt: Date; locateDays: number }) {
    const end = row.markedMissingAt.getTime() + row.locateDays * DAY_MS;
    return Math.ceil((end - Date.now()) / DAY_MS);
  }

  private async mapRow(row: {
    id: string;
    assetLabel: string;
    assetCode: string;
    replacementValue: Prisma.Decimal;
    lastTruck: string | null;
    lastHolder: string | null;
    markedMissingAt: Date;
    locateDays: number;
    status: UnaccountedStatus;
    chargeMethod: string | null;
    chargeReason: string | null;
    notifyTechnician: boolean;
    chargedAmount: Prisma.Decimal | null;
    history: Prisma.JsonValue;
  }) {
    let status = row.status;
    const left = this.daysLeft(row);
    if (
      (status === 'LOCATING' || status === 'OVERDUE') &&
      left < 0 &&
      status !== 'OVERDUE'
    ) {
      status = 'OVERDUE';
      await this.prisma.unaccountedAsset.update({
        where: { id: row.id },
        data: { status },
      });
    }
    const tone =
      status === 'WRITTEN_OFF'
        ? 'muted'
        : status === 'OVERDUE'
          ? 'danger'
          : status === 'CHARGE_PENDING'
            ? 'warning'
            : status === 'RECOVERED'
              ? 'success'
              : 'info';
    return {
      id: row.id,
      assetLabel: row.assetLabel,
      assetCode: row.assetCode,
      replacementValue: Number(row.replacementValue),
      valueLabel: money(row.replacementValue),
      lastTruck: row.lastTruck,
      lastHolder: row.lastHolder,
      markedOn: fmtShortDate(row.markedMissingAt),
      locateDays: row.locateDays,
      daysLeft: left,
      locateLabel:
        status === 'WRITTEN_OFF'
          ? '—'
          : left < 0
            ? 'OVERDUE'
            : left === 0
              ? '0 DAYS LEFT'
              : `${left} DAYS LEFT`,
      status,
      statusLabel: status.replace('_', ' '),
      statusTone: tone,
      chargeMethod: row.chargeMethod,
      chargeReason: row.chargeReason,
      notifyTechnician: row.notifyTechnician,
      chargedAmount: row.chargedAmount ? Number(row.chargedAmount) : null,
      history: Array.isArray(row.history) ? row.history : [],
    };
  }

  async list(q?: string, status?: string) {
    await this.ensureSeed();
    const rows = await this.prisma.unaccountedAsset.findMany({
      where: {
        archivedAt: null,
        ...(status ? { status: status as UnaccountedStatus } : {}),
        ...(q?.trim()
          ? {
              OR: [
                { assetLabel: { contains: q.trim(), mode: 'insensitive' } },
                { assetCode: { contains: q.trim(), mode: 'insensitive' } },
                { lastHolder: { contains: q.trim(), mode: 'insensitive' } },
                { lastTruck: { contains: q.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { markedMissingAt: 'desc' },
    });
    return { data: { items: await Promise.all(rows.map((row) => this.mapRow(row))) } };
  }

  async kpi() {
    await this.ensureSeed();
    const rows = await this.prisma.unaccountedAsset.findMany({
      where: { archivedAt: null, status: { not: 'RECOVERED' } },
    });
    const recovered = await this.prisma.unaccountedAsset.findMany({
      where: { status: 'RECOVERED' },
    });
    const charged = rows.filter((row) => row.status === 'CHARGE_PENDING');
    const total = rows.reduce((sum, row) => sum + Number(row.replacementValue), 0);
    const recoveredValue = recovered.reduce(
      (sum, row) => sum + Number(row.replacementValue),
      0,
    );
    const chargedValue = charged.reduce(
      (sum, row) => sum + Number(row.chargedAmount ?? row.replacementValue),
      0,
    );
    return {
      data: {
        cells: [
          {
            title: 'Unaccounted',
            value: money(total),
            meta: 'TOTAL THIS QUARTER',
          },
          { title: 'Items', value: String(rows.length), meta: 'UNACCOUNTED' },
          {
            title: 'Recovered',
            value: String(recovered.length),
            meta: `THIS QUARTER · ${money(recoveredValue)}`,
          },
          {
            title: 'Charged',
            value: String(charged.length),
            meta: `TECHNICIANS · ${money(chargedValue)}`,
          },
        ],
      },
    };
  }

  private async find(id: string) {
    const row = await this.prisma.unaccountedAsset.findFirst({
      where: { id, archivedAt: null },
    });
    if (!row) throw new NotFoundException('Unaccounted asset not found');
    return row;
  }

  private history(row: { history: Prisma.JsonValue }, entry: string) {
    const current = Array.isArray(row.history) ? row.history : [];
    return [...current, { at: new Date().toISOString(), entry: asciiSafe(entry) }];
  }

  async report(dto: {
    assetLabel: string;
    assetCode: string;
    replacementValue: number;
    lastTruck?: string;
    lastHolder?: string;
  }) {
    await this.ensureSeed();
    const created = await this.prisma.unaccountedAsset.create({
      data: {
        assetLabel: asciiSafe(dto.assetLabel.trim().toUpperCase()),
        assetCode: asciiSafe(dto.assetCode.trim().toUpperCase()),
        replacementValue: new Prisma.Decimal(dto.replacementValue),
        lastTruck: dto.lastTruck ? asciiSafe(dto.lastTruck.trim().toUpperCase()) : null,
        lastHolder: dto.lastHolder ? asciiSafe(dto.lastHolder.trim().toUpperCase()) : null,
        markedMissingAt: new Date(),
        locateDays: 14,
        status: 'LOCATING',
        history: [{ at: new Date().toISOString(), entry: 'REPORTED MISSING' }],
      },
    });
    return { data: await this.mapRow(created) };
  }

  async extend(id: string, days: number) {
    if (!Number.isFinite(days) || days < 1) {
      throw new BadRequestException('Extension days must be at least 1');
    }
    const row = await this.find(id);
    const updated = await this.prisma.unaccountedAsset.update({
      where: { id },
      data: {
        locateDays: row.locateDays + Math.round(days),
        status: row.status === 'WRITTEN_OFF' ? row.status : 'LOCATING',
        history: this.history(row, `LOCATE WINDOW EXTENDED ${Math.round(days)} DAYS`),
      },
    });
    return { data: await this.mapRow(updated) };
  }

  async recover(id: string) {
    const row = await this.find(id);
    const updated = await this.prisma.unaccountedAsset.update({
      where: { id },
      data: {
        status: 'RECOVERED',
        history: this.history(row, 'MARKED RECOVERED'),
      },
    });
    return { data: await this.mapRow(updated) };
  }

  async writeOff(id: string) {
    const row = await this.find(id);
    const updated = await this.prisma.unaccountedAsset.update({
      where: { id },
      data: {
        status: 'WRITTEN_OFF',
        history: this.history(row, 'WRITTEN OFF'),
      },
    });
    return { data: await this.mapRow(updated) };
  }

  async charge(
    id: string,
    dto: { method: 'BONUS' | 'PAY'; reason: string; notify: boolean },
  ) {
    const reason = dto.reason?.trim();
    if (!reason) throw new BadRequestException('A reason is required');
    const row = await this.find(id);
    let bonusId: string | null = null;
    if (dto.method === 'BONUS' && row.lastHolder) {
      const last = row.lastHolder.split(' ').pop() ?? '';
      const employee = await this.prisma.employee.findFirst({
        where: {
          archivedAt: null,
          lastName: { contains: last, mode: 'insensitive' },
        },
      });
      const user = employee?.email
        ? await this.prisma.user.findFirst({
            where: { email: { equals: employee.email, mode: 'insensitive' } },
          })
        : null;
      if (user) {
        const bonus = await this.prisma.bonusDeduction.create({
          data: {
            userId: user.id,
            amount: row.replacementValue,
            quarterLabel: quarterLabel(),
            reason: asciiSafe(
              `${row.assetCode} ${row.assetLabel}: ${reason}`,
            ),
          },
        });
        bonusId = bonus.id;
      }
    }
    const quarter = quarterLabel();
    const updated = await this.prisma.unaccountedAsset.update({
      where: { id },
      data: {
        status: 'CHARGE_PENDING',
        chargeMethod: dto.method,
        chargeReason: asciiSafe(reason),
        notifyTechnician: dto.notify,
        chargedAmount: row.replacementValue,
        history: this.history(
          row,
          `CHARGED ${money(row.replacementValue)} VIA ${dto.method === 'BONUS' ? `${quarter} BONUS` : 'PAY'}${bonusId ? ' · BONUS RECORDED' : ''}${dto.notify ? ' · TECHNICIAN NOTIFIED' : ''}`,
        ),
      },
    });
    const mapped = await this.mapRow(updated);
    return {
      data: {
        ...mapped,
        message: asciiSafe(
          `THIS RECORDS A ${money(row.replacementValue)} DEDUCTION AGAINST ${row.lastHolder ?? 'THE TECHNICIAN'} ${dto.method === 'BONUS' ? quarter : 'PAY'}${dto.notify ? ' AND NOTIFIES THEM' : ''}.`,
        ),
      },
    };
  }
}
