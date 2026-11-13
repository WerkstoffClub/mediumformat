import { assignMissingReleaseSlugs, baseReleaseSlug } from './release-slug';

describe('baseReleaseSlug', () => {
  it('joins artist, title and format into a lowercase slug', () => {
    expect(baseReleaseSlug({ artist: 'Kendrick Lamar', title: 'GNX', format: 'LP' })).toBe('kendrick-lamar-gnx-lp');
  });

  it('drops the internal (MM.YY/XXX/Pnn) batch code but keeps other parentheticals', () => {
    expect(
      baseReleaseSlug({ artist: 'Andrea Bocelli', title: 'Romanza (30th Anniversary) (10.26/AMI/P23)', format: 'CD' }),
    ).toBe('andrea-bocelli-romanza-30th-anniversary-cd');
  });

  it('collapses punctuation and trims dashes', () => {
    expect(baseReleaseSlug({ artist: '.Feast', title: "More ('Theresa' Green Vinyl LP)", format: 'LP' })).toBe(
      'feast-more-theresa-green-vinyl-lp-lp',
    );
  });
});

describe('assignMissingReleaseSlugs', () => {
  const fakePrisma = (rows: Array<{ id: string; artist: string; title: string; format: string; slug: string | null }>) => {
    const updates: Array<{ id: string; slug: string }> = [];
    return {
      updates,
      release: {
        findMany: jest.fn(async ({ where }: { where: { slug: null | { not: null } } }) =>
          where.slug === null
            ? rows.filter(r => r.slug === null)
            : rows.filter(r => r.slug !== null).map(r => ({ slug: r.slug })),
        ),
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: { slug: string } }) => {
          updates.push({ id: where.id, slug: data.slug });
        }),
      },
    };
  };

  it('fills only missing slugs and suffixes collisions with existing and new rows', async () => {
    const prisma = fakePrisma([
      { id: 'a', artist: 'Geese', title: 'Getting Killed', format: 'LP', slug: 'geese-getting-killed-lp' },
      { id: 'b', artist: 'Geese', title: 'Getting Killed', format: 'LP', slug: null },
      { id: 'c', artist: 'Geese', title: 'Getting Killed', format: 'LP', slug: null },
      { id: 'd', artist: 'Geese', title: 'Getting Killed', format: 'CD', slug: null },
    ]);

    const count = await assignMissingReleaseSlugs(prisma as never);

    expect(count).toBe(3);
    expect(prisma.updates).toEqual([
      { id: 'b', slug: 'geese-getting-killed-lp-2' },
      { id: 'c', slug: 'geese-getting-killed-lp-3' },
      { id: 'd', slug: 'geese-getting-killed-cd' },
    ]);
  });

  it('does nothing when every release already has a slug', async () => {
    const prisma = fakePrisma([{ id: 'a', artist: 'Geese', title: 'X', format: 'LP', slug: 'geese-x-lp' }]);
    expect(await assignMissingReleaseSlugs(prisma as never)).toBe(0);
    expect(prisma.release.update).not.toHaveBeenCalled();
  });
});
