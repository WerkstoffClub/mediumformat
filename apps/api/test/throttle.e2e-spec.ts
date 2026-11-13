import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TRUST_PROXY_HOPS } from '../src/config/trust-proxy';

// No DB needed: Prisma is stubbed; we only assert the guard + validation wiring.
describe('Throttling & validation (e2e, no DB)', () => {
  let app: NestExpressApplication;
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
    app = module.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', TRUST_PROXY_HOPS);
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

  describe('per-client buckets behind the proxy (X-Forwarded-For)', () => {
    // supertest socket = hop 1 (Caddy); last XFF entry = hop 2 (cloudflared).
    const PROXY = '172.18.0.2';
    const login = (xff: string) =>
      hit('auth/login', { email: 'a@b.co', password: 'x' }).set('X-Forwarded-For', xff);

    it('two different client IPs get separate login buckets', async () => {
      for (let i = 0; i < 5; i++) await login(`203.0.113.10, ${PROXY}`).expect(401);
      await login(`203.0.113.10, ${PROXY}`).expect(429);
      // Another customer is unaffected by the first one being blocked.
      await login(`203.0.113.11, ${PROXY}`).expect(401);
    });

    it('a spoofed leftmost X-Forwarded-For entry does not escape the bucket', async () => {
      for (let i = 0; i < 5; i++) await login(`198.51.100.${i}, 203.0.113.20, ${PROXY}`).expect(401);
      await login(`198.51.100.99, 203.0.113.20, ${PROXY}`).expect(429);
    });
  });
});
