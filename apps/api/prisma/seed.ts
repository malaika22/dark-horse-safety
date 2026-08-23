import { PrismaClient, UserRole, AccountStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

const prisma = new PrismaClient();

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@darkhorseops.com' },
    update: {
      passwordHash,
      status: AccountStatus.ACTIVE,
      role: UserRole.ADMIN,
    },
    create: {
      email: 'admin@darkhorseops.com',
      passwordHash,
      firstName: 'R.',
      lastName: 'Crawford',
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
    },
  });

  const inviteEmail = 'jwhitfield@dhs.com';
  const rawInvite = randomBytes(32).toString('hex');

  await prisma.user.upsert({
    where: { email: inviteEmail },
    update: { status: AccountStatus.INVITED, role: UserRole.SUPERVISOR },
    create: {
      email: inviteEmail,
      role: UserRole.SUPERVISOR,
      status: AccountStatus.INVITED,
      firstName: 'J',
      lastName: 'Whitfield',
    },
  });

  await prisma.invite.deleteMany({ where: { email: inviteEmail } });
  await prisma.invite.create({
    data: {
      email: inviteEmail,
      tokenHash: hashToken(rawInvite),
      role: UserRole.SUPERVISOR,
      inviterId: admin.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Seed complete');
  console.log('Admin login: admin@darkhorseops.com / Password123!');
  console.log(`Sample invite token: ${rawInvite}`);
  console.log(
    `Accept URL: http://localhost:3000/invite/accept?token=${rawInvite}&email=${encodeURIComponent(inviteEmail)}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
