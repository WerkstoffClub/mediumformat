import { ConsolidationsService } from './consolidations.service';
import { ImportOrigin, ImportStatus } from '@prisma/client';
import { CreateConsolidationDto } from './dto/create-consolidation.dto';

/** create()/attachOrder()/allocate()/detachOrder() never call price() on
 *  create/attach/detach — only allocate() does, once per attached order. */
function makeImportsStub() {
  return { price: jest.fn(async () => ({})) };
}

describe('ConsolidationsService.create', () => {
  test('generates a zero-padded sequential number from existing count', async () => {
    const prisma = {
      importConsolidation: {
        count: jest.fn(async () => 2),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'c1', ...data })),
      },
    };
    const svc = new ConsolidationsService(prisma as never, makeImportsStub() as never);
    const dto: CreateConsolidationDto = { forwarderName: 'DHL Express' };

    const result = await svc.create(dto);

    const data = (prisma.importConsolidation.create.mock.calls[0][0] as { data: { number: string } }).data;
    expect(data.number).toBe('MF-C003');
    expect(result).toMatchObject({ number: 'MF-C003', status: 'open', forwarderName: 'DHL Express' });
  });

  test('pads to at least 3 digits for the first consolidation', async () => {
    const prisma = {
      importConsolidation: {
        count: jest.fn(async () => 0),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'c1', ...data })),
      },
    };
    const svc = new ConsolidationsService(prisma as never, makeImportsStub() as never);

    await svc.create({ forwarderName: 'DHL Express' });

    const data = (prisma.importConsolidation.create.mock.calls[0][0] as { data: { number: string } }).data;
    expect(data.number).toBe('MF-C001');
  });
});

describe('ConsolidationsService.attachOrder', () => {
  function makePrisma(order: Record<string, unknown> | null) {
    return {
      importConsolidation: {
        findUnique: jest.fn(async () => ({ id: 'c1' })),
      },
      importOrder: {
        findUnique: jest.fn(async () => order),
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => (
          { id: where.id, ...data }
        )),
      },
    };
  }

  test('rejects a DOMESTIC order', async () => {
    const prisma = makePrisma({
      id: 'o1', origin: ImportOrigin.DOMESTIC, consolidationId: null, status: ImportStatus.SUBMITTED,
    });
    const svc = new ConsolidationsService(prisma as never, makeImportsStub() as never);

    await expect(svc.attachOrder('c1', 'o1')).rejects.toThrow(/only international orders/i);
    expect(prisma.importOrder.update).not.toHaveBeenCalled();
  });

  test('rejects an order already attached to a different consolidation', async () => {
    const prisma = makePrisma({
      id: 'o1', origin: ImportOrigin.INTERNATIONAL, consolidationId: 'c2', status: ImportStatus.SUBMITTED,
    });
    const svc = new ConsolidationsService(prisma as never, makeImportsStub() as never);

    await expect(svc.attachOrder('c1', 'o1')).rejects.toThrow(/already in another consolidation/i);
    expect(prisma.importOrder.update).not.toHaveBeenCalled();
  });

  test('allows re-attaching an order already in this same consolidation', async () => {
    const prisma = makePrisma({
      id: 'o1', origin: ImportOrigin.INTERNATIONAL, consolidationId: 'c1', status: ImportStatus.SUBMITTED,
    });
    const svc = new ConsolidationsService(prisma as never, makeImportsStub() as never);
    jest.spyOn(svc, 'findOne').mockResolvedValue({ id: 'c1' } as never);

    await svc.attachOrder('c1', 'o1');

    expect(prisma.importOrder.update).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { consolidationId: 'c1', status: ImportStatus.CONSOLIDATED },
    });
  });

  test('advances a SUBMITTED order to CONSOLIDATED and attaches it', async () => {
    const prisma = makePrisma({
      id: 'o1', origin: ImportOrigin.INTERNATIONAL, consolidationId: null, status: ImportStatus.SUBMITTED,
    });
    const svc = new ConsolidationsService(prisma as never, makeImportsStub() as never);
    jest.spyOn(svc, 'findOne').mockResolvedValue({ id: 'c1' } as never);

    await svc.attachOrder('c1', 'o1');

    expect(prisma.importOrder.update).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { consolidationId: 'c1', status: ImportStatus.CONSOLIDATED },
    });
  });

  test('does not change the status of an order already past SUBMITTED', async () => {
    const prisma = makePrisma({
      id: 'o1', origin: ImportOrigin.INTERNATIONAL, consolidationId: null, status: ImportStatus.PRICED,
    });
    const svc = new ConsolidationsService(prisma as never, makeImportsStub() as never);
    jest.spyOn(svc, 'findOne').mockResolvedValue({ id: 'c1' } as never);

    await svc.attachOrder('c1', 'o1');

    expect(prisma.importOrder.update).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { consolidationId: 'c1' },
    });
  });
});

describe('ConsolidationsService.allocate', () => {
  /** Two attached orders, one line each, weights 2 and 3 (weightKg*qty) so
   *  the 1,500,000 forwarder invoice should split 40%/60% -> 600,000/900,000. */
  function makeAllocateMock(forwarderInvoiceIdr = 1500000) {
    const consolidation = {
      id: 'c1',
      forwarderInvoiceIdr,
      orders: [
        { id: 'o1', status: ImportStatus.SUBMITTED, lines: [{ id: 'line1', weightKg: 1, qty: 2 }] },
        { id: 'o2', status: ImportStatus.SUBMITTED, lines: [{ id: 'line2', weightKg: 3, qty: 1 }] },
      ],
    };

    const txCalls = {
      lineUpdates: [] as Array<{ id: string; allocatedForwarderIdr: number }>,
      consolidationUpdates: [] as Array<Record<string, unknown>>,
      orderUpdates: [] as Array<{ id: string; data: Record<string, unknown> }>,
    };

    const tx = {
      importOrderLine: {
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          txCalls.lineUpdates.push({ id: where.id, allocatedForwarderIdr: data.allocatedForwarderIdr as number });
          return { id: where.id, ...data };
        }),
      },
      importConsolidation: {
        update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          txCalls.consolidationUpdates.push(data);
          return { ...consolidation, ...data };
        }),
      },
      importOrder: {
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          txCalls.orderUpdates.push({ id: where.id, data });
          return { id: where.id, ...data };
        }),
      },
    };

    const prisma = {
      importConsolidation: {
        findUnique: jest.fn(async () => consolidation),
      },
      $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(tx)),
    };

    return { prisma, tx, consolidation, txCalls };
  }

  test('splits freight proportional to weight*qty; per-line shares sum to the invoice total', async () => {
    const { prisma, txCalls } = makeAllocateMock(1500000);
    const svc = new ConsolidationsService(prisma as never, makeImportsStub() as never);
    jest.spyOn(svc, 'findOne').mockResolvedValue({ id: 'c1' } as never);

    await svc.allocate('c1');

    const line1 = txCalls.lineUpdates.find(l => l.id === 'line1')!;
    const line2 = txCalls.lineUpdates.find(l => l.id === 'line2')!;
    // weights: line1 = 1kg*2qty = 2, line2 = 3kg*1qty = 3 -> 40%/60% of 1,500,000
    expect(line1.allocatedForwarderIdr).toBe(600000);
    expect(line2.allocatedForwarderIdr).toBe(900000);
    expect(line1.allocatedForwarderIdr + line2.allocatedForwarderIdr).toBe(1500000);
  });

  test('sets consolidation status to allocated and totals weightKgTotal', async () => {
    const { prisma, txCalls } = makeAllocateMock(1500000);
    const svc = new ConsolidationsService(prisma as never, makeImportsStub() as never);
    jest.spyOn(svc, 'findOne').mockResolvedValue({ id: 'c1' } as never);

    await svc.allocate('c1');

    expect(txCalls.consolidationUpdates[0]).toMatchObject({ status: 'allocated', weightKgTotal: 5 });
  });

  test('advances SUBMITTED attached orders to CONSOLIDATED', async () => {
    const { prisma, txCalls } = makeAllocateMock(1500000);
    const svc = new ConsolidationsService(prisma as never, makeImportsStub() as never);
    jest.spyOn(svc, 'findOne').mockResolvedValue({ id: 'c1' } as never);

    await svc.allocate('c1');

    expect(txCalls.orderUpdates).toHaveLength(2);
    expect(txCalls.orderUpdates.every(u => u.data.status === ImportStatus.CONSOLIDATED)).toBe(true);
  });

  test('calls imports.price exactly once per attached order, after the transaction', async () => {
    const { prisma } = makeAllocateMock(1500000);
    const importsStub = makeImportsStub();
    const svc = new ConsolidationsService(prisma as never, importsStub as never);
    jest.spyOn(svc, 'findOne').mockResolvedValue({ id: 'c1' } as never);

    await svc.allocate('c1');

    expect(importsStub.price).toHaveBeenCalledTimes(2);
    expect(importsStub.price).toHaveBeenCalledWith('o1');
    expect(importsStub.price).toHaveBeenCalledWith('o2');
  });

  test('returns an allocation summary alongside the consolidation detail', async () => {
    const { prisma } = makeAllocateMock(1500000);
    const svc = new ConsolidationsService(prisma as never, makeImportsStub() as never);
    jest.spyOn(svc, 'findOne').mockResolvedValue({ id: 'c1', number: 'MF-C001' } as never);

    const result = await svc.allocate('c1');

    expect(result).toMatchObject({ id: 'c1', number: 'MF-C001' });
    expect(result.allocation).toMatchObject({ totalFreightIdr: 1500000, lineCount: 2, orderCount: 2 });
  });

  test('does not throw when the forwarder invoice is 0, and notes it in the summary', async () => {
    const { prisma, txCalls } = makeAllocateMock(0);
    const svc = new ConsolidationsService(prisma as never, makeImportsStub() as never);
    jest.spyOn(svc, 'findOne').mockResolvedValue({ id: 'c1' } as never);

    const result = await svc.allocate('c1');

    expect(txCalls.lineUpdates.every(l => l.allocatedForwarderIdr === 0)).toBe(true);
    expect(result.allocation.totalFreightIdr).toBe(0);
    expect(result.allocation.note).toBeDefined();
  });
});

describe('ConsolidationsService.detachOrder', () => {
  function makePrisma(order: Record<string, unknown> | null) {
    const txCalls = {
      lineUpdates: [] as Array<{ id: string; data: Record<string, unknown> }>,
      orderUpdates: [] as Array<Record<string, unknown>>,
    };

    const tx = {
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
      importConsolidation: {
        findUnique: jest.fn(async () => ({ id: 'c1' })),
      },
      importOrder: {
        findUnique: jest.fn(async () => order),
      },
      $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(tx)),
    };

    return { prisma, tx, txCalls };
  }

  test('rejects when the order does not belong to this consolidation', async () => {
    const { prisma } = makePrisma({ id: 'o1', consolidationId: 'c2', status: ImportStatus.CONSOLIDATED, lines: [] });
    const svc = new ConsolidationsService(prisma as never, makeImportsStub() as never);

    await expect(svc.detachOrder('c1', 'o1')).rejects.toThrow(/does not belong/i);
  });

  test('resets each line allocatedForwarderIdr to 0 and reverts CONSOLIDATED status to SUBMITTED', async () => {
    const order = {
      id: 'o1',
      consolidationId: 'c1',
      status: ImportStatus.CONSOLIDATED,
      lines: [{ id: 'line1' }, { id: 'line2' }],
    };
    const { prisma, txCalls } = makePrisma(order);
    const svc = new ConsolidationsService(prisma as never, makeImportsStub() as never);
    jest.spyOn(svc, 'findOne').mockResolvedValue({ id: 'c1' } as never);

    await svc.detachOrder('c1', 'o1');

    expect(txCalls.lineUpdates).toEqual([
      { id: 'line1', data: { allocatedForwarderIdr: 0 } },
      { id: 'line2', data: { allocatedForwarderIdr: 0 } },
    ]);
    expect(txCalls.orderUpdates[0]).toEqual({ consolidationId: null, status: ImportStatus.SUBMITTED });
  });

  test('leaves status untouched when the order was not CONSOLIDATED', async () => {
    const order = { id: 'o1', consolidationId: 'c1', status: ImportStatus.PRICED, lines: [{ id: 'line1' }] };
    const { prisma, txCalls } = makePrisma(order);
    const svc = new ConsolidationsService(prisma as never, makeImportsStub() as never);
    jest.spyOn(svc, 'findOne').mockResolvedValue({ id: 'c1' } as never);

    await svc.detachOrder('c1', 'o1');

    expect(txCalls.orderUpdates[0]).toEqual({ consolidationId: null });
  });
});
