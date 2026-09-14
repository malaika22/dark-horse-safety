import { BadRequestException } from '@nestjs/common';
import { CrmRecordStatus } from '@prisma/client';

const STATUS_VALUES = new Set<string>(Object.values(CrmRecordStatus));

/**
 * Normalize UI / query status strings ("Active", "needs-review") to Prisma enum.
 * Throws 400 instead of letting Prisma return a 500 for invalid values.
 */
export function parseCrmRecordStatus(
  raw?: string | null,
  opts?: { required?: boolean; field?: string },
): CrmRecordStatus | undefined {
  const field = opts?.field ?? 'status';
  if (raw == null || !String(raw).trim()) {
    if (opts?.required) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Select a status.',
        details: { [field]: ['Select a status.'] },
      });
    }
    return undefined;
  }

  const normalized = String(raw)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (!STATUS_VALUES.has(normalized)) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Invalid status.',
      details: {
        [field]: [
          `Status must be one of: ${[...STATUS_VALUES].join(', ')}.`,
        ],
      },
    });
  }

  return normalized as CrmRecordStatus;
}
