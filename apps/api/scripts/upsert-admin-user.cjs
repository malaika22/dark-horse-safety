const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

async function main() {
  const prisma = new PrismaClient();
  const email = "admin@darkhorseops.com";
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      status: "ACTIVE",
      role: "ADMIN",
      firstName: "R.",
      lastName: "Crawford",
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      email,
      passwordHash,
      status: "ACTIVE",
      role: "ADMIN",
      firstName: "R.",
      lastName: "Crawford",
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log(JSON.stringify(user, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
