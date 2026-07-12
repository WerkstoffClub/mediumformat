import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedAdmin() {
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

async function seedCategoryPages() {
  const total = await prisma.categoryPage.count();
  if (total > 0) {
    console.log(`✓ Category pages already seeded (${total} rows), skipping.`);
    return;
  }

  const now = new Date();

  await prisma.categoryPage.createMany({
    data: [
      {
        slug: 'lps',
        title: 'LPs',
        formatFilter: 'LP',
        template: 'FULL_HERO',
        kicker: 'FULL LENGTHS',
        headline: 'The album, on vinyl.',
        salesCopy:
          "Twelve-inch records built to be listened to end-to-end — the format the shop was made for. New pressings, rare originals, and the ones we can't stop playing at the counter, all filed under one roof in Kemang.",
        ctaLabel: 'Browse LPs',
        ctaHref: '/pages/lps',
        seoTitle: 'LPs — Medium Format',
        seoDescription:
          'A curated selection of long-play vinyl records at Medium Format, Jakarta.',
        status: 'PUBLISHED',
        publishedAt: now,
      },
      {
        slug: 'cassettes',
        title: 'Cassettes',
        formatFilter: 'CASSETTE',
        template: 'HALF_HERO',
        kicker: 'HI-FI TAPE',
        headline: 'The tape underground, curated.',
        salesCopy:
          'Cassettes never really left — they became the format small labels reach for when a record is too expensive and a stream is too weightless. Limited runs, hand-dubbed editions, and reissues you can hold in one hand and rewind with a pencil.',
        ctaLabel: 'Browse cassettes',
        ctaHref: '/pages/cassettes',
        seoTitle: 'Cassettes — Medium Format',
        seoDescription:
          'Small-label cassette editions and reissues from around the world, at Medium Format, Jakarta.',
        status: 'PUBLISHED',
        publishedAt: now,
      },
    ],
  });

  console.log('✓ Seeded 2 example category pages: /pages/lps, /pages/cassettes');
}

async function seedNewsCategories() {
  const now = new Date();
  const cats: Array<{
    slug: string;
    title: string;
    newsCategoryKey: 'STAFF_PICKS' | 'HIGHLIGHTS' | 'NEWS' | 'INTERVIEW';
    kicker: string;
    headline: string;
    salesCopy: string;
  }> = [
    {
      slug: 'staff-picks',
      title: 'Staff Picks',
      newsCategoryKey: 'STAFF_PICKS',
      kicker: 'FROM THE COUNTER',
      headline: 'What we can’t stop playing.',
      salesCopy:
        'The records and tapes the shop keeps reaching for — chosen by the people who file them.',
    },
    {
      slug: 'highlights',
      title: 'Highlights',
      newsCategoryKey: 'HIGHLIGHTS',
      kicker: 'THIS WEEK',
      headline: 'On the wall, right now.',
      salesCopy: 'New arrivals and the pressings we want you to hear first.',
    },
    {
      slug: 'news',
      title: 'News',
      newsCategoryKey: 'NEWS',
      kicker: 'DISPATCHES',
      headline: 'From the shop and the labels we love.',
      salesCopy: 'Restocks, events, and word from the wider record community.',
    },
    {
      slug: 'interview',
      title: 'Interview',
      newsCategoryKey: 'INTERVIEW',
      kicker: 'IN CONVERSATION',
      headline: 'The people behind the records.',
      salesCopy: 'Artists, labels, and collectors, in their own words.',
    },
  ];

  for (const c of cats) {
    await prisma.categoryPage.upsert({
      where: { slug: c.slug },
      update: {}, // never clobber edits made in the CMS
      create: {
        slug: c.slug,
        title: c.title,
        kind: 'NEWS_CATEGORY',
        newsCategoryKey: c.newsCategoryKey,
        template: 'HALF_HERO',
        kicker: c.kicker,
        headline: c.headline,
        salesCopy: c.salesCopy,
        status: 'PUBLISHED',
        publishedAt: now,
      },
    });
  }

  console.log('✓ Seeded/verified 4 news categories (staff-picks, highlights, news, interview)');
}

async function main() {
  await seedAdmin();
  await seedCategoryPages();
  await seedNewsCategories();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
