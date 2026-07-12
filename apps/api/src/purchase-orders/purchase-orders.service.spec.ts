import { PurchaseOrdersService } from './purchase-orders.service';
import { PoStatus } from '@prisma/client';

/** Minimal in-memory prisma stub covering the calls receive() makes:
 *  purchaseOrder.findUnique, purchaseOrderLine.update, $transaction,
 *  purchaseOrder.update. */
function makePrismaMock(initial: {
  id: string;
  status: PoStatus;
  lines: Array<{ id: string; qtyOrdered: number; qtyReceived: number }>;
}) {
  const po = {
    id: initial.id,
    status: initial.status,
    receivedAt: null as Date | null,
    lines: initial.lines.map(l => ({ ...l })),
  };
  const prisma = {
    purchaseOrder: {
      findUnique: jest.fn(async () => ({ ...po, lines: po.lines.map(l => ({ ...l })) })),
      update: jest.fn(async ({ data }: { data: { status?: PoStatus; receivedAt?: Date | null } }) => {
        if (data.status !== undefined) po.status = data.status;
        if (data.receivedAt !== undefined) po.receivedAt = data.receivedAt;
        return { ...po, lines: po.lines.map(l => ({ ...l })) };
      }),
    },
    purchaseOrderLine: {
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: { qtyReceived: number } }) => {
        const line = po.lines.find(l => l.id === where.id);
        if (line) line.qtyReceived = data.qtyReceived;
        return line;
      }),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { prisma, po };
}

describe('PurchaseOrdersService.receive', () => {
  test('some lines short → PARTIAL, receivedAt stays null', async () => {
    const { prisma } = makePrismaMock({
      id: 'po1',
      status: PoStatus.SENT,
      lines: [
        { id: 'l1', qtyOrdered: 10, qtyReceived: 0 },
        { id: 'l2', qtyOrdered: 5,  qtyReceived: 0 },
      ],
    });
    const svc = new PurchaseOrdersService(prisma as never);
    const result = await svc.receive('po1', { lines: [
      { id: 'l1', qtyReceived: 10 },
      { id: 'l2', qtyReceived: 2 },
    ]});
    expect(result.status).toBe(PoStatus.PARTIAL);
    expect(result.receivedAt).toBeNull();
  });

  test('all lines full → RECEIVED and receivedAt set', async () => {
    const { prisma } = makePrismaMock({
      id: 'po1',
      status: PoStatus.SENT,
      lines: [
        { id: 'l1', qtyOrdered: 10, qtyReceived: 0 },
        { id: 'l2', qtyOrdered: 5,  qtyReceived: 0 },
      ],
    });
    const svc = new PurchaseOrdersService(prisma as never);
    const result = await svc.receive('po1', { lines: [
      { id: 'l1', qtyReceived: 10 },
      { id: 'l2', qtyReceived: 5 },
    ]});
    expect(result.status).toBe(PoStatus.RECEIVED);
    expect(result.receivedAt).toBeInstanceOf(Date);
  });

  test('overshoot on a line still counts as full → RECEIVED', async () => {
    const { prisma } = makePrismaMock({
      id: 'po1',
      status: PoStatus.SENT,
      lines: [{ id: 'l1', qtyOrdered: 3, qtyReceived: 0 }],
    });
    const svc = new PurchaseOrdersService(prisma as never);
    const result = await svc.receive('po1', { lines: [
      { id: 'l1', qtyReceived: 5 },
    ]});
    expect(result.status).toBe(PoStatus.RECEIVED);
  });

  test('no lines received (empty submit) → status resets to SENT and receivedAt cleared', async () => {
    const { prisma } = makePrismaMock({
      id: 'po1',
      status: PoStatus.PARTIAL,
      lines: [{ id: 'l1', qtyOrdered: 4, qtyReceived: 0 }],
    });
    const svc = new PurchaseOrdersService(prisma as never);
    const result = await svc.receive('po1', { lines: [] });
    expect(result.status).toBe(PoStatus.SENT);
    expect(result.receivedAt).toBeNull();
  });

  test('cancelled PO refuses receive()', async () => {
    const { prisma } = makePrismaMock({
      id: 'po1',
      status: PoStatus.CANCELLED,
      lines: [{ id: 'l1', qtyOrdered: 4, qtyReceived: 0 }],
    });
    const svc = new PurchaseOrdersService(prisma as never);
    await expect(svc.receive('po1', { lines: [{ id: 'l1', qtyReceived: 4 }] }))
      .rejects.toThrow(/cancelled/i);
  });

  test('rejects lines that do not belong to this PO', async () => {
    const { prisma } = makePrismaMock({
      id: 'po1',
      status: PoStatus.SENT,
      lines: [{ id: 'l1', qtyOrdered: 4, qtyReceived: 0 }],
    });
    const svc = new PurchaseOrdersService(prisma as never);
    await expect(svc.receive('po1', { lines: [{ id: 'x9', qtyReceived: 1 }] }))
      .rejects.toThrow(/does not belong/i);
  });
});
