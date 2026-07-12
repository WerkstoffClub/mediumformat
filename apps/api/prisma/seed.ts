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

  // Channel pricing defaults (editable in Preferences). Fee % is all-in
  // (marketplace commission + payment + typical program fees). Verify rates before go-live.
  const channelDefaults: Array<{
    channel: 'SHOPEE' | 'TOKOPEDIA' | 'WEBSITE' | 'POS' | 'DISCOGS';
    feePct: number;
    rounding: string;
    currency: string;
  }> = [
    { channel: 'POS', feePct: 0.01, rounding: 'NEAREST_1000', currency: 'IDR' },
    { channel: 'WEBSITE', feePct: 0.025, rounding: 'NEAREST_1000', currency: 'IDR' },
    { channel: 'TOKOPEDIA', feePct: 0.065, rounding: 'X900', currency: 'IDR' },
    { channel: 'SHOPEE', feePct: 0.1, rounding: 'X900', currency: 'IDR' },
    { channel: 'DISCOGS', feePct: 0.11, rounding: 'NEAREST_1000', currency: 'USD' },
  ];
  for (const c of channelDefaults) {
    await prisma.channelPricingConfig.upsert({
      where: { channel: c.channel },
      update: { feePct: c.feePct, rounding: c.rounding, currency: c.currency },
      create: { channel: c.channel, feePct: c.feePct, rounding: c.rounding, currency: c.currency },
    });
  }
  console.log(`✓ Seeded ChannelPricingConfig (${channelDefaults.length} channels)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
