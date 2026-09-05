import type { Paginated } from '@dark-horse-safety/types';

export function parsePage(page?: number, pageSize?: number) {
  const p = Math.max(1, page ?? 1);
  const size = Math.min(200, Math.max(1, pageSize ?? 25));
  return { page: p, pageSize: size, skip: (p - 1) * size, take: size };
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return { items, page, pageSize, total };
}

export function orderByFrom(
  sort: string | undefined,
  direction: 'asc' | 'desc' | undefined,
  allowed: Record<string, string>,
  fallback: Record<string, 'asc' | 'desc'>,
) {
  const dir = direction === 'asc' ? 'asc' : 'desc';
  if (sort && allowed[sort]) {
    return { [allowed[sort]]: dir };
  }
  return fallback;
}

/** Case-insensitive contains for Prisma string filters. */
export function containsCi(value?: string) {
  if (!value?.trim()) return undefined;
  return { contains: value.trim(), mode: 'insensitive' as const };
}
