import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/** Stock by location: transfers, sales at a location, consignment reports and the location report. */
describe('Locations & stock transfers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  const ids: Record<string, string> = {};
  const api = () => request(app.getHttpServer());
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);
  const qtyAt = async (loc: string) => {
    const res = await auth(api().get(`/api/v1/locations/${ids[loc]}/stock?q=Location%20E2E`)).expect(200);
    return (res.body as Array<{ id: string; locationQty: number }>).find(r => r.id === ids.lp)?.locationQty ?? 0;
  };
  const total = async () => (await prisma.release.findUniqueOrThrow({ where: { id: ids.lp } })).stock;
  const move = (from: string, to: string, qty: number) =>
    auth(api().post('/api/v1/stock-transfers')).send({ fromLocationId: ids[from], toLocationId: ids[to], lines: [{ releaseId: ids.lp, qty }] });

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'j'.repeat(48);
    process.env.JWT_REFRESH_SECRET ??= 'r'.repeat(48);
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = module.get(PrismaService);

    await prisma.posSale.deleteMany();
    await prisma.stockTransfer.deleteMany();
    await prisma.locationStock.deleteMany();
    await prisma.location.deleteMany();
    await prisma.release.deleteMany(); // card totals cover every release
    await prisma.user.deleteMany({ where: { email: 'loc-admin@test.com' } });
    await prisma.user.create({ data: { email: 'loc-admin@test.com', name: 'Admin', passwordHash: await bcrypt.hash('pass', 10), role: 'ADMIN' } });
    token = (await api().post('/api/v1/auth/login').send({ email: 'loc-admin@test.com', password: 'pass' })).body.accessToken;

    const now = Date.now();
    ids.main = (await prisma.location.create({ data: { name: 'Main Store', kind: 'RETAIL', storeLocation: 'MAIN_STORE', sortOrder: 0 } })).id;
    ids.consign = (await prisma.location.create({ data: { name: 'Toko Mitra', kind: 'CONSIGNMENT', commissionPct: 25, sortOrder: 2 } })).id;
    ids.popup = (await prisma.location.create({
      data: { name: 'Pop-up Fest', kind: 'TEMPORARY', sortOrder: 3, startDate: new Date(now - 86_400_000), endDate: new Date(now + 86_400_000) },
    })).id;
    ids.lp = (await prisma.release.create({
      data: { artist: 'Location E2E', title: 'LP', format: 'LP', condition: 'M', priceIdr: 100_000, stock: 10, storeLocation: 'MAIN_STORE' },
    })).id;
  });

  afterAll(async () => {
    await prisma.posSale.deleteMany();
    await prisma.stockTransfer.deleteMany();
    await prisma.locationStock.deleteMany();
    await prisma.location.deleteMany();
    await prisma.release.deleteMany({ where: { artist: 'Location E2E' } });
    await prisma.user.deleteMany({ where: { email: 'loc-admin@test.com' } });
    await app.close();
  });

  it('moves stock from the store to a consignment shop', async () => {
    const res = await move('main', 'consign', 4).expect(201);
    expect(res.body.number).toMatch(/^TRF-\d{6}-[A-Z2-9]{5}$/);
    expect(res.body.lines[0]).toMatchObject({ releaseId: ids.lp, qty: 4, artist: 'Location E2E' });
    expect(await qtyAt('consign')).toBe(4);
    expect(await qtyAt('main')).toBe(6);
    expect(await total()).toBe(10); // the total does not change on a move
  });

  it('refuses to move more than the source holds, and to the same place', async () => {
    await move('main', 'popup', 7).expect(409);
    await move('main', 'main', 1).expect(400);
    expect(await qtyAt('main')).toBe(6);
    expect(await qtyAt('popup')).toBe(0);
  });

  it('moves between two away locations', async () => {
    await move('consign', 'popup', 1).expect(201);
    expect(await qtyAt('consign')).toBe(3);
    expect(await qtyAt('popup')).toBe(1);
  });

  let popupSale = '';
  it('sells at the event from the event stock only', async () => {
    const res = await auth(api().post('/api/v1/pos/sales'))
      .send({ locationId: ids.popup, lines: [{ releaseId: ids.lp, qty: 1 }], payment: { method: 'CASH', tenderedIdr: 200_000 } })
      .expect(201);
    popupSale = res.body.id;
    expect(res.body.locationId).toBe(ids.popup);
    expect(await qtyAt('popup')).toBe(0);
    expect(await qtyAt('main')).toBe(6);
    expect(await total()).toBe(9);
    await auth(api().post('/api/v1/pos/sales'))
      .send({ locationId: ids.popup, lines: [{ releaseId: ids.lp, qty: 1 }], payment: { method: 'CASH', tenderedIdr: 200_000 } })
      .expect(409);
  });

  it('records what the consignment shop sold, without PPN', async () => {
    const res = await auth(api().post('/api/v1/pos/sales/report'))
      .send({ locationId: ids.consign, lines: [{ releaseId: ids.lp, qty: 2 }] })
      .expect(201);
    expect(res.body).toMatchObject({ status: 'PAID', subtotalIdr: 200_000, taxIdr: 0, totalIdr: 200_000, locationId: ids.consign });
    expect(res.body.payments[0]).toMatchObject({ method: 'OTHER', otherMethodName: 'Sales report · Toko Mitra' });
    expect(await qtyAt('consign')).toBe(1);
    expect(await total()).toBe(7);
  });

  it('reports sales, commission, sell-through and movements per location', async () => {
    const res = await auth(api().get(`/api/v1/locations/${ids.consign}/report`)).expect(200);
    expect(res.body.sales).toMatchObject({
      revenue: 200_000, orders: 1, units: 2, commissionPct: 25, commissionIdr: 50_000, netIdr: 150_000,
    });
    expect(res.body.sellThroughPct).toBe(66.7);
    expect(res.body.stock).toMatchObject({ units: 1, items: 1, valueIdr: 100_000 });
    expect(res.body.movement).toEqual({ unitsIn: 4, unitsOut: 1 });
    expect(res.body.topSellers[0]).toMatchObject({ releaseId: ids.lp, units: 2 });
    expect(res.body.daily.reduce((n: number, d: { posRevenue: number }) => n + d.posRevenue, 0)).toBe(200_000);
    expect(res.body.transfers).toHaveLength(2);
  });

  it('returns stock to the event when its sale is voided', async () => {
    await auth(api().post(`/api/v1/pos/sales/${popupSale}/void`)).expect(200);
    expect(await qtyAt('popup')).toBe(1);
    expect(await total()).toBe(8);
  });

  it('shows stock and sales on every location card', async () => {
    const res = await auth(api().get('/api/v1/locations')).expect(200);
    type Card = { id: string; stats: { units: number }; sales: { revenue: number } };
    const by: Record<string, Card> = Object.fromEntries((res.body as Card[]).map(l => [l.id, l]));
    expect(by[ids.main].stats.units).toBe(6);
    expect(by[ids.consign].stats.units).toBe(1);
    expect(by[ids.popup].stats.units).toBe(1);
    expect(by[ids.consign].sales.revenue).toBe(200_000);
    expect(by[ids.popup].sales.revenue).toBe(0); // its only sale was voided
  });

  it('will not delete a location that holds stock or has history', async () => {
    await auth(api().delete(`/api/v1/locations/${ids.consign}`)).expect(409);
    const empty = await prisma.location.create({ data: { name: 'Unused', kind: 'STORAGE' } });
    await auth(api().delete(`/api/v1/locations/${empty.id}`)).expect(204);
  });
});
