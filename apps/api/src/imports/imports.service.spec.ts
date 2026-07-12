import { ImportsService } from './imports.service';
import { ImportOrigin, ImportStatus, PaymentMethod, RecordFormat, ReimbursementStatus } from '@prisma/client';
import { CreateImportDto } from './dto/create-import.dto';

/** create()/findOne() don't touch FxService/MatchService/DiscogsService; plain
 *  stubs are enough to satisfy the constructor for those suites. price() and
 *  commit()/match() suites build their own where they need real behavior. */
const fxStub = { getRate: jest.fn(), getUsdIdr: jest.fn() };
const matcherStub = { matchLine: jest.fn() };
const discogsStub = { lookup: jest.fn() };

/** Minimal in-memory prisma stub covering the calls create()/findOne() make:
 *  importOrder.count, importOrder.create, importOrder.findUnique. */
function makePrismaMock(existingCount = 0) {
  let created: unknown = null;
  const prisma = {
    importOrder: {
      count: jest.fn(async () => existingCount),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        created = { id: 'imp1', ...data, lines: (data.lines as { create: unknown[] })?.create ?? [] };
        return created;
      }),
      findUnique: jest.fn(async () => null),
    },
  };
  return { prisma, getCreated: () => created };
}

function baseDto(overrides: Partial<CreateImportDto> = {}): CreateImportDto {
  return {
    vendorName: 'Juno Records',
    origin: ImportOrigin.INTERNATIONAL,
    currency: 'USD',
    orderDate: '2026-07-01T00:00:00.000Z',
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    lines: [
      {
        artist: 'Boards of Canada',
        title: 'Music Has the Right to Children',
        formatRaw: '2xLP',
        format: RecordFormat.TWO_LP,
        qty: 2,
        unitPriceNative: 20,
        extendedNative: 40,
      },
      {
        artist: 'Aphex Twin',
        title: 'Selected Ambient Works 85-92',
        formatRaw: 'LP',
        format: RecordFormat.LP,
        qty: 1,
        unitPriceNative: 15.5,
        extendedNative: 15.5,
      },
    ],
    ...overrides,
  };
}

describe('ImportsService.create', () => {
  test('generates a zero-padded sequential number from existing count', async () => {
    const { prisma, getCreated } = makePrismaMock(4);
    const svc = new ImportsService(prisma as never, fxStub as never, matcherStub as never, discogsStub as never);
    await svc.create(baseDto());
    const data = (prisma.importOrder.create.mock.calls[0][0] as { data: { number: string } }).data;
    expect(data.number).toBe('MF-I005');
    expect(getCreated()).toBeTruthy();
  });

  test('pads to at least 3 digits for the first import', async () => {
    const { prisma } = makePrismaMock(0);
    const svc = new ImportsService(prisma as never, fxStub as never, matcherStub as never, discogsStub as never);
    await svc.create(baseDto());
    const data = (prisma.importOrder.create.mock.calls[0][0] as { data: { number: string } }).data;
    expect(data.number).toBe('MF-I001');
  });

  test('sums line extendedNative into subtotalNative', async () => {
    const { prisma } = makePrismaMock(0);
    const svc = new ImportsService(prisma as never, fxStub as never, matcherStub as never, discogsStub as never);
    await svc.create(baseDto());
    const data = (prisma.importOrder.create.mock.calls[0][0] as { data: { subtotalNative: number } }).data;
    expect(data.subtotalNative).toBe(55.5);
  });

  test('CREDIT_CARD payment method derives PENDING reimbursement status', async () => {
    const { prisma } = makePrismaMock(0);
    const svc = new ImportsService(prisma as never, fxStub as never, matcherStub as never, discogsStub as never);
    await svc.create(baseDto({ paymentMethod: PaymentMethod.CREDIT_CARD }));
    const data = (prisma.importOrder.create.mock.calls[0][0] as { data: { reimbursementStatus: ReimbursementStatus } }).data;
    expect(data.reimbursementStatus).toBe(ReimbursementStatus.PENDING);
  });

  test('non-credit-card payment methods derive NOT_REQUIRED reimbursement status', async () => {
    const { prisma } = makePrismaMock(0);
    const svc = new ImportsService(prisma as never, fxStub as never, matcherStub as never, discogsStub as never);
    await svc.create(baseDto({ paymentMethod: PaymentMethod.BANK_TRANSFER }));
    const data = (prisma.importOrder.create.mock.calls[0][0] as { data: { reimbursementStatus: ReimbursementStatus } }).data;
    expect(data.reimbursementStatus).toBe(ReimbursementStatus.NOT_REQUIRED);
  });

  test('new imports are created with status SUBMITTED', async () => {
    const { prisma } = makePrismaMock(0);
    const svc = new ImportsService(prisma as never, fxStub as never, matcherStub as never, discogsStub as never);
    await svc.create(baseDto());
    const data = (prisma.importOrder.create.mock.calls[0][0] as { data: { status: ImportStatus } }).data;
    expect(data.status).toBe(ImportStatus.SUBMITTED);
  });

  test('assigns sequential lineNo starting at 1', async () => {
    const { prisma } = makePrismaMock(0);
    const svc = new ImportsService(prisma as never, fxStub as never, matcherStub as never, discogsStub as never);
    await svc.create(baseDto());
    const data = (prisma.importOrder.create.mock.calls[0][0] as { data: { lines: { create: Array<{ lineNo: number }> } } }).data;
    expect(data.lines.create.map(l => l.lineNo)).toEqual([1, 2]);
  });
});

describe('ImportsService.findOne', () => {
  test('throws NotFoundException when the import order does not exist', async () => {
    const { prisma } = makePrismaMock(0);
    const svc = new ImportsService(prisma as never, fxStub as never, matcherStub as never, discogsStub as never);
    await expect(svc.findOne('missing')).rejects.toThrow(/not found/i);
  });
});

interface PriceMockOverrides {
  fxRateManual?: boolean;
  fxRate?: number;
  currency?: string;
  overriddenChannels?: Array<{ lineItemId: string; channel: string }>;
}

/** Builds a prisma stub for price(): an order with two lines of different
 *  weight/qty, two active channel configs (one IDR, one USD), and a
 *  transaction stub that records every write so assertions can inspect the
 *  full orchestration (fx resolution, allocation, landed cost, upserts). */
function makePriceMock(overrides: PriceMockOverrides = {}) {
  const order = {
    id: 'imp1',
    currency: overrides.currency ?? 'USD',
    orderDate: new Date('2026-07-01T00:00:00.000Z'),
    fxRate: overrides.fxRate ?? 1,
    fxRateSource: null as string | null,
    fxRateManual: overrides.fxRateManual ?? false,
    vendorShippingNative: 100,
    lines: [
      { id: 'line1', lineNo: 1, unitPriceNative: 20, weightKg: 1, qty: 2, allocatedForwarderIdr: 0 },
      { id: 'line2', lineNo: 2, unitPriceNative: 10, weightKg: 3, qty: 1, allocatedForwarderIdr: 0 },
    ],
    attachments: [],
    consolidation: null,
  };

  const channelConfigs = [
    { channel: 'WEBSITE', feePct: 0, rounding: 'NEAREST_1000', currency: 'IDR', active: true },
    { channel: 'DISCOGS', feePct: 0.10, rounding: 'NEAREST_1000', currency: 'USD', active: true },
  ];

  const txCalls = {
    lineUpdates: [] as Array<{ id: string; allocatedVendorShipIdr: number; landedCostIdr: number }>,
    priceUpserts: [] as Array<{ where: { lineItemId_channel: { lineItemId: string; channel: string } }; create: Record<string, unknown> }>,
    orderUpdates: [] as Array<Record<string, unknown>>,
  };

  const tx = {
    importOrder: {
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        txCalls.orderUpdates.push(data);
        return { ...order, ...data };
      }),
    },
    importOrderLine: {
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        txCalls.lineUpdates.push({ id: where.id, ...data } as never);
        return { id: where.id, ...data };
      }),
    },
    importLineChannelPrice: {
      upsert: jest.fn(async (args: { where: never; create: Record<string, unknown> }) => {
        txCalls.priceUpserts.push(args as never);
        return args.create;
      }),
    },
  };

  const prisma = {
    importOrder: {
      findUnique: jest.fn(async () => order),
    },
    channelPricingConfig: {
      findMany: jest.fn(async () => channelConfigs),
    },
    importLineChannelPrice: {
      findMany: jest.fn(async () => overrides.overriddenChannels ?? []),
    },
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(tx)),
  };

  return { prisma, tx, order, txCalls };
}

describe('ImportsService.price', () => {
  test('throws NotFoundException when the import order does not exist', async () => {
    const fx = { getRate: jest.fn(), getUsdIdr: jest.fn(async () => 15000) };
    const prisma = { importOrder: { findUnique: jest.fn(async () => null) } };
    const svc = new ImportsService(prisma as never, fx as never, matcherStub as never, discogsStub as never);
    await expect(svc.price('missing')).rejects.toThrow(/not found/i);
  });

  test('resolves FX via FxService when not manual and fxRate is still the default', async () => {
    const { prisma, tx, txCalls } = makePriceMock({ fxRateManual: false, fxRate: 1 });
    const fx = {
      getRate: jest.fn(async () => ({ rate: 15000, source: 'frankfurter:2026-06-30' })),
      getUsdIdr: jest.fn(async () => 15000),
    };
    const svc = new ImportsService(prisma as never, fx as never, matcherStub as never, discogsStub as never);
    await svc.price('imp1');

    expect(fx.getRate).toHaveBeenCalledWith('USD', '2026-07-01');
    expect(fx.getUsdIdr).toHaveBeenCalledWith('2026-07-01');
    // fxRate+fxRateSource update, then the final status update
    expect(txCalls.orderUpdates[0]).toMatchObject({ fxRate: 15000, fxRateSource: 'frankfurter:2026-06-30' });
    expect(tx.importOrder.update).toHaveBeenCalled();
  });

  test('keeps a manual fxRate as-is and does not call getRate', async () => {
    const { prisma, txCalls } = makePriceMock({ fxRateManual: true, fxRate: 3 });
    const fx = { getRate: jest.fn(), getUsdIdr: jest.fn(async () => 15000) };
    const svc = new ImportsService(prisma as never, fx as never, matcherStub as never, discogsStub as never);
    await svc.price('imp1');

    expect(fx.getRate).not.toHaveBeenCalled();
    // only the final status update should have happened, no fxRate write
    expect(txCalls.orderUpdates).toHaveLength(1);
    expect(txCalls.orderUpdates[0]).not.toHaveProperty('fxRate');
  });

  test('allocates vendor shipping by weight*qty and computes landed cost per line', async () => {
    const { prisma, txCalls } = makePriceMock({ fxRateManual: true, fxRate: 15000 });
    const fx = { getRate: jest.fn(), getUsdIdr: jest.fn(async () => 15000) };
    const svc = new ImportsService(prisma as never, fx as never, matcherStub as never, discogsStub as never);
    await svc.price('imp1');

    // weights: line1 = 1kg*2qty = 2, line2 = 3kg*1qty = 3 -> 40%/60% of 100*15000 = 1,500,000
    const line1 = txCalls.lineUpdates.find(l => l.id === 'line1')!;
    const line2 = txCalls.lineUpdates.find(l => l.id === 'line2')!;
    expect(line1.allocatedVendorShipIdr).toBe(600000);
    expect(line2.allocatedVendorShipIdr).toBe(900000);
    // landed = unitPrice*fx + allocatedShip/qty
    expect(line1.landedCostIdr).toBe(20 * 15000 + 600000 / 2);
    expect(line2.landedCostIdr).toBe(10 * 15000 + 900000 / 1);
  });

  test('upserts channel prices for every active config, in the channel currency', async () => {
    const { prisma, txCalls } = makePriceMock({ fxRateManual: true, fxRate: 15000 });
    const fx = { getRate: jest.fn(), getUsdIdr: jest.fn(async () => 15000) };
    const svc = new ImportsService(prisma as never, fx as never, matcherStub as never, discogsStub as never);
    await svc.price('imp1');

    expect(txCalls.priceUpserts).toHaveLength(4); // 2 lines x 2 channels
    const line1Website = txCalls.priceUpserts.find(
      u => u.where.lineItemId_channel.lineItemId === 'line1' && u.where.lineItemId_channel.channel === 'WEBSITE',
    )!;
    expect(line1Website.create.price).toBe(1320000); // landed 600000 * 2.2, exact multiple of 1000
    const line1Discogs = txCalls.priceUpserts.find(
      u => u.where.lineItemId_channel.lineItemId === 'line1' && u.where.lineItemId_channel.channel === 'DISCOGS',
    )!;
    expect(line1Discogs.create.currency).toBe('USD');
    expect(line1Discogs.create.price).toBe(98); // (600000*2.2/15000)/0.9 = 97.77 -> ceil to nearest 0.5
  });

  test('skips upserting a channel price that has been manually overridden', async () => {
    const { prisma, txCalls } = makePriceMock({
      fxRateManual: true,
      fxRate: 15000,
      overriddenChannels: [{ lineItemId: 'line1', channel: 'WEBSITE' }],
    });
    const fx = { getRate: jest.fn(), getUsdIdr: jest.fn(async () => 15000) };
    const svc = new ImportsService(prisma as never, fx as never, matcherStub as never, discogsStub as never);
    await svc.price('imp1');

    expect(txCalls.priceUpserts).toHaveLength(3); // 4 combinations minus the overridden one
    const overridden = txCalls.priceUpserts.find(
      u => u.where.lineItemId_channel.lineItemId === 'line1' && u.where.lineItemId_channel.channel === 'WEBSITE',
    );
    expect(overridden).toBeUndefined();
  });

  test('marks the order PRICED as the final write', async () => {
    const { prisma, txCalls } = makePriceMock({ fxRateManual: true, fxRate: 15000 });
    const fx = { getRate: jest.fn(), getUsdIdr: jest.fn(async () => 15000) };
    const svc = new ImportsService(prisma as never, fx as never, matcherStub as never, discogsStub as never);
    await svc.price('imp1');

    const last = txCalls.orderUpdates[txCalls.orderUpdates.length - 1];
    expect(last).toEqual({ status: ImportStatus.PRICED });
  });
});

interface CommitLineOverrides {
  id?: string;
  releaseId?: string | null;
  matchStatus?: string;
  qty?: number;
  landedCostIdr?: number;
  channelPrices?: Array<{ channel: string; currency: string; price: number }>;
  barcode?: string | null;
  catNumber?: string | null;
  label?: string | null;
}

function makeCommitLine(overrides: CommitLineOverrides = {}) {
  return {
    id: overrides.id ?? 'line1',
    lineNo: 1,
    artist: 'Boards of Canada',
    title: 'Music Has the Right to Children',
    label: overrides.label ?? 'Warp',
    catNumber: overrides.catNumber ?? 'WARPLP240',
    barcode: overrides.barcode ?? null,
    format: 'TWO_LP',
    qty: overrides.qty ?? 3,
    landedCostIdr: overrides.landedCostIdr ?? 150000,
    releaseId: overrides.releaseId ?? null,
    matchStatus: overrides.matchStatus ?? 'NEW',
    channelPrices: overrides.channelPrices ?? [
      { channel: 'WEBSITE', currency: 'IDR', price: 330000 },
    ],
  };
}

/** Builds a prisma stub for commit(): an ImportOrder with the given lines and
 *  a $transaction stub that records every write against a fake tx client so
 *  assertions can inspect Release create/update, channel-price upserts, and
 *  line persistence without touching a real database. */
function makeCommitMock(opts: { status?: string; lines: ReturnType<typeof makeCommitLine>[]; createThrows?: unknown }) {
  const order = { id: 'imp1', status: opts.status ?? 'PRICED', lines: opts.lines };

  const txCalls = {
    releaseUpdates: [] as Array<{ id: string; data: Record<string, unknown> }>,
    releaseCreates: [] as Array<Record<string, unknown>>,
    channelPriceUpserts: [] as Array<{ where: unknown; create: Record<string, unknown> }>,
    lineUpdates: [] as Array<{ id: string; data: Record<string, unknown> }>,
    orderUpdates: [] as Array<Record<string, unknown>>,
  };

  let nextReleaseId = 100;
  const tx = {
    release: {
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        txCalls.releaseUpdates.push({ id: where.id, data });
        return { id: where.id, ...data };
      }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (opts.createThrows) throw opts.createThrows;
        txCalls.releaseCreates.push(data);
        const id = `rel${nextReleaseId++}`;
        return { id, ...data };
      }),
      findFirst: jest.fn(async () => ({ id: 'relExisting' })),
    },
    releaseChannelPrice: {
      upsert: jest.fn(async (args: { where: unknown; create: Record<string, unknown> }) => {
        txCalls.channelPriceUpserts.push(args);
        return args.create;
      }),
    },
    importOrderLine: {
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        txCalls.lineUpdates.push({ id: where.id, data });
        return { id: where.id, ...data };
      }),
    },
    importOrder: {
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        txCalls.orderUpdates.push(data);
        return { ...order, ...data };
      }),
    },
  };

  const prisma = {
    importOrder: {
      findUnique: jest.fn(async () => order),
    },
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(tx)),
  };

  return { prisma, tx, order, txCalls };
}

describe('ImportsService.commit', () => {
  test('throws BadRequestException when the import is not yet PRICED', async () => {
    const { prisma } = makeCommitMock({ status: 'SUBMITTED', lines: [makeCommitLine()] });
    const svc = new ImportsService(prisma as never, {} as never, matcherStub as never, discogsStub as never);
    await expect(svc.commit('imp1')).rejects.toThrow(/priced/i);
  });

  test('throws NotFoundException when the import order does not exist', async () => {
    const prisma = { importOrder: { findUnique: jest.fn(async () => null) } };
    const svc = new ImportsService(prisma as never, {} as never, matcherStub as never, discogsStub as never);
    await expect(svc.commit('missing')).rejects.toThrow(/not found/i);
  });

  test('MATCHED line increments existing Release stock/cost/price and upserts channel prices', async () => {
    const line = makeCommitLine({
      id: 'line1',
      releaseId: 'rel1',
      matchStatus: 'MATCHED',
      qty: 3,
      landedCostIdr: 150000,
      channelPrices: [
        { channel: 'WEBSITE', currency: 'IDR', price: 330000 },
        { channel: 'DISCOGS', currency: 'USD', price: 22 },
      ],
    });
    const { prisma, txCalls } = makeCommitMock({ lines: [line] });
    const matcher = { matchLine: jest.fn() };
    const svc = new ImportsService(prisma as never, {} as never, matcher as never, discogsStub as never);

    const result = await svc.commit('imp1');

    expect(matcher.matchLine).not.toHaveBeenCalled();
    expect(txCalls.releaseUpdates).toHaveLength(1);
    expect(txCalls.releaseUpdates[0]).toEqual({
      id: 'rel1',
      data: { stock: { increment: 3 }, costIdr: 150000, priceIdr: 330000 },
    });
    expect(txCalls.channelPriceUpserts).toHaveLength(2);
    expect(txCalls.channelPriceUpserts.every(
      u => (u.where as { releaseId_channel: { releaseId: string } }).releaseId_channel.releaseId === 'rel1',
    )).toBe(true);
    const lineUpdate = txCalls.lineUpdates.find(u => u.id === 'line1')!;
    expect(lineUpdate.data).toEqual({ releaseId: 'rel1', matchStatus: 'MATCHED', createdRelease: false });
    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
  });

  test('NEW line creates a draft Release (condition M, priceIdr from WEBSITE) and sets createdRelease', async () => {
    const line = makeCommitLine({
      id: 'line2',
      releaseId: null,
      matchStatus: 'NEW',
      qty: 2,
      landedCostIdr: 100000,
      barcode: '0724386642211',
      channelPrices: [{ channel: 'WEBSITE', currency: 'IDR', price: 220000 }],
    });
    const { prisma, txCalls } = makeCommitMock({ lines: [line] });
    const matcher = { matchLine: jest.fn(async () => ({ releaseId: null, matchStatus: 'NEW' })) };
    const discogs = { lookup: jest.fn(async () => null) };
    const svc = new ImportsService(prisma as never, {} as never, matcher as never, discogs as never);

    const result = await svc.commit('imp1');

    expect(matcher.matchLine).toHaveBeenCalledTimes(1);
    expect(txCalls.releaseCreates).toHaveLength(1);
    expect(txCalls.releaseCreates[0]).toMatchObject({
      artist: 'Boards of Canada',
      title: 'Music Has the Right to Children',
      label: 'Warp',
      catNumber: 'WARPLP240',
      barcode: '0724386642211',
      format: 'TWO_LP',
      condition: 'M',
      priceIdr: 220000,
      stock: 2,
      costIdr: 100000,
    });
    const lineUpdate = txCalls.lineUpdates.find(u => u.id === 'line2')!;
    expect(lineUpdate.data).toMatchObject({ matchStatus: 'NEW', createdRelease: true });
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
  });

  test('falls back to updating the existing Release on a P2002 unique-constraint conflict', async () => {
    const line = makeCommitLine({
      id: 'line3',
      releaseId: null,
      matchStatus: 'NEW',
      qty: 1,
      landedCostIdr: 90000,
      barcode: '0724386642211',
      channelPrices: [{ channel: 'WEBSITE', currency: 'IDR', price: 200000 }],
    });
    const conflict = { code: 'P2002', meta: { target: ['barcode'] } };
    const { prisma, txCalls } = makeCommitMock({ lines: [line], createThrows: conflict });
    const matcher = { matchLine: jest.fn(async () => ({ releaseId: null, matchStatus: 'NEW' })) };
    const discogs = { lookup: jest.fn(async () => null) };
    const svc = new ImportsService(prisma as never, {} as never, matcher as never, discogs as never);

    const result = await svc.commit('imp1');

    expect(txCalls.releaseUpdates).toHaveLength(1);
    expect(txCalls.releaseUpdates[0].id).toBe('relExisting');
    const lineUpdate = txCalls.lineUpdates.find(u => u.id === 'line3')!;
    expect(lineUpdate.data).toEqual({ releaseId: 'relExisting', matchStatus: 'MATCHED', createdRelease: false });
    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
  });

  test('sets the import order status to INVENTORY_UPDATED as the final write', async () => {
    const line = makeCommitLine({ matchStatus: 'MATCHED', releaseId: 'rel1' });
    const { prisma, txCalls } = makeCommitMock({ lines: [line] });
    const svc = new ImportsService(prisma as never, {} as never, matcherStub as never, discogsStub as never);

    await svc.commit('imp1');

    const last = txCalls.orderUpdates[txCalls.orderUpdates.length - 1];
    expect(last).toEqual({ status: 'INVENTORY_UPDATED' });
  });
});

describe('ImportsService.match', () => {
  test('persists matchLine results for every line without touching inventory', async () => {
    const order = {
      id: 'imp1',
      lines: [
        { id: 'line1', artist: 'A', title: 'B', format: 'LP', barcode: null, catNumber: null, discogsId: null },
      ],
    };
    const prisma = {
      importOrder: {
        findUnique: jest.fn(async () => order),
      },
      importOrderLine: {
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => (
          { id: where.id, ...data }
        )),
      },
    };
    const matcher = { matchLine: jest.fn(async () => ({ releaseId: 'rel9', matchStatus: 'MATCHED' })) };

    // findOne() is called at the end of match(); stub it out via a second findUnique shape.
    const findOneOrder = { ...order, attachments: [], consolidation: null };
    (prisma.importOrder.findUnique as jest.Mock)
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce(findOneOrder);

    const svc = new ImportsService(prisma as never, {} as never, matcher as never, discogsStub as never);
    await svc.match('imp1');

    expect(matcher.matchLine).toHaveBeenCalledTimes(1);
    expect(prisma.importOrderLine.update).toHaveBeenCalledWith({
      where: { id: 'line1' },
      data: { releaseId: 'rel9', matchStatus: 'MATCHED' },
    });
  });
});
