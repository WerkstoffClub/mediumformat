import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Inventory (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let shopkeeperToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = module.get<PrismaService>(PrismaService);

    await prisma.release.deleteMany();
    await prisma.user.deleteMany({ where: { email: { in: ['inv-admin@test.com', 'inv-shop@test.com'] } } });

    await prisma.user.createMany({
      data: [
        { email: 'inv-admin@test.com', name: 'Admin', passwordHash: await bcrypt.hash('pass', 10), role: 'ADMIN' },
        { email: 'inv-shop@test.com', name: 'Shop', passwordHash: await bcrypt.hash('pass', 10), role: 'SHOPKEEPER' },
      ],
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login').send({ email: 'inv-admin@test.com', password: 'pass' });
    adminToken = adminLogin.body.accessToken;

    const shopLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login').send({ email: 'inv-shop@test.com', password: 'pass' });
    shopkeeperToken = shopLogin.body.accessToken;
  });

  afterAll(async () => {
    await prisma.release.deleteMany();
    await prisma.user.deleteMany({ where: { email: { in: ['inv-admin@test.com', 'inv-shop@test.com'] } } });
    await app.close();
  });

  it('POST /api/v1/inventory → 201 creates release (admin)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ artist: 'Radiohead', title: 'OK Computer', format: 'LP', condition: 'M', priceIdr: 850000, stock: 3 })
      .expect(201);

    expect(res.body).toMatchObject({ artist: 'Radiohead', title: 'OK Computer', priceIdr: 850000 });
    expect(res.body.id).toBeDefined();
  });

  it('POST /api/v1/inventory → 403 for shopkeeper', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .send({ artist: 'X', title: 'Y', format: 'LP', condition: 'M', priceIdr: 100, stock: 1 })
      .expect(403);
  });

  it('GET /api/v1/inventory → 200 returns paginated list (shopkeeper can read)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });

  it('GET /api/v1/inventory?artist=Radiohead → filters results', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/inventory?artist=Radiohead')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].artist).toBe('Radiohead');
  });

  it('PATCH /api/v1/inventory/:id → 200 updates stock', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/inventory').set('Authorization', `Bearer ${adminToken}`);
    const id = list.body.data[0].id;

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/inventory/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stock: 10 })
      .expect(200);

    expect(res.body.stock).toBe(10);
  });

  it('DELETE /api/v1/inventory/:id → 403 for shopkeeper', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/inventory').set('Authorization', `Bearer ${adminToken}`);
    const id = list.body.data[0].id;

    await request(app.getHttpServer())
      .delete(`/api/v1/inventory/${id}`)
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .expect(403);
  });

  it('DELETE /api/v1/inventory/:id → 204 for admin', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/inventory').set('Authorization', `Bearer ${adminToken}`);
    const id = list.body.data[0].id;

    await request(app.getHttpServer())
      .delete(`/api/v1/inventory/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });
});
