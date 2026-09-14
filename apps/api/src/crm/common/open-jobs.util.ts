import { CrmRecordStatus, Prisma } from '@prisma/client';

/** Work orders that still count toward customer/site open-job KPIs. */
export const OPEN_WORK_ORDER_STATUSES: CrmRecordStatus[] = [
  CrmRecordStatus.DRAFT,
  CrmRecordStatus.OPEN,
  CrmRecordStatus.PENDING,
  CrmRecordStatus.IN_PROGRESS,
  CrmRecordStatus.SENT,
  CrmRecordStatus.ON_HOLD,
];

export function openWorkOrderWhere(
  extra: Prisma.WorkOrderWhereInput = {},
): Prisma.WorkOrderWhereInput {
  return {
    archivedAt: null,
    status: { in: OPEN_WORK_ORDER_STATUSES },
    ...extra,
  };
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
