import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const FLEET_TZ = 'America/Chicago';
export const DAY_MS = 86_400_000;

export function asciiSafe(s: string) {
  return s
    .replace(/\uFFFD/g, '')
    .replace(/[·•]/g, ' - ')
    .replace(/[—–−]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
}

export function shortName(first?: string | null, last?: string | null) {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (f && l) return `${f.charAt(0).toUpperCase()}. ${l.toUpperCase()}`;
  return (f || l || 'TECH').toUpperCase();
}

export function parseDate(value?: string | null) {
  if (!value?.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid date: ${value}`);
  }
  return d;
}

export function fmtShortDate(d: Date | null | undefined) {
  if (!d) return null;
  return d
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: FLEET_TZ,
    })
    .toUpperCase();
}

export function daysUntil(d: Date | null | undefined, now = new Date()) {
  if (!d) return null;
  return Math.ceil((d.getTime() - now.getTime()) / DAY_MS);
}

export function buildDueLabel(dueAt: Date | null | undefined, prefix = 'DUE') {
  if (!dueAt) return null;
  const days = daysUntil(dueAt);
  const dateStr = fmtShortDate(dueAt);
  if (days == null) return null;
  if (days < 0) return `OVERDUE - ${Math.abs(days)}D`;
  if (days === 0) return `DUE TODAY - ${dateStr}`;
  return `${prefix} ${dateStr} - ${days}D`;
}

export function labelOf(value: string) {
  return asciiSafe(value.replace(/_/g, ' ').toUpperCase());
}

export function dateRangeWhere(
  from?: string,
  to?: string,
): Prisma.DateTimeFilter | undefined {
  const gte = parseDate(from);
  const lte = parseDate(to);
  if (!gte && !lte) return undefined;
  return {
    ...(gte ? { gte } : {}),
    ...(lte ? { lte } : {}),
  };
}

export function cmpField(
  a: string | number | Date | null | undefined,
  b: string | number | Date | null | undefined,
  dir: 'asc' | 'desc',
) {
  const av = a instanceof Date ? a.getTime() : (a ?? '');
  const bv = b instanceof Date ? b.getTime() : (b ?? '');
  if (av < bv) return dir === 'asc' ? -1 : 1;
  if (av > bv) return dir === 'asc' ? 1 : -1;
  return 0;
}

export type FindingRow = { label: string; detail?: string; failed?: boolean };

export function findingsOf(value: Prisma.JsonValue | null): FindingRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const row = x as Record<string, unknown>;
      return {
        label: String(row.label ?? ''),
        detail: row.detail != null ? String(row.detail) : undefined,
        failed: Boolean(row.failed),
      };
    });
}

export function countFailedItems(value: Prisma.JsonValue | null) {
  return findingsOf(value).filter((f) => f.failed !== false).length;
}
