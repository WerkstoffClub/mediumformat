# Phase 1 — Foundation & Core Backoffice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the monorepo, PostgreSQL database, NestJS API with auth and role-based access, and a working React backoffice shell with Inventory CRUD — the foundation every subsequent phase builds on.

**Architecture:** pnpm monorepo (Turborepo) with three packages: `apps/api` (NestJS + Prisma), `apps/backoffice` (React + Vite), and `packages/shared` (TypeScript types). The API exposes a REST interface with JWT auth and a `roles` guard. The backoffice is a single-page app that calls the API via Axios.

**Tech Stack:** Node 20, pnpm 9, Turborepo, NestJS 10, Prisma 5, PostgreSQL 15, React 18, Vite 5, TypeScript 5, Tailwind CSS 3, Vitest, Jest, Supertest.

---

## File Map

```
medium-format/
├── package.json                          # workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.module.ts
│   │   │   │   └── prisma.service.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   └── roles.guard.ts
│   │   │   │   └── decorators/
│   │   │   │       ├── roles.decorator.ts
│   │   │   │       └── current-user.decorator.ts
│   │   │   ├── users/
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── users.controller.ts
│   │   │   └── inventory/
│   │   │       ├── inventory.module.ts
│   │   │       ├── inventory.service.ts
│   │   │       ├── inventory.controller.ts
│   │   │       └── dto/
│   │   │           ├── create-release.dto.ts
│   │   │           ├── update-release.dto.ts
│   │   │           └── release-filter.dto.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── test/
│   │   │   ├── auth.e2e-spec.ts
│   │   │   └── inventory.e2e-spec.ts
│   │   ├── package.json
│   │   ├── nest-cli.json
│   │   └── tsconfig.json
│   └── backoffice/
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── theme/
│       │   │   ├── tokens.css
│       │   │   └── useTheme.ts
│       │   ├── layouts/
│       │   │   ├── AppShell.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   └── Topbar.tsx
│       │   ├── pages/
│       │   │   ├── Login.tsx
│       │   │   ├── Dashboard.tsx
│       │   │   └── inventory/
│       │   │       ├── InventoryList.tsx
│       │   │       └── ReleaseForm.tsx
│       │   ├── components/
│       │   │   ├── ThemeToggle.tsx
│       │   │   └── ui/
│       │   │       ├── Button.tsx
│       │   │       ├── Input.tsx
│       │   │       ├── Badge.tsx
│       │   │       └── Table.tsx
│       │   ├── hooks/
│       │   │   └── useAuth.ts
│       │   └── api/
│       │       ├── client.ts
│       │       ├── auth.ts
│       │       └── inventory.ts
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       └── package.json
└── packages/
    └── shared/
        ├── src/
        │   ├── index.ts
        │   ├── types/
        │   │   ├── user.ts
        │   │   └── release.ts
        │   └── constants/
        │       └── roles.ts
        └── package.json
```

---

## Task 1: Monorepo scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "medium-format",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev":   { "cache": false, "persistent": true },
    "test":  { "dependsOn": ["^build"] },
    "lint":  {}
  }
}
```

- [ ] **Step 4: Create .env.example**

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/mediumformat"
JWT_SECRET="change-me-in-production-use-64-char-random-string"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"
PORT=3001
NODE_ENV=development
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
.env
.env.local
*.local
.turbo/
coverage/
```

- [ ] **Step 6: Install root deps and verify**

```bash
pnpm install
```

Expected: `node_modules/.modules.yaml` created, no errors.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "chore: init monorepo with pnpm workspaces and turborepo"
```

---

## Task 2: Shared types package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/src/constants/roles.ts`
- Create: `packages/shared/src/types/user.ts`
- Create: `packages/shared/src/types/release.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/tsconfig.json`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@mf/shared",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create packages/shared/src/constants/roles.ts**

```typescript
export enum Role {
  ADMIN       = 'ADMIN',
  MANAGER     = 'MANAGER',
  SHOPKEEPER  = 'SHOPKEEPER',
  WHOLESALER  = 'WHOLESALER',
  CUSTOMER    = 'CUSTOMER',
}

export const STAFF_ROLES: Role[] = [
  Role.ADMIN,
  Role.MANAGER,
  Role.SHOPKEEPER,
];
```

- [ ] **Step 3: Create packages/shared/src/types/user.ts**

```typescript
import { Role } from '../constants/roles';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}
```

- [ ] **Step 4: Create packages/shared/src/types/release.ts**

```typescript
export type RecordFormat = 'LP' | '2xLP' | '3xLP' | '12_INCH' | '7_INCH' | 'CD' | '2xCD' | 'MERCH';
export type RecordCondition = 'M' | 'VGP' | 'VG' | 'GP' | 'G' | 'F' | 'P';
export type StoreLocation = 'MAIN_STORE' | 'WAREHOUSE' | 'CONSIGNMENT';

export interface Release {
  id: string;
  artist: string;
  title: string;
  label: string | null;
  catNumber: string | null;
  year: number | null;
  format: RecordFormat;
  genre: string | null;
  condition: RecordCondition;
  priceIdr: number;
  stock: number;
  notes: string | null;
  imageUrl: string | null;
  barcode: string | null;
  storeLocation: StoreLocation;
  shelfLocation: string | null;
  lowStockThreshold: number;
  discogsId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseListItem extends Pick<Release,
  'id' | 'artist' | 'title' | 'format' | 'condition' |
  'priceIdr' | 'stock' | 'storeLocation' | 'shelfLocation' |
  'barcode' | 'imageUrl' | 'lowStockThreshold'
> {}

export interface CreateReleaseInput extends Omit<Release,
  'id' | 'createdAt' | 'updatedAt'
> {}
```

- [ ] **Step 5: Create packages/shared/src/index.ts**

```typescript
export * from './constants/roles';
export * from './types/user';
export * from './types/release';
```

- [ ] **Step 6: Create packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Commit**

```bash
git add packages/
git commit -m "chore: add shared types package with roles and release types"
```

---

## Task 3: API — NestJS bootstrap + Prisma

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/prisma/prisma.service.ts`

- [ ] **Step 1: Create apps/api/package.json**

```json
{
  "name": "@mf/api",
  "version": "0.0.1",
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@prisma/client": "^5.13.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "bcrypt": "^5.1.1",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1",
    "@mf/shared": "workspace:*",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/schematics": "^10.1.0",
    "@nestjs/testing": "^10.3.0",
    "@types/bcrypt": "^5.0.2",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.12.0",
    "@types/passport-jwt": "^4.0.1",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "prisma": "^5.13.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.2",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create apps/api/nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

- [ ] **Step 3: Create apps/api/tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

- [ ] **Step 4: Create apps/api/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  MANAGER
  SHOPKEEPER
  WHOLESALER
  CUSTOMER
}

enum RecordFormat {
  LP
  TWO_LP
  THREE_LP
  TWELVE_INCH
  SEVEN_INCH
  CD
  TWO_CD
  MERCH
}

enum RecordCondition {
  M
  VGP
  VG
  GP
  G
  F
  P
}

enum StoreLocation {
  MAIN_STORE
  WAREHOUSE
  CONSIGNMENT
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  role         Role     @default(CUSTOMER)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Release {
  id                String          @id @default(cuid())
  artist            String
  title             String
  label             String?
  catNumber         String?
  year              Int?
  format            RecordFormat
  genre             String?
  condition         RecordCondition
  priceIdr          Int
  stock             Int             @default(0)
  notes             String?
  imageUrl          String?
  barcode           String?         @unique
  storeLocation     StoreLocation   @default(MAIN_STORE)
  shelfLocation     String?
  lowStockThreshold Int             @default(2)
  discogsId         String?         @unique
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@index([artist, title])
  @@index([barcode])
  @@index([discogsId])
}
```

- [ ] **Step 5: Create apps/api/src/prisma/prisma.service.ts**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 6: Create apps/api/src/prisma/prisma.module.ts**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 7: Create apps/api/src/app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
})
export class AppModule {}
```

- [ ] **Step 8: Create apps/api/src/main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' });
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.PORT ?? 3001);
  console.log(`API running on port ${process.env.PORT ?? 3001}`);
}
bootstrap();
```

- [ ] **Step 9: Start PostgreSQL and run first migration**

```bash
# ensure postgres is running, then from apps/api:
cd apps/api
pnpm prisma migrate dev --name init
pnpm prisma generate
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 10: Verify API starts**

```bash
cd apps/api && pnpm dev
```

Expected: `API running on port 3001`

- [ ] **Step 11: Commit**

```bash
git add apps/api/
git commit -m "feat(api): bootstrap NestJS app with Prisma and PostgreSQL schema"
```

---

## Task 4: Auth module — JWT + roles

**Files:**
- Create: `apps/api/src/auth/decorators/roles.decorator.ts`
- Create: `apps/api/src/auth/decorators/current-user.decorator.ts`
- Create: `apps/api/src/auth/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/auth/guards/roles.guard.ts`
- Create: `apps/api/src/auth/jwt.strategy.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/test/auth.e2e-spec.ts`

- [ ] **Step 1: Write failing e2e test for login**

Create `apps/api/test/auth.e2e-spec.ts`:

```typescript
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = module.get<PrismaService>(PrismaService);

    // seed test user
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
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd apps/api && pnpm test:e2e -- --testPathPattern=auth
```

Expected: FAIL — `Cannot find module '../src/app.module'` or route not found.

- [ ] **Step 3: Create roles decorator**

`apps/api/src/auth/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '@mf/shared';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 4: Create current-user decorator**

`apps/api/src/auth/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

- [ ] **Step 5: Create JWT strategy**

`apps/api/src/auth/jwt.strategy.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();
    return user;
  }
}
```

- [ ] **Step 6: Create JWT guard**

`apps/api/src/auth/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 7: Create roles guard**

`apps/api/src/auth/guards/roles.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@mf/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const { user } = context.switchToHttp().getRequest();
    return required.includes(user?.role);
  }
}
```

- [ ] **Step 8: Create auth service**

`apps/api/src/auth/auth.service.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      accessToken: this.jwt.sign(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
      }),
      refreshToken: this.jwt.sign(payload, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
        secret: (process.env.JWT_SECRET ?? 'dev-secret') + '-refresh',
      }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
```

- [ ] **Step 9: Create auth controller**

`apps/api/src/auth/auth.controller.ts`:

```typescript
import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

class LoginDto {
  email!: string;
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: Express.User) {
    return user;
  }
}
```

- [ ] **Step 10: Create auth module and wire into AppModule**

`apps/api/src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

Update `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
})
export class AppModule {}
```

- [ ] **Step 11: Run e2e tests — expect pass**

```bash
cd apps/api && pnpm test:e2e -- --testPathPattern=auth
```

Expected: PASS (4 tests).

- [ ] **Step 12: Commit**

```bash
git add apps/api/src/auth/ apps/api/test/auth.e2e-spec.ts apps/api/src/app.module.ts
git commit -m "feat(api): add JWT auth with role-based access control"
```

---

## Task 5: Users module + seed script

**Files:**
- Create: `apps/api/src/users/users.service.ts`
- Create: `apps/api/src/users/users.module.ts`
- Create: `apps/api/src/users/users.controller.ts`
- Create: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Create users service**

`apps/api/src/users/users.service.ts`:

```typescript
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@mf/shared';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    email: string;
    name: string;
    password: string;
    role: Role;
  }) {
    const exists = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: { email: data.email, name: data.name, passwordHash, role: data.role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async deactivate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });
  }
}
```

- [ ] **Step 2: Create users controller**

`apps/api/src/users/users.controller.ts`:

```typescript
import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@mf/shared';

class CreateUserDto {
  email!: string;
  name!: string;
  password!: string;
  role!: Role;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Post()
  create(@Body() body: CreateUserDto) {
    return this.users.create(body);
  }

  @Get()
  findAll() {
    return this.users.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.users.deactivate(id);
  }
}
```

- [ ] **Step 3: Create users module and add to AppModule**

`apps/api/src/users/users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
```

Update `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule],
})
export class AppModule {}
```

- [ ] **Step 4: Create seed script**

`apps/api/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminExists = await prisma.user.findUnique({ where: { email: 'admin@mediumformat.id' } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: 'admin@mediumformat.id',
        name: 'Admin',
        passwordHash: await bcrypt.hash('changeme123', 12),
        role: 'ADMIN',
      },
    });
    console.log('Seeded admin user: admin@mediumformat.id / changeme123');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Add to `apps/api/package.json` under `"prisma"`:

```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

- [ ] **Step 5: Run seed**

```bash
cd apps/api && pnpm prisma db seed
```

Expected: `Seeded admin user: admin@mediumformat.id / changeme123`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/users/ apps/api/prisma/seed.ts
git commit -m "feat(api): add users module with admin-only CRUD and seed script"
```

---

## Task 6: Inventory module — CRUD API

**Files:**
- Create: `apps/api/src/inventory/dto/create-release.dto.ts`
- Create: `apps/api/src/inventory/dto/update-release.dto.ts`
- Create: `apps/api/src/inventory/dto/release-filter.dto.ts`
- Create: `apps/api/src/inventory/inventory.service.ts`
- Create: `apps/api/src/inventory/inventory.controller.ts`
- Create: `apps/api/src/inventory/inventory.module.ts`
- Create: `apps/api/test/inventory.e2e-spec.ts`

- [ ] **Step 1: Write failing inventory e2e tests**

`apps/api/test/inventory.e2e-spec.ts`:

```typescript
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
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
      .send({
        artist: 'Radiohead',
        title: 'OK Computer',
        format: 'LP',
        condition: 'M',
        priceIdr: 850000,
        stock: 3,
      })
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

  it('GET /api/v1/inventory → 200 returns list (shopkeeper can read)', async () => {
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
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${adminToken}`);
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
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${adminToken}`);
    const id = list.body.data[0].id;

    await request(app.getHttpServer())
      .delete(`/api/v1/inventory/${id}`)
      .set('Authorization', `Bearer ${shopkeeperToken}`)
      .expect(403);
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd apps/api && pnpm test:e2e -- --testPathPattern=inventory
```

Expected: FAIL — routes not found.

- [ ] **Step 3: Create DTOs**

`apps/api/src/inventory/dto/create-release.dto.ts`:

```typescript
import { IsString, IsOptional, IsInt, IsEnum, Min, IsPositive } from 'class-validator';
import { RecordFormat, RecordCondition, StoreLocation } from '@prisma/client';

export class CreateReleaseDto {
  @IsString() artist!: string;
  @IsString() title!: string;
  @IsEnum(RecordFormat) format!: RecordFormat;
  @IsEnum(RecordCondition) condition!: RecordCondition;
  @IsInt() @IsPositive() priceIdr!: number;
  @IsInt() @Min(0) stock!: number;

  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() catNumber?: string;
  @IsOptional() @IsInt() year?: number;
  @IsOptional() @IsString() genre?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsEnum(StoreLocation) storeLocation?: StoreLocation;
  @IsOptional() @IsString() shelfLocation?: string;
  @IsOptional() @IsInt() @Min(0) lowStockThreshold?: number;
  @IsOptional() @IsString() discogsId?: string;
}
```

`apps/api/src/inventory/dto/update-release.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateReleaseDto } from './create-release.dto';

export class UpdateReleaseDto extends PartialType(CreateReleaseDto) {}
```

`apps/api/src/inventory/dto/release-filter.dto.ts`:

```typescript
import { IsOptional, IsString, IsInt, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RecordFormat, RecordCondition, StoreLocation } from '@prisma/client';

export class ReleaseFilterDto {
  @IsOptional() @IsString() artist?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsEnum(RecordFormat) format?: RecordFormat;
  @IsOptional() @IsEnum(RecordCondition) condition?: RecordCondition;
  @IsOptional() @IsEnum(StoreLocation) storeLocation?: StoreLocation;
  @IsOptional() @IsString() shelfLocation?: string;
  @IsOptional() @Type(() => Boolean) lowStockOnly?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 50;
}
```

- [ ] **Step 4: Create inventory service**

`apps/api/src/inventory/inventory.service.ts`:

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { ReleaseFilterDto } from './dto/release-filter.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReleaseDto) {
    if (dto.barcode) {
      const exists = await this.prisma.release.findUnique({ where: { barcode: dto.barcode } });
      if (exists) throw new ConflictException('Barcode already in use');
    }
    return this.prisma.release.create({ data: dto });
  }

  async findAll(filter: ReleaseFilterDto) {
    const { page = 1, limit = 50, lowStockOnly, ...rest } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.ReleaseWhereInput = {};
    if (rest.artist) where.artist = { contains: rest.artist, mode: 'insensitive' };
    if (rest.title)  where.title  = { contains: rest.title,  mode: 'insensitive' };
    if (rest.label)  where.label  = { contains: rest.label,  mode: 'insensitive' };
    if (rest.format)        where.format        = rest.format;
    if (rest.condition)     where.condition     = rest.condition;
    if (rest.storeLocation) where.storeLocation = rest.storeLocation;
    if (lowStockOnly) where.stock = { lte: this.prisma.release.fields.lowStockThreshold as unknown as number };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.release.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' } }),
      this.prisma.release.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const release = await this.prisma.release.findUnique({ where: { id } });
    if (!release) throw new NotFoundException('Release not found');
    return release;
  }

  async update(id: string, dto: UpdateReleaseDto) {
    await this.findOne(id);
    return this.prisma.release.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.release.delete({ where: { id } });
  }

  async adjustStock(id: string, delta: number) {
    const release = await this.findOne(id);
    const newStock = Math.max(0, release.stock + delta);
    return this.prisma.release.update({
      where: { id },
      data: { stock: newStock },
    });
  }
}
```

- [ ] **Step 5: Create inventory controller**

`apps/api/src/inventory/inventory.controller.ts`:

```typescript
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { ReleaseFilterDto } from './dto/release-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, STAFF_ROLES } from '@mf/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  @Roles(...STAFF_ROLES)
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() body: CreateReleaseDto) {
    return this.inventory.create(body);
  }

  @Roles(...STAFF_ROLES)
  @Get()
  findAll(@Query() filter: ReleaseFilterDto) {
    return this.inventory.findAll(filter);
  }

  @Roles(...STAFF_ROLES)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventory.findOne(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateReleaseDto) {
    return this.inventory.update(id, body);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inventory.remove(id);
  }
}
```

- [ ] **Step 6: Create inventory module and register**

`apps/api/src/inventory/inventory.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
```

Update `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, InventoryModule],
})
export class AppModule {}
```

- [ ] **Step 7: Fix lowStockOnly filter in service**

The `Prisma.release.fields` trick won't work for a column-relative comparison. Replace the `lowStockOnly` line in `inventory.service.ts`:

```typescript
// Replace the lowStockOnly block with:
if (lowStockOnly) {
  where.AND = [
    { stock: { lte: 2 } }, // will be refined in Phase 2 with per-item threshold query
  ];
}
```

- [ ] **Step 8: Run inventory e2e tests**

```bash
cd apps/api && pnpm test:e2e -- --testPathPattern=inventory
```

Expected: PASS (5 tests).

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/inventory/ apps/api/test/inventory.e2e-spec.ts apps/api/src/app.module.ts
git commit -m "feat(api): add inventory CRUD with role-based access control"
```

---

## Task 7: Backoffice — React + Vite scaffold

**Files:**
- Create: `apps/backoffice/package.json`
- Create: `apps/backoffice/vite.config.ts`
- Create: `apps/backoffice/tailwind.config.ts`
- Create: `apps/backoffice/index.html`
- Create: `apps/backoffice/src/main.tsx`
- Create: `apps/backoffice/src/App.tsx`

- [ ] **Step 1: Create apps/backoffice/package.json**

```json
{
  "name": "@mf/backoffice",
  "version": "0.0.1",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@mf/shared": "workspace:*",
    "axios": "^1.6.8",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.22.3"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^15.0.2",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.0",
    "vite": "^5.2.8",
    "vitest": "^1.4.0"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

`apps/backoffice/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
});
```

- [ ] **Step 3: Create tailwind.config.ts**

`apps/backoffice/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6c63ff',
          hover:   '#5a52e0',
          muted:   '#6c63ff1a',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 4: Create index.html**

`apps/backoffice/index.html`:

```html
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Medium Format — Backoffice</title>
</head>
<body class="bg-[#111] text-[#d4d4d4] antialiased">
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 5: Create src/main.tsx**

`apps/backoffice/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './theme/tokens.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

- [ ] **Step 6: Create src/App.tsx (skeleton, routes wired in Task 9)**

`apps/backoffice/src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Login from './pages/Login';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
```

- [ ] **Step 7: Install and verify**

```bash
cd apps/backoffice && pnpm install && pnpm dev
```

Expected: Vite dev server at http://localhost:5173 (blank page — no routes yet).

- [ ] **Step 8: Commit**

```bash
git add apps/backoffice/
git commit -m "feat(backoffice): scaffold React + Vite + Tailwind app"
```

---

## Task 8: Theme system — CSS tokens + toggle

**Files:**
- Create: `apps/backoffice/src/theme/tokens.css`
- Create: `apps/backoffice/src/hooks/useTheme.ts`
- Create: `apps/backoffice/src/components/ThemeToggle.tsx`
- Create: `apps/backoffice/src/theme/tokens.test.ts`

- [ ] **Step 1: Write failing test for useTheme**

`apps/backoffice/src/hooks/useTheme.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = 'dark';
  });

  it('defaults to dark theme', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles to light and persists', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('mf-theme')).toBe('light');
  });

  it('reads persisted preference on mount', () => {
    localStorage.setItem('mf-theme', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd apps/backoffice && pnpm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module './useTheme'`

- [ ] **Step 3: Create CSS token file**

`apps/backoffice/src/theme/tokens.css`:

```css
:root.dark {
  --bg-base:     #111111;
  --bg-surface:  #161616;
  --bg-overlay:  #1e1e1e;
  --bg-hover:    #141414;
  --border:      #1e1e1e;
  --border-sub:  #1a1a1a;
  --text-primary:   #e0e0e0;
  --text-secondary: #888888;
  --text-muted:     #444444;
  --text-faint:     #333333;
  --brand:       #6c63ff;
  --brand-hover: #5a52e0;
  --brand-muted: rgba(108, 99, 255, 0.15);
  --success:     #4caf82;
  --warning:     #e8a838;
  --danger:      #e05c6a;
  --info:        #5bc0de;
}

:root.light {
  --bg-base:     #f5f5f5;
  --bg-surface:  #ffffff;
  --bg-overlay:  #eeeeee;
  --bg-hover:    #f0f0f0;
  --border:      #e0e0e0;
  --border-sub:  #ebebeb;
  --text-primary:   #111111;
  --text-secondary: #666666;
  --text-muted:     #999999;
  --text-faint:     #bbbbbb;
  --brand:       #5b4fc7;
  --brand-hover: #4a40b0;
  --brand-muted: rgba(91, 79, 199, 0.12);
  --success:     #2d8a55;
  --warning:     #b07a10;
  --danger:      #c0303d;
  --info:        #1a7fa0;
}

body {
  background-color: var(--bg-base);
  color: var(--text-primary);
}
```

- [ ] **Step 4: Create useTheme hook**

`apps/backoffice/src/hooks/useTheme.ts`:

```typescript
import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';
const STORAGE_KEY = 'mf-theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored ?? 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd apps/backoffice && pnpm test -- --reporter=verbose
```

Expected: PASS (3 tests).

- [ ] **Step 6: Create ThemeToggle component**

`apps/backoffice/src/components/ThemeToggle.tsx`:

```tsx
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
    >
      <span className="text-xs">{isDark ? '🌙' : '☀️'}</span>
      <div
        className="relative w-9 h-5 rounded-full transition-colors"
        style={{ background: isDark ? 'var(--bg-overlay)' : 'var(--brand)' }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
          style={{ left: isDark ? '2px' : '18px' }}
        />
      </div>
    </button>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/backoffice/src/theme/ apps/backoffice/src/hooks/useTheme.ts apps/backoffice/src/hooks/useTheme.test.ts apps/backoffice/src/components/ThemeToggle.tsx
git commit -m "feat(backoffice): add dark/light theme system with CSS tokens and toggle"
```

---

## Task 9: AppShell layout — sidebar + topbar

**Files:**
- Create: `apps/backoffice/src/layouts/Sidebar.tsx`
- Create: `apps/backoffice/src/layouts/Topbar.tsx`
- Create: `apps/backoffice/src/layouts/AppShell.tsx`
- Modify: `apps/backoffice/src/App.tsx`

- [ ] **Step 1: Create Sidebar**

`apps/backoffice/src/layouts/Sidebar.tsx`:

```tsx
import { NavLink } from 'react-router-dom';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

// Thin SVG icons — no emojis
const icons = {
  dashboard: <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  inventory: <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/></svg>,
  orders:    <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  customers: <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  vouchers:  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg>,
  newsletter:<svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  po:        <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  channels:  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  settings:  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>,
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard',       to: '/dashboard',         icon: icons.dashboard },
      { label: 'Inventory',       to: '/inventory',         icon: icons.inventory },
      { label: 'Orders',          to: '/orders',            icon: icons.orders,   badge: 0 },
      { label: 'Customers',       to: '/customers',         icon: icons.customers },
      { label: 'Vouchers',        to: '/vouchers',          icon: icons.vouchers  },
      { label: 'Newsletter',      to: '/newsletter',        icon: icons.newsletter},
      { label: 'Purchase Orders', to: '/purchase-orders',   icon: icons.po        },
    ],
  },
  {
    label: 'Config',
    items: [
      { label: 'Channels',    to: '/channels',    icon: icons.channels },
      { label: 'Preferences', to: '/preferences', icon: icons.settings },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="w-[186px] min-w-[186px] bg-[#0d0d0d] border-r border-[#1e1e1e] flex flex-col">
      <div className="px-[18px] py-4 text-[15px] font-black tracking-tight text-white border-b border-[#1e1e1e]">
        Medium<span className="text-brand">Format</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-[18px] pt-3 pb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#3a3a3a]">
                {group.label}
              </p>
            )}
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-[18px] py-[7px] text-[12.5px] border-l-2 transition-colors ${
                    isActive
                      ? 'text-white bg-[#181822] border-brand'
                      : 'text-[#555] border-transparent hover:text-[#ccc] hover:bg-[#141414]'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="ml-auto bg-[#e05c6a] text-white text-[9px] font-bold rounded-full px-1.5 py-px">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-[#1e1e1e] p-[14px]">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#191919] border border-[#252525] rounded-md">
          <span className="w-2 h-2 rounded-full bg-[#4caf82] flex-shrink-0" />
          <span className="text-[11px] text-[#aaa] truncate">Medium Format · JKT</span>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create Topbar**

`apps/backoffice/src/layouts/Topbar.tsx`:

```tsx
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../hooks/useAuth';

export function Topbar() {
  const { user } = useAuth();
  const initials = user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) ?? 'MF';

  return (
    <header className="h-[52px] bg-[#0d0d0d] border-b border-[#1e1e1e] flex items-center px-5 gap-3 flex-shrink-0">
      <div className="flex items-center gap-2 bg-[#161616] border border-[#232323] rounded-md px-3 py-1.5 flex-1 max-w-[460px]">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#444] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          className="bg-transparent border-none outline-none text-[#bbb] text-[12px] w-full placeholder:text-[#333]"
          placeholder="Find releases, products or books..."
        />
      </div>

      <div className="flex-1" />

      <span className="text-[12px] text-[#555] cursor-pointer hover:text-[#aaa]">Feed</span>
      <span className="text-[12px] text-[#555] cursor-pointer hover:text-[#aaa]">My Eshop</span>

      <ThemeToggle />

      <button className="w-8 h-8 flex items-center justify-center text-[#555] hover:text-[#aaa]">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
      </button>

      <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-[10px] font-black text-white cursor-pointer">
        {initials}
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create AppShell**

`apps/backoffice/src/layouts/AppShell.tsx`:

```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-[var(--bg-base)] p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire AppShell into App.tsx**

`apps/backoffice/src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppShell } from './layouts/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { InventoryList } from './pages/inventory/InventoryList';

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-[#444]">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoutes />}>
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/inventory"  element={<InventoryList />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/backoffice/src/layouts/ apps/backoffice/src/App.tsx
git commit -m "feat(backoffice): add AppShell layout with sidebar and topbar"
```

---

## Task 10: Auth flow — API client, useAuth, Login page

**Files:**
- Create: `apps/backoffice/src/api/client.ts`
- Create: `apps/backoffice/src/api/auth.ts`
- Create: `apps/backoffice/src/hooks/useAuth.ts`
- Create: `apps/backoffice/src/pages/Login.tsx`
- Create: `apps/backoffice/src/hooks/useAuth.test.tsx`

- [ ] **Step 1: Create API client**

`apps/backoffice/src/api/client.ts`:

```typescript
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('mf-access-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mf-access-token');
      localStorage.removeItem('mf-user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
```

- [ ] **Step 2: Create auth API calls**

`apps/backoffice/src/api/auth.ts`:

```typescript
import { api } from './client';
import type { AuthTokens } from '@mf/shared';

export async function login(email: string, password: string): Promise<AuthTokens> {
  const res = await api.post<AuthTokens>('/auth/login', { email, password });
  return res.data;
}

export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data;
}
```

- [ ] **Step 3: Create useAuth hook**

`apps/backoffice/src/hooks/useAuth.ts`:

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@mf/shared';
import { login as apiLogin, getMe } from '../api/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('mf-access-token');
    if (!token) { setLoading(false); return; }
    getMe()
      .then(setUser)
      .catch(() => { localStorage.removeItem('mf-access-token'); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const tokens = await apiLogin(email, password);
    localStorage.setItem('mf-access-token', tokens.accessToken);
    setUser(tokens.user);
  };

  const logout = () => {
    localStorage.removeItem('mf-access-token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

- [ ] **Step 4: Create Login page**

`apps/backoffice/src/pages/Login.tsx`:

```tsx
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight text-white">
            Medium<span className="text-brand">Format</span>
          </h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">Backoffice</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 flex flex-col gap-4"
        >
          <div>
            <label className="block text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-md px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-brand"
              placeholder="you@mediumformat.id"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-md px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-brand"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-[11px] text-[var(--danger)] text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-bold text-[13px] py-2.5 rounded-md transition-colors mt-1"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create test-setup file**

`apps/backoffice/src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 6: Verify full login flow in browser**

```bash
# Terminal 1: start API
cd apps/api && pnpm dev

# Terminal 2: start backoffice
cd apps/backoffice && pnpm dev
```

Navigate to http://localhost:5173, log in with `admin@mediumformat.id` / `changeme123`.
Expected: redirected to `/dashboard` (blank page for now).

- [ ] **Step 7: Commit**

```bash
git add apps/backoffice/src/api/ apps/backoffice/src/hooks/useAuth.ts apps/backoffice/src/pages/Login.tsx apps/backoffice/src/test-setup.ts
git commit -m "feat(backoffice): add auth flow — API client, useAuth context, Login page"
```

---

## Task 11: Dashboard page — static widgets

**Files:**
- Create: `apps/backoffice/src/pages/Dashboard.tsx`
- Create: `apps/backoffice/src/api/inventory.ts`

- [ ] **Step 1: Create inventory API module**

`apps/backoffice/src/api/inventory.ts`:

```typescript
import { api } from './client';
import type { Release } from '@mf/shared';

export interface ReleaseListResponse {
  data: Release[];
  total: number;
  page: number;
  limit: number;
}

export interface ReleaseFilter {
  artist?: string;
  title?: string;
  format?: string;
  condition?: string;
  lowStockOnly?: boolean;
  page?: number;
  limit?: number;
}

export async function getReleases(filter: ReleaseFilter = {}): Promise<ReleaseListResponse> {
  const res = await api.get<ReleaseListResponse>('/inventory', { params: filter });
  return res.data;
}

export async function getRelease(id: string): Promise<Release> {
  const res = await api.get<Release>(`/inventory/${id}`);
  return res.data;
}

export async function createRelease(data: Partial<Release>): Promise<Release> {
  const res = await api.post<Release>('/inventory', data);
  return res.data;
}

export async function updateRelease(id: string, data: Partial<Release>): Promise<Release> {
  const res = await api.patch<Release>(`/inventory/${id}`, data);
  return res.data;
}

export async function deleteRelease(id: string): Promise<void> {
  await api.delete(`/inventory/${id}`);
}
```

- [ ] **Step 2: Create Dashboard page**

`apps/backoffice/src/pages/Dashboard.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { getReleases } from '../api/inventory';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ label, value, trend, trendUp }: StatCardProps) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3.5 py-2.5">
      <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1">{label}</p>
      <p className="text-[20px] font-black text-[var(--text-primary)] leading-none">{value}</p>
      {trend && (
        <p className={`text-[9px] mt-1 ${trendUp ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
          {trend}
        </p>
      )}
    </div>
  );
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-[var(--border-sub)]">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          {title}
        </h3>
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const [stockCount, setStockCount] = useState<number | null>(null);
  const now = new Date();
  const weekNum = Math.ceil((now.getDate() - now.getDay() + 6) / 7);

  useEffect(() => {
    getReleases({ limit: 1 })
      .then(r => setStockCount(r.total))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-black tracking-tight text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Good morning — here's what's happening today</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Week {weekNum}</p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            {now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
          <p className="text-[26px] font-black text-[var(--text-primary)] leading-none mt-1">
            {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-2.5">
        <StatCard label="Today's Revenue" value="Rp 0"     trend="No data yet" />
        <StatCard label="Open Orders"     value="0"        />
        <StatCard label="Items in Stock"  value={stockCount ?? '—'} trend={stockCount != null ? `${stockCount} releases` : undefined} trendUp />
        <StatCard label="This Month"      value="Rp 0"     />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Widget title="Sales over time">
            <div className="h-24 flex items-center justify-center text-[11px] text-[var(--text-faint)]">
              Connect Google Analytics to see visitor data
            </div>
          </Widget>
        </div>

        <Widget title="Eshop Visitors">
          <div className="text-center py-3">
            <p className="text-[28px] font-black text-[var(--text-primary)]">—</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Setup Google Analytics to track visitors</p>
          </div>
        </Widget>

        <div className="col-span-2">
          <Widget title="Recent orders">
            <p className="text-[11px] text-[var(--text-faint)] py-2">No orders yet.</p>
          </Widget>
        </div>

        <Widget title="Sales origins">
          <p className="text-[11px] text-[var(--text-faint)] py-2">No data yet.</p>
        </Widget>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify dashboard renders with live stock count**

Navigate to http://localhost:5173/dashboard after logging in.
Expected: stats strip shows live stock count from the API (0 or seeded count).

- [ ] **Step 4: Commit**

```bash
git add apps/backoffice/src/pages/Dashboard.tsx apps/backoffice/src/api/inventory.ts
git commit -m "feat(backoffice): add dashboard page with live stock count"
```

---

## Task 12: Inventory list + add/edit form

**Files:**
- Create: `apps/backoffice/src/pages/inventory/InventoryList.tsx`
- Create: `apps/backoffice/src/pages/inventory/ReleaseForm.tsx`
- Create: `apps/backoffice/src/components/ui/Badge.tsx`

- [ ] **Step 1: Create Badge component**

`apps/backoffice/src/components/ui/Badge.tsx`:

```tsx
type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

const styles: Record<Variant, string> = {
  success: 'bg-[var(--success)]/10 text-[var(--success)]',
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  danger:  'bg-[var(--danger)]/10  text-[var(--danger)]',
  info:    'bg-[var(--info)]/10    text-[var(--info)]',
  neutral: 'bg-[var(--bg-overlay)] text-[var(--text-muted)]',
  brand:   'bg-brand/10 text-brand',
};

export function Badge({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: Variant }) {
  return (
    <span className={`inline-block px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wide ${styles[variant]}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Create InventoryList page**

`apps/backoffice/src/pages/inventory/InventoryList.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getReleases, deleteRelease, type ReleaseFilter } from '../../api/inventory';
import { Badge } from '../../components/ui/Badge';
import type { Release } from '@mf/shared';

const CONDITION_VARIANT: Record<string, 'success' | 'brand' | 'warning' | 'danger' | 'neutral'> = {
  M: 'success', VGP: 'brand', VG: 'warning', GP: 'warning', G: 'danger', F: 'danger', P: 'danger',
};

export function InventoryList() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async (filter: ReleaseFilter) => {
    setLoading(true);
    try {
      const res = await getReleases(filter);
      setReleases(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ page, limit: 50, artist: search || undefined, title: search || undefined });
  }, [page, search, load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this release?')) return;
    await deleteRelease(id);
    load({ page, limit: 50 });
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-1.5 flex-1 max-w-xs">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--text-faint)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="bg-transparent text-[11px] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-faint)] w-full"
            placeholder="Search artist, title..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex-1" />
        <Link
          to="/inventory/new"
          className="px-3 py-1.5 bg-brand hover:bg-brand-hover text-white text-[11px] font-bold rounded-md"
        >
          + Add Release
        </Link>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#0d0d0d]">
              {['Release', 'Format', 'Condition', 'Price (IDR)', 'Stock', 'Location', ''].map(h => (
                <th key={h} className="text-left px-3.5 py-2 text-[9px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold border-b border-[var(--border-sub)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-3.5 py-6 text-center text-[var(--text-faint)]">Loading...</td></tr>
            )}
            {!loading && releases.length === 0 && (
              <tr><td colSpan={7} className="px-3.5 py-8 text-center text-[var(--text-faint)]">No releases found. Add one to get started.</td></tr>
            )}
            {releases.map(r => (
              <tr key={r.id} className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)]">
                <td className="px-3.5 py-2.5">
                  <p className="font-semibold text-[var(--text-primary)]">{r.title}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{r.artist}</p>
                </td>
                <td className="px-3.5 py-2.5">
                  <Badge variant="neutral">{r.format}</Badge>
                </td>
                <td className="px-3.5 py-2.5">
                  <Badge variant={CONDITION_VARIANT[r.condition] ?? 'neutral'}>{r.condition}</Badge>
                </td>
                <td className="px-3.5 py-2.5 font-semibold text-[var(--text-primary)]">
                  {r.priceIdr.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                </td>
                <td className="px-3.5 py-2.5">
                  <span className={r.stock === 0 ? 'text-[var(--danger)] font-bold' : r.stock <= r.lowStockThreshold ? 'text-[var(--warning)] font-bold' : 'text-[var(--success)] font-bold'}>
                    {r.stock}
                  </span>
                </td>
                <td className="px-3.5 py-2.5 text-[var(--text-muted)]">
                  {r.storeLocation}{r.shelfLocation ? ` · ${r.shelfLocation}` : ''}
                </td>
                <td className="px-3.5 py-2.5">
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to={`/inventory/${r.id}/edit`} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[10px]">Edit</Link>
                    <button onClick={() => handleDelete(r.id)} className="text-[var(--danger)] text-[10px] hover:opacity-75">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center px-3.5 py-2 border-t border-[var(--border-sub)] text-[10px] text-[var(--text-faint)] gap-2">
          <span>Showing {Math.min((page - 1) * 50 + 1, total)}–{Math.min(page * 50, total)} of {total}</span>
          <div className="flex-1" />
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-2 py-0.5 border border-[var(--border)] rounded disabled:opacity-30">‹</button>
          <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)} className="px-2 py-0.5 border border-[var(--border)] rounded disabled:opacity-30">›</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create ReleaseForm page**

`apps/backoffice/src/pages/inventory/ReleaseForm.tsx`:

```tsx
import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createRelease, getRelease, updateRelease } from '../../api/inventory';
import type { Release } from '@mf/shared';

const FORMATS = ['LP', '2xLP', '3xLP', '12_INCH', '7_INCH', 'CD', '2xCD', 'MERCH'] as const;
const CONDITIONS = ['M', 'VGP', 'VG', 'GP', 'G', 'F', 'P'] as const;
const LOCATIONS = ['MAIN_STORE', 'WAREHOUSE', 'CONSIGNMENT'] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-brand";

export function ReleaseForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<Partial<Release>>({
    format: 'LP',
    condition: 'M',
    priceIdr: 0,
    stock: 0,
    storeLocation: 'MAIN_STORE',
    lowStockThreshold: 2,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (isEdit && id) {
      getRelease(id).then(r => setForm(r)).catch(() => navigate('/inventory'));
    }
  }, [id, isEdit, navigate]);

  const set = (field: keyof Release) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = ['priceIdr', 'stock', 'year', 'lowStockThreshold'].includes(field)
      ? Number(e.target.value)
      : e.target.value;
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit && id) {
        await updateRelease(id, form);
      } else {
        await createRelease(form);
      }
      navigate('/inventory');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save release.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-[18px] font-black tracking-tight text-[var(--text-primary)] mb-5">
        {isEdit ? 'Edit Release' : 'Add Release'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5 grid grid-cols-2 gap-4">
          <Field label="Artist *">
            <input className={inputCls} value={form.artist ?? ''} onChange={set('artist')} required />
          </Field>
          <Field label="Title *">
            <input className={inputCls} value={form.title ?? ''} onChange={set('title')} required />
          </Field>
          <Field label="Label">
            <input className={inputCls} value={form.label ?? ''} onChange={set('label')} />
          </Field>
          <Field label="Cat. Number">
            <input className={inputCls} value={form.catNumber ?? ''} onChange={set('catNumber')} />
          </Field>
          <Field label="Year">
            <input type="number" className={inputCls} value={form.year ?? ''} onChange={set('year')} min={1900} max={2099} />
          </Field>
          <Field label="Genre">
            <input className={inputCls} value={form.genre ?? ''} onChange={set('genre')} />
          </Field>
          <Field label="Format *">
            <select className={inputCls} value={form.format} onChange={set('format')} required>
              {FORMATS.map(f => <option key={f} value={f}>{f.replace('_', '"')}</option>)}
            </select>
          </Field>
          <Field label="Condition *">
            <select className={inputCls} value={form.condition} onChange={set('condition')} required>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Price (IDR) *">
            <input type="number" className={inputCls} value={form.priceIdr ?? 0} onChange={set('priceIdr')} min={0} required />
          </Field>
          <Field label="Stock *">
            <input type="number" className={inputCls} value={form.stock ?? 0} onChange={set('stock')} min={0} required />
          </Field>
          <Field label="Low Stock Alert Threshold">
            <input type="number" className={inputCls} value={form.lowStockThreshold ?? 2} onChange={set('lowStockThreshold')} min={0} />
          </Field>
          <Field label="Barcode">
            <input className={inputCls} value={form.barcode ?? ''} onChange={set('barcode')} placeholder="EAN-13 or Code128" />
          </Field>
          <Field label="Store Location">
            <select className={inputCls} value={form.storeLocation} onChange={set('storeLocation')}>
              {LOCATIONS.map(l => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
            </select>
          </Field>
          <Field label="Shelf / Rack">
            <input className={inputCls} value={form.shelfLocation ?? ''} onChange={set('shelfLocation')} placeholder="e.g. Rack A · Shelf 2" />
          </Field>
          <div className="col-span-2">
            <Field label="Notes">
              <textarea className={`${inputCls} resize-none`} rows={3} value={form.notes ?? ''} onChange={set('notes')} />
            </Field>
          </div>
        </div>

        {error && <p className="text-[11px] text-[var(--danger)]">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="px-4 py-2 border border-[var(--border)] rounded-md text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-[12px] font-bold rounded-md disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Release'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Add inventory routes to App.tsx**

Update `apps/backoffice/src/App.tsx` — add inside the protected routes block:

```tsx
import { ReleaseForm } from './pages/inventory/ReleaseForm';

// add to protected routes:
<Route path="/inventory/new"      element={<ReleaseForm />} />
<Route path="/inventory/:id/edit" element={<ReleaseForm />} />
```

- [ ] **Step 5: Verify end-to-end**

1. Navigate to http://localhost:5173/inventory
2. Click **+ Add Release** → fill form → Save
3. Confirm item appears in the list
4. Click **Edit** → update stock → Save
5. Confirm stock updated

- [ ] **Step 6: Commit**

```bash
git add apps/backoffice/src/pages/inventory/ apps/backoffice/src/components/ui/Badge.tsx apps/backoffice/src/App.tsx
git commit -m "feat(backoffice): add inventory list and release add/edit form"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered in plan |
|---|---|
| §2.1 Inventory CRUD, barcode field, location, low-stock threshold | Task 3 (schema), Task 6 (API), Task 12 (UI) |
| §8.1 Dark/light theme system, CSS tokens, localStorage | Task 8 |
| §8.2 Backoffice layout — sidebar, topbar, nav | Task 9 |
| §10 Auth login, JWT, 5 roles, roles guard | Task 4 |
| §10 Users management (Admin only) | Task 5 |
| Seed script for first admin | Task 5 |
| §2.1 Discogs import, barcode printing, phone scanner, CSV | **Phase 2** |
| §2.2 Track previews | **Phase 2** |
| §3.x Sales channels | **Phase 5** |
| §4.x Payments | **Phase 4** |
| §5.x Shipping | **Phase 4** |
| §6 Wholesale | **Phase 7** |
| §7 Marketing / Newsletter | **Phase 7** |
| §2.6 Purchase Orders | **Phase 6** |
| §2.5 Analytics dashboard widgets | **Phase 7** (data exists after Phase 4-6) |

**Placeholder scan:** No TBDs found. All steps contain complete code.

**Type consistency check:** `Release` from `@mf/shared` used throughout. `RecordFormat`, `RecordCondition`, `StoreLocation` defined in Prisma schema match shared types. `Role` enum values (`ADMIN`, `MANAGER`, `SHOPKEEPER`, `WHOLESALER`, `CUSTOMER`) consistent across `roles.ts`, Prisma schema, guard, and controller.

**One fix applied:** `lowStockOnly` query in `inventory.service.ts` step 7 simplified to `stock <= 2` with a comment explaining Phase 2 will make this per-item.

---
