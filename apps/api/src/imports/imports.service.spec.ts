import { ImportsService } from './imports.service';
import { ImportOrigin, ImportStatus, PaymentMethod, RecordFormat, ReimbursementStatus } from '@prisma/client';
import { CreateImportDto } from './dto/create-import.dto';

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
    const svc = new ImportsService(prisma as never);
    await svc.create(baseDto());
    const data = (prisma.importOrder.create.mock.calls[0][0] as { data: { number: string } }).data;
    expect(data.number).toBe('MF-I005');
    expect(getCreated()).toBeTruthy();
  });

  test('pads to at least 3 digits for the first import', async () => {
    const { prisma } = makePrismaMock(0);
    const svc = new ImportsService(prisma as never);
    await svc.create(baseDto());
    const data = (prisma.importOrder.create.mock.calls[0][0] as { data: { number: string } }).data;
    expect(data.number).toBe('MF-I001');
  });

  test('sums line extendedNative into subtotalNative', async () => {
    const { prisma } = makePrismaMock(0);
    const svc = new ImportsService(prisma as never);
    await svc.create(baseDto());
    const data = (prisma.importOrder.create.mock.calls[0][0] as { data: { subtotalNative: number } }).data;
    expect(data.subtotalNative).toBe(55.5);
  });

  test('CREDIT_CARD payment method derives PENDING reimbursement status', async () => {
    const { prisma } = makePrismaMock(0);
    const svc = new ImportsService(prisma as never);
    await svc.create(baseDto({ paymentMethod: PaymentMethod.CREDIT_CARD }));
    const data = (prisma.importOrder.create.mock.calls[0][0] as { data: { reimbursementStatus: ReimbursementStatus } }).data;
    expect(data.reimbursementStatus).toBe(ReimbursementStatus.PENDING);
  });

  test('non-credit-card payment methods derive NOT_REQUIRED reimbursement status', async () => {
    const { prisma } = makePrismaMock(0);
    const svc = new ImportsService(prisma as never);
    await svc.create(baseDto({ paymentMethod: PaymentMethod.BANK_TRANSFER }));
    const data = (prisma.importOrder.create.mock.calls[0][0] as { data: { reimbursementStatus: ReimbursementStatus } }).data;
    expect(data.reimbursementStatus).toBe(ReimbursementStatus.NOT_REQUIRED);
  });

  test('new imports are created with status SUBMITTED', async () => {
    const { prisma } = makePrismaMock(0);
    const svc = new ImportsService(prisma as never);
    await svc.create(baseDto());
    const data = (prisma.importOrder.create.mock.calls[0][0] as { data: { status: ImportStatus } }).data;
    expect(data.status).toBe(ImportStatus.SUBMITTED);
  });

  test('assigns sequential lineNo starting at 1', async () => {
    const { prisma } = makePrismaMock(0);
    const svc = new ImportsService(prisma as never);
    await svc.create(baseDto());
    const data = (prisma.importOrder.create.mock.calls[0][0] as { data: { lines: { create: Array<{ lineNo: number }> } } }).data;
    expect(data.lines.create.map(l => l.lineNo)).toEqual([1, 2]);
  });
});

describe('ImportsService.findOne', () => {
  test('throws NotFoundException when the import order does not exist', async () => {
    const { prisma } = makePrismaMock(0);
    const svc = new ImportsService(prisma as never);
    await expect(svc.findOne('missing')).rejects.toThrow(/not found/i);
  });
});
