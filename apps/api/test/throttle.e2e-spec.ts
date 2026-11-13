import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// No DB needed: Prisma is stubbed; we only assert the guard + validation wiring.
describe('Throttling & validation (e2e, no DB)', () => {
  let app: INestApplication;
  const prismaStub = {
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    voucher: { findUnique: jest.fn().mockResolvedValue(null) },
    newsletterSubscriber: { create: jest.fn().mockResolvedValue({}) },
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(() => app.close());

  const hit = (path: string, body: object) =>
    request(app.getHttpServer()).post(`/api/v1/${path}`).send(body);

  it('auth/login: 6th attempt within a minute is 429', async () => {
    for (let i = 0; i < 5; i++) {
      await hit('auth/login', { email: 'a@b.co', password: 'x' }).expect(401);
    }
    await hit('auth/login', { email: 'a@b.co', password: 'x' }).expect(429);
  });

  it('storefront/newsletter/subscribe: 6th request is 429', async () => {
    for (let i = 0; i < 5; i++) {
      await hit('storefront/newsletter/subscribe', { email: `u${i}@b.co` }).expect(201);
    }
    await hit('storefront/newsletter/subscribe', { email: 'u6@b.co' }).expect(429);
  });

  it('storefront/vouchers/validate: 21st request is 429, and bad bodies are 400', async () => {
    await hit('storefront/vouchers/validate', { code: 'X', subtotalIdr: -5 }).expect(400);
    await hit('storefront/vouchers/validate', { code: 'X', subtotalIdr: '10' }).expect(400);
    for (let i = 0; i < 18; i++) {
      await hit('storefront/vouchers/validate', { code: 'X', subtotalIdr: 1000 }).expect(201);
    }
    await hit('storefront/vouchers/validate', { code: 'X', subtotalIdr: 1000 }).expect(429);
  });
});
