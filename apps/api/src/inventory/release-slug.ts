import { Prisma, PrismaClient } from '@prisma/client';

type SlugClient = Pick<PrismaClient, 'release'> | Prisma.TransactionClient;

/** Internal shop batch code in titles, e.g. "(10.26/AMI/P23)" — not part of a public URL. */
const BATCH_CODE = /\(\d{2}\.\d{2}\/[A-Za-z]+\/P\d+\)/g;

/** Storefront URL slug for a release: artist + title + format (matches the 2026-11-13 backfill). */
export function baseReleaseSlug(r: { artist: string; title: string; format: string }): string {
  return `${r.artist} ${r.title} ${r.format}`
    .replace(BATCH_CODE, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Give every release without a slug a unique one (suffix -2, -3… on collision).
 * Called after any path that creates releases (back-office, DealPOS sync, imports),
 * so the storefront can always link to /releases/:slug.
 * ponytail: loads all existing slugs into memory — fine for thousands of rows,
 * switch to per-base `startsWith` lookups if the catalogue grows past ~100k.
 */
export async function assignMissingReleaseSlugs(prisma: SlugClient): Promise<number> {
  const missing = await prisma.release.findMany({
    where: { slug: null },
    select: { id: true, artist: true, title: true, format: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  if (missing.length === 0) return 0;

  const taken = new Set(
    (await prisma.release.findMany({ where: { slug: { not: null } }, select: { slug: true } })).map(r => r.slug),
  );
  for (const r of missing) {
    const base = baseReleaseSlug(r) || r.id;
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    taken.add(slug);
    await prisma.release.update({ where: { id: r.id }, data: { slug } });
  }
  return missing.length;
}
