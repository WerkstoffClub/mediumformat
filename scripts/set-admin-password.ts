// Set or reset an admin user's password. Handy when the seed-generated
// password was lost, or to hand someone a known login.
//
// Usage:
//   npx tsx scripts/set-admin-password.ts [email] [password]
//   npm run admin:password -- admin@mediumformat.info 'YourPassword'
//   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run admin:password
//
// If no password is given, a strong one is generated and printed once.
// Idempotent: creates the admin if missing, otherwise resets the password.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  const email =
    process.argv[2] ?? process.env.SEED_ADMIN_EMAIL ?? "admin@mediumformat.info";
  let password = process.argv[3] ?? process.env.SEED_ADMIN_PASSWORD;
  let generated = false;
  if (!password) {
    password = randomBytes(12).toString("base64url");
    generated = true;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN" },
    create: {
      email,
      name: process.env.SEED_ADMIN_NAME ?? "Medium Format Admin",
      role: "ADMIN",
      passwordHash,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`\nAdmin ready: ${user.email}`);
  // eslint-disable-next-line no-console
  console.log(`Password:    ${password}${generated ? "   (generated — save it now)" : ""}`);
  // eslint-disable-next-line no-console
  console.log(`Sign in at:  /admin/login\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
