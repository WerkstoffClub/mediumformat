import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = module.get<PrismaService>(PrismaService);

    await prisma.user.deleteMany({ where: { email: 'admin@test.com' } });
    await prisma.user.create({
      data: {
        email: 'admin@test.com',
        name: 'Test Admin',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'ADMIN',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'admin@test.com' } });
    await app.close();
  });

  it('POST /api/v1/auth/login → 200 with tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' })
      .expect(200);

    expect(res.body).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      user: { email: 'admin@test.com', role: 'ADMIN' },
    });
  });

  it('POST /api/v1/auth/login → 401 for wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong' })
      .expect(401);
  });

  it('GET /api/v1/auth/me → 401 without token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);
  });

  it('GET /api/v1/auth/me → 200 with valid token', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(200);

    expect(res.body.email).toBe('admin@test.com');
  });
});
