import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@mediumformat.id';
  const exists = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!exists) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        passwordHash: await bcrypt.hash('changeme123', 12),
        role: 'ADMIN',
      },
    });
    console.log('✓ Seeded admin user: admin@mediumformat.id / changeme123');
  } else {
    console.log('✓ Admin user already exists, skipping seed.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
