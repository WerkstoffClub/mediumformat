import { MatchService } from './match.service';
import { RecordFormat } from '@prisma/client';

function makePrismaMock(overrides: {
  findFirst?: jest.Mock;
  findMany?: jest.Mock;
} = {}) {
  return {
    release: {
      findFirst: overrides.findFirst ?? jest.fn(async () => null),
      findMany: overrides.findMany ?? jest.fn(async () => []),
    },
  };
}

const baseLine = {
  artist: 'Boards of Canada',
  title: 'Music Has the Right to Children',
  format: RecordFormat.TWO_LP,
};

describe('MatchService.matchLine', () => {
  test('barcode hit resolves to MATCHED without falling through to fuzzy search', async () => {
    const findFirst = jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.barcode) return { id: 'rel1' };
      return null;
    });
    const findMany = jest.fn(async () => { throw new Error('should not reach fuzzy search'); });
    const prisma = makePrismaMock({ findFirst, findMany });
    const svc = new MatchService(prisma as never);

    const result = await svc.matchLine({ ...baseLine, barcode: '0123456789' });

    expect(result).toEqual({ releaseId: 'rel1', matchStatus: 'MATCHED' });
    expect(findMany).not.toHaveBeenCalled();
  });

  test('discogsId hit resolves to MATCHED when no barcode is present', async () => {
    const findFirst = jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.discogsId === 'd123') return { id: 'rel2' };
      return null;
    });
    const prisma = makePrismaMock({ findFirst });
    const svc = new MatchService(prisma as never);

    const result = await svc.matchLine({ ...baseLine, discogsId: 'd123' });

    expect(result).toEqual({ releaseId: 'rel2', matchStatus: 'MATCHED' });
  });

  test('catNumber+format single hit resolves to MATCHED', async () => {
    const findMany = jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.catNumber === 'WARPLP240') return [{ id: 'rel3' }];
      return [];
    });
    const prisma = makePrismaMock({ findMany });
    const svc = new MatchService(prisma as never);

    const result = await svc.matchLine({ ...baseLine, catNumber: 'WARPLP240' });

    expect(result).toEqual({ releaseId: 'rel3', matchStatus: 'MATCHED' });
  });

  test('catNumber+format multiple hits resolves to AMBIGUOUS', async () => {
    const findMany = jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.catNumber === 'WARPLP240') return [{ id: 'rel3' }, { id: 'rel4' }];
      return [];
    });
    const prisma = makePrismaMock({ findMany });
    const svc = new MatchService(prisma as never);

    const result = await svc.matchLine({ ...baseLine, catNumber: 'WARPLP240' });

    expect(result).toEqual({ releaseId: null, matchStatus: 'AMBIGUOUS' });
  });

  test('fuzzy artist/title match with a single hit resolves to MATCHED', async () => {
    const findMany = jest.fn(async () => [{ id: 'rel5' }]);
    const prisma = makePrismaMock({ findMany });
    const svc = new MatchService(prisma as never);

    const result = await svc.matchLine(baseLine);

    expect(result).toEqual({ releaseId: 'rel5', matchStatus: 'MATCHED' });
  });

  test('fuzzy artist/title match with multiple hits resolves to AMBIGUOUS', async () => {
    const findMany = jest.fn(async () => [{ id: 'rel5' }, { id: 'rel6' }]);
    const prisma = makePrismaMock({ findMany });
    const svc = new MatchService(prisma as never);

    const result = await svc.matchLine(baseLine);

    expect(result).toEqual({ releaseId: null, matchStatus: 'AMBIGUOUS' });
  });

  test('no hits at all resolves to NEW', async () => {
    const prisma = makePrismaMock();
    const svc = new MatchService(prisma as never);

    const result = await svc.matchLine(baseLine);

    expect(result).toEqual({ releaseId: null, matchStatus: 'NEW' });
  });
});
