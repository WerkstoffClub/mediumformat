import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as http from 'node:http';
import { AddressInfo } from 'node:net';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/** POS sales against a real database, with a local stand-in for the Xendit API. */
describe('POS sales (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let xendit: http.Server;
  let xenditCalls: Array<{ url: string; auth?: string; body: Record<string, unknown> }> = [];
  let xenditFails = false;
  const api = () => request(app.getHttpServer());
  const CALLBACK = 'cb-token-for-tests';

  const releaseIds: Record<string, string> = {};
  const stockOf = async (key: string) => (await prisma.release.findUniqueOrThrow({ where: { id: releaseIds[key] } })).stock;

  beforeAll(async () => {
    xendit = http.createServer((req, res) => {
      let raw = '';
      req.on('data', c => (raw += c));
      req.on('end', () => {
        const body = raw ? JSON.parse(raw) : {};
        xenditCalls.push({ url: req.url ?? '', auth: req.headers.authorization, body });
        if (xenditFails) { res.writeHead(500); res.end('{}'); return; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: `inv_${body.external_id ?? 'x'}`, external_id: body.external_id, status: 'PENDING',
          invoice_url: `https://checkout.xendit.test/${body.external_id}`, expiry_date: '2026-11-13T07:00:00.000Z',
        }));
      });
    });
    await new Promise<void>(r => xendit.listen(0, '127.0.0.1', r));
    process.env.XENDIT_API_URL = `http://127.0.0.1:${(xendit.address() as AddressInfo).port}`;
    process.env.XENDIT_SECRET_KEY = 'xnd_development_test';
    process.env.XENDIT_CALLBACK_TOKEN = CALLBACK;

    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = module.get(PrismaService);

    await prisma.posSale.deleteMany();
    await prisma.release.deleteMany({ where: { artist: 'POS E2E' } });
    await prisma.user.deleteMany({ where: { email: 'pos-shop@test.com' } });
    await prisma.user.create({ data: { email: 'pos-shop@test.com', name: 'Shop', passwordHash: await bcrypt.hash('pass', 10), role: 'SHOPKEEPER' } });
    token = (await api().post('/api/v1/auth/login').send({ email: 'pos-shop@test.com', password: 'pass' })).body.accessToken;

    for (const [key, priceIdr, stock] of [['lp', 485_000, 5], ['cd', 195_000, 2]] as const) {
      const r = await prisma.release.create({ data: { artist: 'POS E2E', title: key, format: 'LP', condition: 'M', priceIdr, stock } });
      releaseIds[key] = r.id;
    }
  });

  afterAll(async () => {
    await prisma.posSale.deleteMany();
    await prisma.release.deleteMany({ where: { artist: 'POS E2E' } });
    await prisma.user.deleteMany({ where: { email: 'pos-shop@test.com' } });
    await app.close();
    await new Promise(r => xendit.close(r));
  });

  beforeEach(() => { xenditCalls = []; xenditFails = false; });

  const sale = (payment: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    api().post('/api/v1/pos/sales').set('Authorization', `Bearer ${token}`)
      .send({ lines: [{ releaseId: releaseIds.lp, qty: 1 }], payment, ...extra });

  it('requires a staff login', async () => {
    await api().post('/api/v1/pos/sales').send({}).expect(401);
  });

  it('records a cash sale with server-side totals and takes the stock', async () => {
    const before = await stockOf('lp');
    const res = await sale({ method: 'CASH', tenderedIdr: 600_000 }, { discount: { kind: 'FIXED_IDR', value: 85_000 } }).expect(201);
    expect(res.body).toMatchObject({ status: 'PAID', subtotalIdr: 485_000, discountIdr: 85_000, taxIdr: 44_000, totalIdr: 444_000 });
    expect(res.body.number).toMatch(/^POS-\d{6}-[A-Z2-9]{5}$/);
    expect(res.body.payments[0]).toMatchObject({ method: 'CASH', status: 'PAID', tenderedIdr: 600_000, changeIdr: 156_000 });
    expect(res.body.lines[0]).toMatchObject({ releaseId: releaseIds.lp, unitPriceIdr: 485_000, qty: 1 });
    expect(await stockOf('lp')).toBe(before - 1);
  });

  it('refuses cash below the total', async () => {
    await sale({ method: 'CASH', tenderedIdr: 100 }).expect(400);
  });

  it('records an EDC sale with the slip details', async () => {
    const res = await sale({ method: 'EDC', edcBank: 'BCA', approvalCode: 'A1B2C3', rrn: '612345678901', cardLast4: '4321', cardScheme: 'Visa' }).expect(201);
    expect(res.body.payments[0]).toMatchObject({ method: 'EDC', status: 'PAID', edcBank: 'BCA', edcApprovalCode: 'A1B2C3', edcRrn: '612345678901', cardLast4: '4321' });
    await sale({ method: 'EDC', edcBank: 'BCA' }).expect(400);
  });

  it('does not oversell', async () => {
    const before = await stockOf('cd');
    await api().post('/api/v1/pos/sales').set('Authorization', `Bearer ${token}`)
      .send({ lines: [{ releaseId: releaseIds.cd, qty: 3 }], payment: { method: 'CASH', tenderedIdr: 10_000_000 } })
      .expect(409);
    expect(await stockOf('cd')).toBe(before);
  });

  it('voids a sale and returns the stock', async () => {
    const before = await stockOf('lp');
    const res = await sale({ method: 'OTHER', otherMethodName: 'Penjualan Shopee' }).expect(201);
    expect(await stockOf('lp')).toBe(before - 1);
    const voided = await api().post(`/api/v1/pos/sales/${res.body.id}/void`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(voided.body.status).toBe('VOIDED');
    expect(await stockOf('lp')).toBe(before);
  });

  it('creates a pending Xendit invoice, then settles it from the webhook', async () => {
    const before = await stockOf('lp');
    const res = await sale({ method: 'XENDIT', channel: 'QRIS' }).expect(201);
    expect(res.body.status).toBe('PENDING');
    const pay = res.body.payments[0];
    expect(pay).toMatchObject({ method: 'XENDIT', status: 'PENDING', xenditExternalId: res.body.number, xenditChannel: 'QRIS' });
    expect(pay.xenditInvoiceUrl).toBe(`https://checkout.xendit.test/${res.body.number}`);
    expect(xenditCalls[0].url).toBe('/v2/invoices');
    expect(xenditCalls[0].auth).toBe(`Basic ${Buffer.from('xnd_development_test:').toString('base64')}`);
    expect(xenditCalls[0].body).toMatchObject({ external_id: res.body.number, amount: res.body.totalIdr, currency: 'IDR', payment_methods: ['QRIS'] });
    expect(await stockOf('lp')).toBe(before - 1); // held while pending

    const event = { id: pay.xenditInvoiceId, external_id: res.body.number, status: 'PAID', payment_method: 'QR_CODE', payment_channel: 'QRIS', paid_at: '2026-11-13T06:10:00.000Z' };
    await api().post('/api/v1/webhooks/xendit/invoice').set('x-callback-token', 'wrong').send(event).expect(401);
    await api().post('/api/v1/webhooks/xendit/invoice').set('x-callback-token', CALLBACK).send(event).expect(200);
    await api().post('/api/v1/webhooks/xendit/invoice').set('x-callback-token', CALLBACK).send(event).expect(200); // idempotent

    const after = await api().get(`/api/v1/pos/sales/${res.body.id}`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(after.body).toMatchObject({ status: 'PAID', paidAt: '2026-11-13T06:10:00.000Z' });
    expect(after.body.payments[0]).toMatchObject({ status: 'PAID', xenditPaidMethod: 'QR_CODE · QRIS' });
    await api().post(`/api/v1/pos/sales/${res.body.id}/void`).set('Authorization', `Bearer ${token}`).expect(400); // refund in Xendit
  });

  it('returns the stock when the Xendit invoice expires', async () => {
    const before = await stockOf('lp');
    const res = await sale({ method: 'XENDIT', channel: 'EWALLET', ewallet: 'OVO' }).expect(201);
    expect(xenditCalls[0].body.payment_methods).toEqual(['OVO']);
    await api().post('/api/v1/webhooks/xendit/invoice').set('x-callback-token', CALLBACK)
      .send({ id: res.body.payments[0].xenditInvoiceId, external_id: res.body.number, status: 'EXPIRED' }).expect(200);
    const after = await api().get(`/api/v1/pos/sales/${res.body.id}`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(after.body.status).toBe('EXPIRED');
    expect(await stockOf('lp')).toBe(before);
  });

  it('cancels the sale and returns the stock when Xendit errors', async () => {
    const before = await stockOf('lp');
    xenditFails = true;
    await sale({ method: 'XENDIT', channel: 'VA' }).expect(502);
    expect(await stockOf('lp')).toBe(before);
    const voided = await prisma.posSale.findFirst({ orderBy: { createdAt: 'desc' } });
    expect(voided?.status).toBe('VOIDED');
  });

  it('answers 501 for Xendit until it is configured', async () => {
    const key = process.env.XENDIT_SECRET_KEY;
    delete process.env.XENDIT_SECRET_KEY;
    try {
      await sale({ method: 'XENDIT', channel: 'QRIS' }).expect(501);
      await api().post('/api/v1/webhooks/xendit/invoice').set('x-callback-token', CALLBACK).send({}).expect(501);
    } finally {
      process.env.XENDIT_SECRET_KEY = key;
    }
  });
});
