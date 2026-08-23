import { EMAIL_REGEX } from '@dark-horse-safety/types/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizePhone } from './phone.util';

export function parseLoginIdentifier(raw: string): {
  email?: string;
  phone?: string;
} {
  const trimmed = raw.trim();

  if (EMAIL_REGEX.test(trimmed.toLowerCase())) {
    return { email: trimmed.toLowerCase() };
  }

  return { phone: normalizePhone(trimmed) };
}

export async function findUserByLoginIdentifier(
  prisma: PrismaService,
  identifier: string,
) {
  const { email, phone } = parseLoginIdentifier(identifier);

  if (email) {
    return prisma.user.findUnique({ where: { email } });
  }

  if (phone) {
    return prisma.user.findUnique({ where: { phone } });
  }

  return null;
}
