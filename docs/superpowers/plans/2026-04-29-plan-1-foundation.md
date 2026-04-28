# Medium Format — Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core platform — monorepo, database, auth, inventory, orders, payments (Xendit + Stripe), shipping (Biteship), Discogs import, track preview, backoffice shell, and storefront shell.

**Architecture:** Turborepo monorepo with three apps (api, backoffice, storefront) and two shared packages (db, types). The API is NestJS with Prisma ORM connecting to Neon PostgreSQL. The backoffice is React + Vite + TailwindCSS. The storefront is Next.js 14 with SSR for SEO.

**Tech Stack:** Node.js 20, NestJS, Prisma, PostgreSQL (Neon), React 18, Next.js 14, TypeScript, TailwindCSS, Vitest, Jest, Cloudflare R2, Upstash Redis, Xendit Node SDK, Stripe Node SDK, Biteship REST API, Discogs API, JWT.

---

## File Structure

```
mediumformat/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── guards/roles.guard.ts
│   │   │   ├── inventory/
│   │   │   │   ├── inventory.module.ts
│   │   │   │   ├── inventory.service.ts
│   │   │   │   ├── inventory.controller.ts
│   │   │   │   └── dto/
│   │   │   ├── orders/
│   │   │   │   ├── orders.module.ts
│   │   │   │   ├── orders.service.ts
│   │   │   │   └── orders.controller.ts
│   │   │   ├── payments/
│   │   │   │   ├── xendit/
│   │   │   │   │   ├── xendit.module.ts
│   │   │   │   │   ├── xendit.service.ts
│   │   │   │   │   └── xendit.controller.ts  ← webhook handler
│   │   │   │   └── stripe/
│   │   │   │       ├── stripe.module.ts
│   │   │   │       ├── stripe.service.ts
│   │   │   │       └── stripe.controller.ts  ← webhook handler
│   │   │   ├── shipping/
│   │   │   │   ├── biteship/
│   │   │   │   │   ├── biteship.module.ts
│   │   │   │   │   └── biteship.service.ts
│   │   │   ├── discogs/
│   │   │   │   ├── discogs.module.ts
│   │   │   │   └── discogs.service.ts
│   │   │   ├── preview/
│   │   │   │   ├── preview.module.ts
│   │   │   │   └── preview.service.ts
│   │   │   ├── storage/
│   │   │   │   └── r2.service.ts
│   │   │   └── common/
│   │   │       ├── decorators/
│   │   │       └── filters/
│   │   ├── test/
│   │   └── package.json
│   ├── backoffice/
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── layouts/AppLayout.tsx
│   │   │   ├── components/ui/     ← shared UI primitives
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Inventory/
│   │   │   │   └── Orders/
│   │   │   ├── stores/            ← Zustand global state
│   │   │   ├── hooks/             ← React Query hooks per module
│   │   │   └── api/               ← typed API client (axios)
│   │   └── package.json
│   └── storefront/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx           ← homepage
│       │   ├── shop/
│       │   │   ├── page.tsx       ← release grid
│       │   │   └── [slug]/page.tsx ← release detail
│       │   ├── cart/page.tsx
│       │   └── checkout/page.tsx
│       ├── components/
│       │   ├── NowPlayingBar.tsx
│       │   ├── ReleaseCard.tsx
│       │   └── TrackPlayer.tsx
│       └── package.json
├── packages/
│   ├── db/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/index.ts           ← exports PrismaClient
│   │   └── package.json
│   └── types/
│       ├── src/index.ts           ← shared TS types/enums
│       └── package.json
├── turbo.json
├── package.json
└── .env.example
```

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json` (root)
- Create: `turbo.json`
- Create: `.env.example`
- Create: `apps/api/package.json`
- Create: `apps/backoffice/package.json`
- Create: `apps/storefront/package.json`
- Create: `packages/db/package.json`
- Create: `packages/types/package.json`

- [ ] **Step 1: Initialise Turborepo monorepo**

```bash
npx create-turbo@latest mediumformat --package-manager npm
cd mediumformat
```

- [ ] **Step 2: Remove starter apps, scaffold correct structure**

```bash
rm -rf apps/web apps/docs
mkdir -p apps/api apps/backoffice apps/storefront packages/db packages/types
```

- [ ] **Step 3: Create API app with NestJS**

```bash
cd apps/api
npx @nestjs/cli new . --package-manager npm --skip-git
```

- [ ] **Step 4: Create backoffice with Vite + React + TypeScript**

```bash
cd apps/backoffice
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 5: Create storefront with Next.js**

```bash
cd apps/storefront
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

- [ ] **Step 6: Create packages/db**

```bash
cd packages/db
npm init -y
npm install prisma @prisma/client
npx prisma init
```

- [ ] **Step 7: Create packages/types**

```bash
cd packages/types
npm init -y
npm install -D typescript
```

Write `packages/types/src/index.ts`:

```typescript
export enum UserRole {
  ADMIN = 'ADMIN',
  STORE_MANAGER = 'STORE_MANAGER',
  SHOPKEEPER = 'SHOPKEEPER',
  WHOLESALER = 'WHOLESALER',
  CUSTOMER = 'CUSTOMER',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum RecordCondition {
  M = 'M',
  VG_PLUS = 'VG_PLUS',
  VG = 'VG',
  G_PLUS = 'G_PLUS',
  G = 'G',
  F = 'F',
  P = 'P',
}

export enum RecordFormat {
  VINYL = 'VINYL',
  CD = 'CD',
  MERCH = 'MERCH',
  ACCESSORY = 'ACCESSORY',
}

export enum PaymentMethod {
  VIRTUAL_ACCOUNT = 'VIRTUAL_ACCOUNT',
  EWALLET = 'EWALLET',
  QRIS = 'QRIS',
  CREDIT_CARD = 'CREDIT_CARD',
  PAYLATER = 'PAYLATER',
  RETAIL = 'RETAIL',
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
}

export enum PreviewSource {
  BANDCAMP = 'BANDCAMP',
  SPOTIFY = 'SPOTIFY',
  YOUTUBE = 'YOUTUBE',
  SOUNDCLOUD = 'SOUNDCLOUD',
  UPLOAD = 'UPLOAD',
}
```

- [ ] **Step 8: Create `.env.example`**

```bash
cat > .env.example << 'EOF'
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mediumformat"

# Auth
JWT_SECRET="change-me-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Cloudflare R2
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="mediumformat"
R2_PUBLIC_URL=""

# Xendit
XENDIT_SECRET_KEY=""
XENDIT_WEBHOOK_TOKEN=""

# Stripe
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# Biteship
BITESHIP_API_KEY=""

# Discogs
DISCOGS_CONSUMER_KEY=""
DISCOGS_CONSUMER_SECRET=""
DISCOGS_USER_TOKEN=""

# Spotify
SPOTIFY_CLIENT_ID=""
SPOTIFY_CLIENT_SECRET=""

# YouTube
YOUTUBE_API_KEY=""

# OpenRouter
OPENROUTER_API_KEY=""

# Fonnte (WhatsApp)
FONNTE_TOKEN=""

# Upstash Redis
UPSTASH_REDIS_URL=""
UPSTASH_REDIS_TOKEN=""

# App URLs
API_URL="http://localhost:3001"
BACKOFFICE_URL="http://localhost:3000"
STOREFRONT_URL="http://localhost:3002"
EOF
```

- [ ] **Step 9: Configure turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    }
  }
}
```

- [ ] **Step 10: Verify monorepo starts**

```bash
npm run dev
```

Expected: All three apps start on ports 3000, 3001, 3002 without errors.

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat: scaffold Turborepo monorepo with api, backoffice, storefront, db, types packages"
```

---

## Task 2: Database Schema

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/src/index.ts`

- [ ] **Step 1: Write Prisma schema**

```prisma
// packages/db/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         UserRole @default(CUSTOMER)
  avatarUrl    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  orders       Order[]
  wishlists    Wishlist[]
  blogPosts    BlogPost[]

  @@map("users")
}

enum UserRole {
  ADMIN
  STORE_MANAGER
  SHOPKEEPER
  WHOLESALER
  CUSTOMER
}

model Release {
  id              String          @id @default(cuid())
  title           String
  artist          String
  label           String?
  catalogNumber   String?
  year            Int?
  format          RecordFormat
  genre           String?
  condition       RecordCondition
  priceIdr        Int
  stock           Int             @default(0)
  notes           String?
  slug            String          @unique
  discogsId       String?         @unique
  images          String[]
  barcode         String?         @unique
  storeLocation   String?
  shelfLocation   String?
  lowStockThreshold Int           @default(2)
  isActive        Boolean         @default(true)
  weight          Int?            // grams
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  previewSources  PreviewTrack[]
  orderItems      OrderItem[]
  wishlists       Wishlist[]
  staffPickItems  StaffPickItem[]
  channelListings ChannelListing[]

  @@map("releases")
}

enum RecordFormat {
  VINYL
  CD
  MERCH
  ACCESSORY
}

enum RecordCondition {
  M
  VG_PLUS
  VG
  G_PLUS
  G
  F
  P
}

model PreviewTrack {
  id          String        @id @default(cuid())
  releaseId   String
  release     Release       @relation(fields: [releaseId], references: [id])
  trackNumber Int
  trackTitle  String?
  source      PreviewSource
  url         String
  isActive    Boolean       @default(false)
  createdAt   DateTime      @default(now())

  @@map("preview_tracks")
}

enum PreviewSource {
  BANDCAMP
  SPOTIFY
  YOUTUBE
  SOUNDCLOUD
  UPLOAD
}

model Order {
  id              String        @id @default(cuid())
  orderNumber     String        @unique
  customerId      String?
  customer        User?         @relation(fields: [customerId], references: [id])
  customerName    String
  customerEmail   String
  customerPhone   String?
  shippingAddress Json
  status          OrderStatus   @default(PENDING)
  channel         SalesChannel  @default(WEBSITE)
  paymentMethod   PaymentMethod?
  paymentStatus   PaymentStatus @default(UNPAID)
  paymentRef      String?
  subtotalIdr     Int
  shippingIdr     Int           @default(0)
  discountIdr     Int           @default(0)
  totalIdr        Int
  courierId       String?
  trackingNumber  String?
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  items           OrderItem[]

  @@map("orders")
}

model OrderItem {
  id         String  @id @default(cuid())
  orderId    String
  order      Order   @relation(fields: [orderId], references: [id])
  releaseId  String
  release    Release @relation(fields: [releaseId], references: [id])
  quantity   Int
  priceIdr   Int

  @@map("order_items")
}

enum OrderStatus {
  PENDING
  PROCESSING
  PACKED
  SHIPPED
  DELIVERED
  COMPLETED
  CANCELLED
  REFUNDED
}

enum SalesChannel {
  WEBSITE
  POS
  TOKOPEDIA
  SHOPEE
  DISCOGS
  META
  EBAY
}

enum PaymentMethod {
  VIRTUAL_ACCOUNT
  EWALLET
  QRIS
  CREDIT_CARD
  PAYLATER
  RETAIL
  STRIPE
  PAYPAL
}

enum PaymentStatus {
  UNPAID
  PAID
  EXPIRED
  FAILED
  REFUNDED
}

model Wishlist {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  releaseId String
  release   Release  @relation(fields: [releaseId], references: [id])
  createdAt DateTime @default(now())

  @@unique([userId, releaseId])
  @@map("wishlists")
}

model BlogPost {
  id              String        @id @default(cuid())
  slug            String        @unique
  title           String
  type            BlogPostType
  status          BlogPostStatus @default(DRAFT)
  authorId        String
  author          User          @relation(fields: [authorId], references: [id])
  featuredImage   String?
  content         Json          // block-based rich text (Plate.js format)
  excerpt         String?
  metaTitle       String?
  metaDescription String?
  publishedAt     DateTime?
  scheduledAt     DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  staffPickItems  StaffPickItem[]

  @@map("blog_posts")
}

enum BlogPostType {
  STAFF_PICKS
  HIGHLIGHTS
  NEWS
  NEW_ARRIVALS
  REVIEW
  FEATURE
  EVENT
}

enum BlogPostStatus {
  DRAFT
  SCHEDULED
  PUBLISHED
}

model StaffPickItem {
  id         String   @id @default(cuid())
  postId     String
  post       BlogPost @relation(fields: [postId], references: [id])
  releaseId  String
  release    Release  @relation(fields: [releaseId], references: [id])
  staffNote  String?
  sortOrder  Int      @default(0)

  @@map("staff_pick_items")
}

model ChannelListing {
  id            String       @id @default(cuid())
  releaseId     String
  release       Release      @relation(fields: [releaseId], references: [id])
  channel       SalesChannel
  externalId    String?
  priceIdr      Int?         // computed price for that channel; null = use base price
  isActive      Boolean      @default(true)
  lastSyncedAt  DateTime?
  syncError     String?

  @@unique([releaseId, channel])
  @@map("channel_listings")
}

model Setting {
  key       String @id
  value     Json
  updatedAt DateTime @updatedAt

  @@map("settings")
}
```

- [ ] **Step 2: Run migration**

```bash
cd packages/db
npx prisma migrate dev --name init
```

Expected: Migration created and applied. Prisma Client generated.

- [ ] **Step 3: Export PrismaClient from package**

Write `packages/db/src/index.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export { PrismaClient } from '@prisma/client'
export * from '@prisma/client'
```

- [ ] **Step 4: Commit**

```bash
git add packages/db/
git commit -m "feat: define full Prisma schema with all models and enums"
```

---

## Task 3: Auth Module

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/jwt.strategy.ts`
- Create: `apps/api/src/auth/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/auth/guards/roles.guard.ts`
- Create: `apps/api/src/auth/decorators/roles.decorator.ts`
- Test: `apps/api/test/auth.service.spec.ts`

- [ ] **Step 1: Install auth dependencies**

```bash
cd apps/api
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

- [ ] **Step 2: Write failing test**

Create `apps/api/test/auth.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { AuthService } from '../src/auth/auth.service'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../src/prisma/prisma.service'

describe('AuthService', () => {
  let service: AuthService

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: { sign: jest.fn(() => 'token') } },
      ],
    }).compile()
    service = module.get(AuthService)
  })

  it('returns null for unknown email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const result = await service.validateUser('no@user.com', 'pass')
    expect(result).toBeNull()
  })

  it('returns null for wrong password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'a@b.com',
      passwordHash: '$2b$10$invalidhash',
      role: 'ADMIN',
    })
    const result = await service.validateUser('a@b.com', 'wrongpass')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/api && npm test -- auth.service
```

Expected: FAIL — `AuthService` not found.

- [ ] **Step 4: Create PrismaService wrapper**

Create `apps/api/src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@mediumformat/db'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect()
  }
}
```

- [ ] **Step 5: Implement AuthService**

Create `apps/api/src/auth/auth.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import { User } from '@mediumformat/db'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) return null
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return null
    const { passwordHash, ...result } = user
    return result
  }

  login(user: Omit<User, 'passwordHash'>) {
    const payload = { sub: user.id, email: user.email, role: user.role }
    return {
      accessToken: this.jwt.sign(payload, { expiresIn: process.env.JWT_EXPIRES_IN }),
      refreshToken: this.jwt.sign(payload, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }),
      user,
    }
  }

  async register(email: string, password: string, name: string) {
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name },
    })
    const { passwordHash: _, ...result } = user
    return this.login(result)
  }
}
```

- [ ] **Step 6: Implement JWT strategy and guards**

Create `apps/api/src/auth/jwt.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET!,
    })
  }

  validate(payload: { sub: string; email: string; role: string }) {
    return { id: payload.sub, email: payload.email, role: payload.role }
  }
}
```

Create `apps/api/src/auth/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

Create `apps/api/src/auth/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common'
import { UserRole } from '@mediumformat/types'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)
```

Create `apps/api/src/auth/guards/roles.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { UserRole } from '@mediumformat/types'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles) return true
    const { user } = context.switchToHttp().getRequest()
    return requiredRoles.includes(user.role)
  }
}
```

- [ ] **Step 7: Create AuthController**

Create `apps/api/src/auth/auth.controller.ts`:

```typescript
import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.auth.validateUser(body.email, body.password)
    if (!user) throw new UnauthorizedException('Invalid credentials')
    return this.auth.login(user)
  }

  @Post('register')
  register(@Body() body: { email: string; password: string; name: string }) {
    return this.auth.register(body.email, body.password, body.name)
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
cd apps/api && npm test -- auth.service
```

Expected: PASS — 2 tests passing.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/auth/ apps/api/src/prisma/ apps/api/test/auth.service.spec.ts
git commit -m "feat: add JWT auth module with roles guard"
```

---

## Task 4: Inventory Module (API)

**Files:**
- Create: `apps/api/src/inventory/inventory.module.ts`
- Create: `apps/api/src/inventory/inventory.service.ts`
- Create: `apps/api/src/inventory/inventory.controller.ts`
- Create: `apps/api/src/inventory/dto/create-release.dto.ts`
- Test: `apps/api/test/inventory.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/test/inventory.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { InventoryService } from '../src/inventory/inventory.service'
import { PrismaService } from '../src/prisma/prisma.service'

const mockRelease = {
  id: 'rel-1',
  title: 'Kind of Blue',
  artist: 'Miles Davis',
  format: 'VINYL',
  condition: 'VG_PLUS',
  priceIdr: 350000,
  stock: 2,
  slug: 'miles-davis-kind-of-blue',
}

describe('InventoryService', () => {
  let service: InventoryService
  const mockPrisma = {
    release: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get(InventoryService)
  })

  it('lists all active releases', async () => {
    mockPrisma.release.findMany.mockResolvedValue([mockRelease])
    const result = await service.findAll({})
    expect(result).toHaveLength(1)
    expect(mockPrisma.release.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
    )
  })

  it('generates slug from artist and title', async () => {
    mockPrisma.release.create.mockResolvedValue(mockRelease)
    await service.create({
      title: 'Kind of Blue',
      artist: 'Miles Davis',
      format: 'VINYL' as any,
      condition: 'VG_PLUS' as any,
      priceIdr: 350000,
      stock: 2,
    })
    expect(mockPrisma.release.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'miles-davis-kind-of-blue' }),
      }),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && npm test -- inventory.service
```

Expected: FAIL — `InventoryService` not found.

- [ ] **Step 3: Implement InventoryService**

Create `apps/api/src/inventory/inventory.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RecordFormat, RecordCondition } from '@mediumformat/db'
import slugify from 'slugify'

export interface CreateReleaseDto {
  title: string
  artist: string
  label?: string
  catalogNumber?: string
  year?: number
  format: RecordFormat
  genre?: string
  condition: RecordCondition
  priceIdr: number
  stock: number
  notes?: string
  images?: string[]
  barcode?: string
  storeLocation?: string
  shelfLocation?: string
  lowStockThreshold?: number
  weight?: number
  discogsId?: string
}

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: {
    format?: RecordFormat
    condition?: RecordCondition
    genre?: string
    search?: string
    hasPreview?: boolean
  }) {
    return this.prisma.release.findMany({
      where: {
        isActive: true,
        ...(filters.format && { format: filters.format }),
        ...(filters.condition && { condition: filters.condition }),
        ...(filters.genre && { genre: filters.genre }),
        ...(filters.search && {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { artist: { contains: filters.search, mode: 'insensitive' } },
            { label: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
        ...(filters.hasPreview && {
          previewSources: { some: { isActive: true } },
        }),
      },
      include: { previewSources: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  findOne(id: string) {
    return this.prisma.release.findUnique({
      where: { id },
      include: { previewSources: true, channelListings: true },
    })
  }

  findBySlug(slug: string) {
    return this.prisma.release.findUnique({
      where: { slug },
      include: { previewSources: { where: { isActive: true } } },
    })
  }

  create(dto: CreateReleaseDto) {
    const slug = slugify(`${dto.artist} ${dto.title}`, { lower: true, strict: true })
    return this.prisma.release.create({
      data: { ...dto, slug },
    })
  }

  update(id: string, dto: Partial<CreateReleaseDto>) {
    return this.prisma.release.update({ where: { id }, data: dto })
  }

  softDelete(id: string) {
    return this.prisma.release.update({ where: { id }, data: { isActive: false } })
  }

  adjustStock(id: string, delta: number) {
    return this.prisma.release.update({
      where: { id },
      data: { stock: { increment: delta } },
    })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/api && npm test -- inventory.service
```

Expected: PASS — 2 tests passing.

- [ ] **Step 5: Implement InventoryController**

Create `apps/api/src/inventory/inventory.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { InventoryService, CreateReleaseDto } from './inventory.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@mediumformat/types'
import { RecordFormat, RecordCondition } from '@mediumformat/db'

@Controller('inventory')
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  @Get()
  findAll(
    @Query('format') format?: RecordFormat,
    @Query('condition') condition?: RecordCondition,
    @Query('genre') genre?: string,
    @Query('search') search?: string,
    @Query('hasPreview') hasPreview?: string,
  ) {
    return this.inventory.findAll({ format, condition, genre, search, hasPreview: hasPreview === 'true' })
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventory.findOne(id)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STORE_MANAGER)
  @Post()
  create(@Body() dto: CreateReleaseDto) {
    return this.inventory.create(dto)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STORE_MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateReleaseDto>) {
    return this.inventory.update(id, dto)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STORE_MANAGER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inventory.softDelete(id)
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/inventory/ apps/api/test/inventory.service.spec.ts
git commit -m "feat: add inventory module with CRUD, search, stock adjustment"
```

---

## Task 5: Discogs Import Service

**Files:**
- Create: `apps/api/src/discogs/discogs.service.ts`
- Create: `apps/api/src/discogs/discogs.module.ts`
- Test: `apps/api/test/discogs.service.spec.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd apps/api && npm install axios
```

- [ ] **Step 2: Write failing test**

Create `apps/api/test/discogs.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { DiscogsService } from '../src/discogs/discogs.service'
import { HttpService } from '@nestjs/axios'
import { of } from 'rxjs'

describe('DiscogsService', () => {
  let service: DiscogsService
  const mockHttp = { get: jest.fn() }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DiscogsService,
        { provide: HttpService, useValue: mockHttp },
      ],
    }).compile()
    service = module.get(DiscogsService)
  })

  it('maps Discogs release to CreateReleaseDto', async () => {
    mockHttp.get.mockReturnValue(of({
      data: {
        id: 12345,
        title: 'Kind of Blue',
        artists: [{ name: 'Miles Davis' }],
        labels: [{ name: 'Columbia', catno: 'CL 1355' }],
        year: 1959,
        formats: [{ name: 'Vinyl' }],
        genres: ['Jazz'],
        images: [{ uri: 'https://discogs.com/img.jpg', type: 'primary' }],
      },
    }))

    const result = await service.fetchRelease('12345')
    expect(result.title).toBe('Kind of Blue')
    expect(result.artist).toBe('Miles Davis')
    expect(result.label).toBe('Columbia')
    expect(result.catalogNumber).toBe('CL 1355')
    expect(result.year).toBe(1959)
    expect(result.format).toBe('VINYL')
    expect(result.discogsId).toBe('12345')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/api && npm test -- discogs.service
```

Expected: FAIL.

- [ ] **Step 4: Implement DiscogsService**

Create `apps/api/src/discogs/discogs.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { RecordFormat } from '@mediumformat/db'
import { CreateReleaseDto } from '../inventory/inventory.service'

@Injectable()
export class DiscogsService {
  private readonly baseUrl = 'https://api.discogs.com'

  constructor(private http: HttpService) {}

  private get headers() {
    return {
      Authorization: `Discogs token=${process.env.DISCOGS_USER_TOKEN}`,
      'User-Agent': 'MediumFormat/1.0',
    }
  }

  async fetchRelease(discogsId: string): Promise<Partial<CreateReleaseDto> & { discogsId: string }> {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/releases/${discogsId}`, { headers: this.headers }),
    )

    const formatName = data.formats?.[0]?.name?.toLowerCase() ?? ''
    const format: RecordFormat =
      formatName.includes('vinyl') || formatName.includes('lp') ? 'VINYL'
      : formatName.includes('cd') ? 'CD'
      : 'VINYL'

    const primaryImage = data.images?.find((i: any) => i.type === 'primary')?.uri
      ?? data.images?.[0]?.uri

    return {
      discogsId: String(data.id),
      title: data.title,
      artist: data.artists?.map((a: any) => a.name.replace(/\s*\(\d+\)$/, '')).join(', '),
      label: data.labels?.[0]?.name,
      catalogNumber: data.labels?.[0]?.catno,
      year: data.year,
      format,
      genre: data.genres?.[0],
      images: primaryImage ? [primaryImage] : [],
    }
  }

  async search(query: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/database/search`, {
        headers: this.headers,
        params: { q: query, type: 'release', per_page: 10 },
      }),
    )
    return data.results
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd apps/api && npm test -- discogs.service
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/discogs/ apps/api/test/discogs.service.spec.ts
git commit -m "feat: add Discogs import service with release mapping"
```

---

## Task 6: Track Preview Service

**Files:**
- Create: `apps/api/src/preview/preview.service.ts`
- Create: `apps/api/src/preview/preview.module.ts`
- Test: `apps/api/test/preview.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/test/preview.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { PreviewService } from '../src/preview/preview.service'
import { HttpService } from '@nestjs/axios'
import { PrismaService } from '../src/prisma/prisma.service'
import { of } from 'rxjs'

describe('PreviewService', () => {
  let service: PreviewService

  const mockHttp = { get: jest.fn() }
  const mockPrisma = {
    previewTrack: { createMany: jest.fn(), updateMany: jest.fn() },
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PreviewService,
        { provide: HttpService, useValue: mockHttp },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get(PreviewService)
  })

  it('returns ranked sources: BANDCAMP first', async () => {
    const sources = [
      { source: 'YOUTUBE', url: 'https://youtube.com/x' },
      { source: 'BANDCAMP', url: 'https://artist.bandcamp.com/x' },
      { source: 'SPOTIFY', url: 'https://open.spotify.com/x' },
    ]
    const ranked = service.rankSources(sources as any)
    expect(ranked[0].source).toBe('BANDCAMP')
    expect(ranked[1].source).toBe('SPOTIFY')
    expect(ranked[2].source).toBe('YOUTUBE')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && npm test -- preview.service
```

Expected: FAIL.

- [ ] **Step 3: Implement PreviewService**

Create `apps/api/src/preview/preview.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { PrismaService } from '../prisma/prisma.service'
import { firstValueFrom } from 'rxjs'
import { PreviewSource } from '@mediumformat/db'

const SOURCE_RANK: Record<PreviewSource, number> = {
  BANDCAMP: 0,
  SPOTIFY: 1,
  YOUTUBE: 2,
  SOUNDCLOUD: 3,
  UPLOAD: 4,
}

interface PreviewCandidate {
  source: PreviewSource
  url: string
  trackNumber?: number
  trackTitle?: string
}

@Injectable()
export class PreviewService {
  constructor(
    private http: HttpService,
    private prisma: PrismaService,
  ) {}

  rankSources(sources: PreviewCandidate[]): PreviewCandidate[] {
    return [...sources].sort((a, b) => SOURCE_RANK[a.source] - SOURCE_RANK[b.source])
  }

  async autoLink(releaseId: string, artist: string, title: string, catalogNumber?: string) {
    const found: PreviewCandidate[] = []
    const query = `${artist} ${title}${catalogNumber ? ' ' + catalogNumber : ''}`

    // Spotify search
    try {
      const token = await this.getSpotifyToken()
      const { data } = await firstValueFrom(
        this.http.get('https://api.spotify.com/v1/search', {
          headers: { Authorization: `Bearer ${token}` },
          params: { q: query, type: 'album', limit: 1 },
        }),
      )
      const album = data.albums?.items?.[0]
      if (album) {
        found.push({ source: 'SPOTIFY', url: album.external_urls.spotify })
      }
    } catch (_) {}

    // YouTube search
    try {
      const { data } = await firstValueFrom(
        this.http.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            key: process.env.YOUTUBE_API_KEY,
            q: query,
            type: 'video',
            maxResults: 1,
            part: 'id',
          },
        }),
      )
      const videoId = data.items?.[0]?.id?.videoId
      if (videoId) {
        found.push({ source: 'YOUTUBE', url: `https://www.youtube.com/watch?v=${videoId}` })
      }
    } catch (_) {}

    if (found.length === 0) return []

    const ranked = this.rankSources(found)

    await this.prisma.previewTrack.createMany({
      data: ranked.map((s, i) => ({
        releaseId,
        source: s.source,
        url: s.url,
        trackNumber: 0,
        isActive: i === 0,
      })),
      skipDuplicates: true,
    })

    return ranked
  }

  async setActiveSource(releaseId: string, previewTrackId: string) {
    await this.prisma.previewTrack.updateMany({
      where: { releaseId },
      data: { isActive: false },
    })
    return this.prisma.previewTrack.updateMany({
      where: { id: previewTrackId, releaseId },
      data: { isActive: true },
    })
  }

  private async getSpotifyToken(): Promise<string> {
    const creds = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
    ).toString('base64')
    const { data } = await firstValueFrom(
      this.http.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    )
    return data.access_token
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/api && npm test -- preview.service
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/preview/ apps/api/test/preview.service.spec.ts
git commit -m "feat: add track preview auto-link service with Spotify + YouTube search"
```

---

## Task 7: Orders Module (API)

**Files:**
- Create: `apps/api/src/orders/orders.service.ts`
- Create: `apps/api/src/orders/orders.controller.ts`
- Test: `apps/api/test/orders.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/test/orders.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { OrdersService } from '../src/orders/orders.service'
import { PrismaService } from '../src/prisma/prisma.service'

describe('OrdersService', () => {
  let service: OrdersService
  const mockPrisma = {
    order: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    release: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get(OrdersService)
  })

  it('generates sequential order number', () => {
    const num = service.generateOrderNumber()
    expect(num).toMatch(/^MF-\d{8}-\d{4}$/)
  })

  it('calculates correct total', () => {
    const items = [
      { priceIdr: 200000, quantity: 2 },
      { priceIdr: 150000, quantity: 1 },
    ]
    expect(service.calcSubtotal(items)).toBe(550000)
  })
})
```

- [ ] **Step 2: Implement OrdersService**

Create `apps/api/src/orders/orders.service.ts`:

```typescript
import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { OrderStatus, SalesChannel } from '@mediumformat/db'

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  generateOrderNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const rand = Math.floor(Math.random() * 9000 + 1000)
    return `MF-${date}-${rand}`
  }

  calcSubtotal(items: { priceIdr: number; quantity: number }[]): number {
    return items.reduce((sum, i) => sum + i.priceIdr * i.quantity, 0)
  }

  async create(dto: {
    customerName: string
    customerEmail: string
    customerPhone?: string
    customerId?: string
    shippingAddress: object
    channel: SalesChannel
    items: { releaseId: string; quantity: number }[]
    shippingIdr?: number
    discountIdr?: number
  }) {
    return this.prisma.$transaction(async (tx) => {
      const itemsWithPrice = await Promise.all(
        dto.items.map(async (item) => {
          const release = await tx.release.findUnique({ where: { id: item.releaseId } })
          if (!release) throw new BadRequestException(`Release ${item.releaseId} not found`)
          if (release.stock < item.quantity) throw new BadRequestException(`Insufficient stock for ${release.title}`)
          return { ...item, priceIdr: release.priceIdr }
        }),
      )

      // Decrement stock
      await Promise.all(
        itemsWithPrice.map((item) =>
          tx.release.update({
            where: { id: item.releaseId },
            data: { stock: { decrement: item.quantity } },
          }),
        ),
      )

      const subtotal = this.calcSubtotal(itemsWithPrice)
      const shipping = dto.shippingIdr ?? 0
      const discount = dto.discountIdr ?? 0

      return tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          customerName: dto.customerName,
          customerEmail: dto.customerEmail,
          customerPhone: dto.customerPhone,
          customerId: dto.customerId,
          shippingAddress: dto.shippingAddress,
          channel: dto.channel,
          subtotalIdr: subtotal,
          shippingIdr: shipping,
          discountIdr: discount,
          totalIdr: subtotal + shipping - discount,
          items: {
            create: itemsWithPrice.map((i) => ({
              releaseId: i.releaseId,
              quantity: i.quantity,
              priceIdr: i.priceIdr,
            })),
          },
        },
        include: { items: { include: { release: true } } },
      })
    })
  }

  findAll(filters: { status?: OrderStatus; channel?: SalesChannel }) {
    return this.prisma.order.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.channel && { channel: filters.channel }),
      },
      include: { items: { include: { release: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { release: true } }, customer: true },
    })
  }

  updateStatus(id: string, status: OrderStatus) {
    return this.prisma.order.update({ where: { id }, data: { status } })
  }

  addTracking(id: string, courierId: string, trackingNumber: string) {
    return this.prisma.order.update({
      where: { id },
      data: { courierId, trackingNumber, status: 'SHIPPED' },
    })
  }
}
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd apps/api && npm test -- orders.service
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/orders/ apps/api/test/orders.service.spec.ts
git commit -m "feat: add orders module with stock decrement transaction and order number generation"
```

---

## Task 8: Xendit Payment Integration

**Files:**
- Create: `apps/api/src/payments/xendit/xendit.service.ts`
- Create: `apps/api/src/payments/xendit/xendit.controller.ts`
- Test: `apps/api/test/xendit.service.spec.ts`

- [ ] **Step 1: Install Xendit SDK**

```bash
cd apps/api && npm install xendit-node
```

- [ ] **Step 2: Write failing test**

Create `apps/api/test/xendit.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { XenditService } from '../src/payments/xendit/xendit.service'
import { PrismaService } from '../src/prisma/prisma.service'

describe('XenditService', () => {
  let service: XenditService
  const mockPrisma = {
    order: { update: jest.fn(), findUnique: jest.fn() },
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        XenditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get(XenditService)
  })

  it('maps bank code BCA to VIRTUAL_ACCOUNT payment method', () => {
    expect(service.bankToPaymentMethod('BCA')).toBe('VIRTUAL_ACCOUNT')
  })
})
```

- [ ] **Step 3: Implement XenditService**

Create `apps/api/src/payments/xendit/xendit.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import Xendit from 'xendit-node'
import { PrismaService } from '../../prisma/prisma.service'

const xendit = new Xendit({ secretKey: process.env.XENDIT_SECRET_KEY! })

@Injectable()
export class XenditService {
  constructor(private prisma: PrismaService) {}

  bankToPaymentMethod(_bank: string): string {
    return 'VIRTUAL_ACCOUNT'
  }

  async createVirtualAccount(orderId: string, bankCode: string, amount: number, customerName: string) {
    const va = await xendit.VirtualAcc.createFixedVA({
      externalID: orderId,
      bankCode,
      name: customerName,
      expectedAmt: amount,
      expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isClosed: true,
      isSingleUse: true,
    })

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentMethod: 'VIRTUAL_ACCOUNT', paymentRef: va.id },
    })

    return va
  }

  async createEWalletCharge(orderId: string, ewalletType: string, amount: number, phone: string, returnUrl: string) {
    const charge = await xendit.EWallet.createEWalletCharge({
      referenceID: orderId,
      currency: 'IDR',
      amount,
      checkoutMethod: 'ONE_TIME_PAYMENT',
      channelCode: ewalletType as any,
      channelProperties: { successReturnURL: returnUrl, failureReturnURL: returnUrl, mobileNumber: phone },
    })

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentMethod: 'EWALLET', paymentRef: charge.id },
    })

    return charge
  }

  async createQrisCharge(orderId: string, amount: number) {
    const charge = await xendit.QrCode.createQRCode({
      externalID: orderId,
      type: 'DYNAMIC',
      callbackURL: `${process.env.API_URL}/payments/xendit/webhook`,
      amount,
    })

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentMethod: 'QRIS', paymentRef: charge.id },
    })

    return charge
  }

  async handleWebhook(event: any) {
    const orderId = event.external_id ?? event.reference_id
    if (!orderId) return

    if (event.status === 'PAID' || event.status === 'COMPLETED' || event.status === 'SUCCEEDED') {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'PAID', status: 'PROCESSING' },
      })
    } else if (event.status === 'EXPIRED') {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'EXPIRED' },
      })
    }
  }
}
```

- [ ] **Step 4: Create Xendit webhook controller**

Create `apps/api/src/payments/xendit/xendit.controller.ts`:

```typescript
import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common'
import { XenditService } from './xendit.service'

@Controller('payments/xendit')
export class XenditController {
  constructor(private xendit: XenditService) {}

  @Post('webhook')
  async webhook(
    @Body() body: any,
    @Headers('x-callback-token') token: string,
  ) {
    if (token !== process.env.XENDIT_WEBHOOK_TOKEN) {
      throw new UnauthorizedException('Invalid webhook token')
    }
    await this.xendit.handleWebhook(body)
    return { received: true }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd apps/api && npm test -- xendit.service
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/payments/xendit/ apps/api/test/xendit.service.spec.ts
git commit -m "feat: add Xendit payment integration (VA, e-wallet, QRIS) with webhook handler"
```

---

## Task 9: Stripe Payment Integration

**Files:**
- Create: `apps/api/src/payments/stripe/stripe.service.ts`
- Create: `apps/api/src/payments/stripe/stripe.controller.ts`
- Test: `apps/api/test/stripe.service.spec.ts`

- [ ] **Step 1: Install Stripe SDK**

```bash
cd apps/api && npm install stripe
```

- [ ] **Step 2: Write failing test**

Create `apps/api/test/stripe.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { StripeService } from '../src/payments/stripe/stripe.service'
import { PrismaService } from '../src/prisma/prisma.service'

describe('StripeService', () => {
  let service: StripeService
  const mockPrisma = { order: { update: jest.fn() } }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get(StripeService)
  })

  it('converts IDR to USD cents for Stripe', () => {
    // 1 USD = ~16,300 IDR; function returns cents
    const cents = service.idrToUsdCents(163000)
    expect(cents).toBe(1000) // 163,000 IDR ≈ $10.00 = 1000 cents
  })
})
```

- [ ] **Step 3: Implement StripeService**

Create `apps/api/src/payments/stripe/stripe.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import Stripe from 'stripe'
import { PrismaService } from '../../prisma/prisma.service'

const IDR_TO_USD = 16300

@Injectable()
export class StripeService {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

  constructor(private prisma: PrismaService) {}

  idrToUsdCents(idr: number): number {
    return Math.round((idr / IDR_TO_USD) * 100)
  }

  async createPaymentIntent(orderId: string, amountIdr: number, customerEmail: string) {
    const intent = await this.stripe.paymentIntents.create({
      amount: this.idrToUsdCents(amountIdr),
      currency: 'usd',
      metadata: { orderId },
      receipt_email: customerEmail,
    })

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentMethod: 'STRIPE', paymentRef: intent.id },
    })

    return { clientSecret: intent.client_secret }
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent
      const orderId = intent.metadata.orderId
      await this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'PAID', status: 'PROCESSING' },
      })
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/api && npm test -- stripe.service
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/payments/stripe/ apps/api/test/stripe.service.spec.ts
git commit -m "feat: add Stripe payment integration with IDR-to-USD conversion and webhook"
```

---

## Task 10: Biteship Shipping Integration

**Files:**
- Create: `apps/api/src/shipping/biteship/biteship.service.ts`
- Test: `apps/api/test/biteship.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/test/biteship.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { BiteshipService } from '../src/shipping/biteship/biteship.service'
import { HttpService } from '@nestjs/axios'
import { of } from 'rxjs'

describe('BiteshipService', () => {
  let service: BiteshipService
  const mockHttp = { get: jest.fn() }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BiteshipService,
        { provide: HttpService, useValue: mockHttp },
      ],
    }).compile()
    service = module.get(BiteshipService)
  })

  it('returns available courier rates', async () => {
    mockHttp.get.mockReturnValue(of({
      data: {
        pricing: [
          { courier_name: 'JNE', courier_service_name: 'REG', price: 25000, min_day: 2, max_day: 3 },
        ],
      },
    }))

    const rates = await service.getRates({
      originPostalCode: '10110',
      destinationPostalCode: '60111',
      weightGrams: 500,
    })

    expect(rates).toHaveLength(1)
    expect(rates[0].courierName).toBe('JNE')
    expect(rates[0].priceIdr).toBe(25000)
  })
})
```

- [ ] **Step 2: Implement BiteshipService**

Create `apps/api/src/shipping/biteship/biteship.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'

@Injectable()
export class BiteshipService {
  private readonly baseUrl = 'https://api.biteship.com/v1'

  constructor(private http: HttpService) {}

  private get headers() {
    return { Authorization: `Bearer ${process.env.BITESHIP_API_KEY}` }
  }

  async getRates(params: {
    originPostalCode: string
    destinationPostalCode: string
    weightGrams: number
    heightCm?: number
    lengthCm?: number
    widthCm?: number
  }) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/rates/couriers`, {
        headers: this.headers,
        params: {
          origin_postal_code: params.originPostalCode,
          destination_postal_code: params.destinationPostalCode,
          items_weight: params.weightGrams,
          items_height: params.heightCm ?? 5,
          items_length: params.lengthCm ?? 32,
          items_width: params.widthCm ?? 32,
        },
      }),
    )

    return (data.pricing ?? []).map((p: any) => ({
      courierId: `${p.courier_code}_${p.courier_service_code}`,
      courierName: p.courier_name,
      serviceName: p.courier_service_name,
      priceIdr: p.price,
      minDay: p.min_day,
      maxDay: p.max_day,
    }))
  }

  async createOrder(params: {
    orderId: string
    courierCode: string
    courierServiceCode: string
    origin: object
    destination: object
    items: object[]
  }) {
    const { data } = await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/orders`,
        {
          reference_id: params.orderId,
          courier: { courier_code: params.courierCode, courier_service_code: params.courierServiceCode },
          origin: params.origin,
          destination: params.destination,
          delivery: { type: 'later' },
          items: params.items,
        },
        { headers: this.headers },
      ),
    )
    return { biteshipOrderId: data.id, trackingId: data.courier?.tracking_id }
  }
}
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd apps/api && npm test -- biteship.service
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/shipping/ apps/api/test/biteship.service.spec.ts
git commit -m "feat: add Biteship shipping integration with rate calculation and order creation"
```

---

## Task 11: Cloudflare R2 Storage Service

**Files:**
- Create: `apps/api/src/storage/r2.service.ts`
- Test: `apps/api/test/r2.service.spec.ts`

- [ ] **Step 1: Install AWS S3 SDK (R2 is S3-compatible)**

```bash
cd apps/api && npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] **Step 2: Implement R2Service**

Create `apps/api/src/storage/r2.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

@Injectable()
export class R2Service {
  private client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })

  private bucket = process.env.R2_BUCKET_NAME!
  private publicUrl = process.env.R2_PUBLIC_URL!

  async upload(file: Buffer, mimeType: string, folder: string): Promise<string> {
    const ext = mimeType.split('/')[1] ?? 'jpg'
    const key = `${folder}/${randomUUID()}.${ext}`

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
      }),
    )

    return `${this.publicUrl}/${key}`
  }

  async getPresignedUploadUrl(folder: string, mimeType: string): Promise<{ url: string; key: string }> {
    const ext = mimeType.split('/')[1] ?? 'jpg'
    const key = `${folder}/${randomUUID()}.${ext}`

    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: mimeType }),
      { expiresIn: 300 },
    )

    return { url, key }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/storage/
git commit -m "feat: add Cloudflare R2 storage service with presigned upload URLs"
```

---

## Task 12: Blog / Editorial Module (API)

**Files:**
- Create: `apps/api/src/blog/blog.service.ts`
- Create: `apps/api/src/blog/blog.controller.ts`
- Test: `apps/api/test/blog.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/test/blog.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { BlogService } from '../src/blog/blog.service'
import { PrismaService } from '../src/prisma/prisma.service'

describe('BlogService', () => {
  let service: BlogService
  const mockPrisma = {
    blogPost: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BlogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get(BlogService)
  })

  it('generates slug from post title', async () => {
    mockPrisma.blogPost.create.mockResolvedValue({ id: '1', slug: 'staff-picks-june-2026' })
    await service.create({
      title: 'Staff Picks June 2026',
      type: 'STAFF_PICKS',
      authorId: 'user-1',
      content: {},
    })
    expect(mockPrisma.blogPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'staff-picks-june-2026' }),
      }),
    )
  })

  it('returns only published posts for public listing', async () => {
    mockPrisma.blogPost.findMany.mockResolvedValue([])
    await service.findPublished({})
    expect(mockPrisma.blogPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PUBLISHED' }),
      }),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && npm test -- blog.service
```

Expected: FAIL.

- [ ] **Step 3: Implement BlogService**

Create `apps/api/src/blog/blog.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { BlogPostType, BlogPostStatus } from '@mediumformat/db'
import slugify from 'slugify'

interface CreateBlogPostDto {
  title: string
  type: BlogPostType
  authorId: string
  content: object
  excerpt?: string
  featuredImage?: string
  metaTitle?: string
  metaDescription?: string
  scheduledAt?: Date
  staffPickItems?: { releaseId: string; staffNote?: string; sortOrder?: number }[]
}

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  findPublished(filters: { type?: BlogPostType }) {
    return this.prisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
        ...(filters.type && { type: filters.type }),
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        staffPickItems: {
          include: { release: { select: { id: true, title: true, artist: true, images: true, stock: true, priceIdr: true, slug: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { publishedAt: 'desc' },
    })
  }

  findBySlug(slug: string) {
    return this.prisma.blogPost.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        staffPickItems: {
          include: { release: { select: { id: true, title: true, artist: true, images: true, stock: true, priceIdr: true, slug: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
  }

  findAllAdmin() {
    return this.prisma.blogPost.findMany({
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  create(dto: CreateBlogPostDto) {
    const slug = slugify(dto.title, { lower: true, strict: true })
    const { staffPickItems, ...rest } = dto

    return this.prisma.blogPost.create({
      data: {
        ...rest,
        slug,
        ...(staffPickItems && {
          staffPickItems: {
            create: staffPickItems.map((item) => ({
              releaseId: item.releaseId,
              staffNote: item.staffNote,
              sortOrder: item.sortOrder ?? 0,
            })),
          },
        }),
      },
      include: { staffPickItems: true },
    })
  }

  update(id: string, dto: Partial<CreateBlogPostDto>) {
    return this.prisma.blogPost.update({ where: { id }, data: dto as any })
  }

  publish(id: string) {
    return this.prisma.blogPost.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    })
  }
}
```

- [ ] **Step 4: Create BlogController**

Create `apps/api/src/blog/blog.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common'
import { BlogService } from './blog.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@mediumformat/types'
import { BlogPostType } from '@mediumformat/db'

@Controller('blog')
export class BlogController {
  constructor(private blog: BlogService) {}

  // Public
  @Get()
  findPublished(@Query('type') type?: BlogPostType) {
    return this.blog.findPublished({ type })
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.blog.findBySlug(slug)
  }

  // Staff only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STORE_MANAGER)
  @Get('admin/all')
  findAll() {
    return this.blog.findAllAdmin()
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STORE_MANAGER)
  @Post()
  create(@Body() dto: any) {
    return this.blog.create(dto)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STORE_MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.blog.update(id, dto)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STORE_MANAGER)
  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.blog.publish(id)
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd apps/api && npm test -- blog.service
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/blog/ apps/api/test/blog.service.spec.ts
git commit -m "feat: add blog/editorial module with Staff Picks, post types, publish workflow"
```

---

## Task 13: Backoffice Shell (React)

**Files:**
- Modify: `apps/backoffice/src/App.tsx`
- Create: `apps/backoffice/src/layouts/AppLayout.tsx`
- Create: `apps/backoffice/src/stores/auth.store.ts`
- Create: `apps/backoffice/src/api/client.ts`
- Create: `apps/backoffice/src/pages/Login.tsx`

- [ ] **Step 1: Install backoffice dependencies**

```bash
cd apps/backoffice
npm install react-router-dom axios @tanstack/react-query zustand lucide-react
npm install -D @types/react-router-dom
```

- [ ] **Step 2: Create typed API client**

Create `apps/backoffice/src/api/client.ts`:

```typescript
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('accessToken')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)
```

- [ ] **Step 3: Create Zustand auth store**

Create `apps/backoffice/src/stores/auth.store.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthStore {
  user: { id: string; name: string; email: string; role: string } | null
  accessToken: string | null
  setAuth: (user: AuthStore['user'], token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => {
        localStorage.setItem('accessToken', accessToken)
        set({ user, accessToken })
      },
      logout: () => {
        localStorage.removeItem('accessToken')
        set({ user: null, accessToken: null })
      },
    }),
    { name: 'mf-auth' },
  ),
)
```

- [ ] **Step 4: Create AppLayout with sidebar**

Create `apps/backoffice/src/layouts/AppLayout.tsx`:

```tsx
import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Users,
  BarChart2, Truck, Settings, BookOpen, Tag, Newspaper,
} from 'lucide-react'
import { useAuthStore } from '../stores/auth.store'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/blog', icon: BookOpen, label: 'Journal' },
  { to: '/marketing', icon: Tag, label: 'Marketing' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/purchase-orders', icon: Truck, label: 'Purchase Orders' },
  { to: '/newsletter', icon: Newspaper, label: 'Newsletter' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function AppLayout() {
  const { user, logout } = useAuthStore()

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="px-4 py-5 border-b border-zinc-800">
          <span className="text-sm font-semibold tracking-widest uppercase text-zinc-400">Medium Format</span>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
          <button onClick={logout} className="text-xs text-zinc-500 hover:text-zinc-300 mt-1">Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Wire up router in App.tsx**

```tsx
// apps/backoffice/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from './layouts/AppLayout'
import { useAuthStore } from './stores/auth.store'
import { Login } from './pages/Login'

const qc = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore()
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<div className="p-8"><h1 className="text-2xl font-semibold">Dashboard</h1></div>} />
            <Route path="inventory" element={<div className="p-8">Inventory</div>} />
            <Route path="orders" element={<div className="p-8">Orders</div>} />
            <Route path="blog" element={<div className="p-8">Journal</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/backoffice/src/
git commit -m "feat: add backoffice shell with sidebar navigation, auth store, React Query setup"
```

---

## Task 14: Storefront Shell (Next.js)

**Files:**
- Modify: `apps/storefront/app/layout.tsx`
- Create: `apps/storefront/app/page.tsx`
- Create: `apps/storefront/components/NowPlayingBar.tsx`
- Create: `apps/storefront/components/ReleaseCard.tsx`
- Create: `apps/storefront/app/shop/page.tsx`
- Create: `apps/storefront/app/shop/[slug]/page.tsx`
- Create: `apps/storefront/app/journal/page.tsx`
- Create: `apps/storefront/app/journal/[slug]/page.tsx`

- [ ] **Step 1: Install storefront dependencies**

```bash
cd apps/storefront
npm install @tanstack/react-query axios zustand
```

- [ ] **Step 2: Create root layout with dark theme and Now Playing bar**

```tsx
// apps/storefront/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NowPlayingBar } from '@/components/NowPlayingBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'Medium Format', template: '%s | Medium Format' },
  description: 'Independent record shop — Jakarta',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 min-h-screen pb-20`}>
        <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 bg-zinc-950/90 backdrop-blur z-40">
          <a href="/" className="text-sm font-semibold tracking-widest uppercase">Medium Format</a>
          <nav className="flex gap-6 text-sm text-zinc-400">
            <a href="/shop" className="hover:text-white transition-colors">Shop</a>
            <a href="/journal" className="hover:text-white transition-colors">Journal</a>
            <a href="/cart" className="hover:text-white transition-colors">Cart</a>
          </nav>
        </header>
        {children}
        <NowPlayingBar />
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create ReleaseCard component**

Create `apps/storefront/components/ReleaseCard.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Play } from 'lucide-react'
import Link from 'next/link'

interface Release {
  id: string
  slug: string
  title: string
  artist: string
  priceIdr: number
  images: string[]
  stock: number
  hasPreview: boolean
}

export function ReleaseCard({ release }: { release: Release }) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link href={`/shop/${release.slug}`} className="group block">
      <div
        className="relative aspect-square bg-zinc-900 overflow-hidden"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {release.images[0] ? (
          <img src={release.images[0]} alt={release.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">No image</div>
        )}
        {release.hasPreview && hovered && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <Play size={20} className="text-zinc-900 ml-0.5" />
            </div>
          </div>
        )}
        {release.stock === 0 && (
          <div className="absolute top-2 left-2 bg-zinc-900/80 text-zinc-400 text-xs px-2 py-0.5 rounded">
            Sold Out
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="text-xs text-zinc-500 truncate">{release.artist}</p>
        <p className="text-sm font-medium truncate">{release.title}</p>
        <p className="text-sm text-zinc-400 mt-0.5">
          IDR {release.priceIdr.toLocaleString('id-ID')}
        </p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Create storefront homepage**

```tsx
// apps/storefront/app/page.tsx
import { ReleaseCard } from '@/components/ReleaseCard'

async function getLatestReleases() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/inventory?limit=8`, {
    next: { revalidate: 60 },
  })
  return res.ok ? res.json() : []
}

async function getLatestPosts() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/blog?limit=3`, {
    next: { revalidate: 60 },
  })
  return res.ok ? res.json() : []
}

export default async function HomePage() {
  const [releases, posts] = await Promise.all([getLatestReleases(), getLatestPosts()])

  return (
    <main className="px-6 py-12">
      <section className="mb-16">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-6">New Arrivals</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {releases.map((r: any) => (
            <ReleaseCard key={r.id} release={{ ...r, hasPreview: r.previewSources?.length > 0 }} />
          ))}
        </div>
      </section>

      {posts.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Latest from the Journal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {posts.map((post: any) => (
              <a key={post.id} href={`/journal/${post.slug}`} className="block group">
                {post.featuredImage && (
                  <img src={post.featuredImage} alt={post.title} className="aspect-video object-cover w-full mb-3" />
                )}
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  {post.type.replace('_', ' ')}
                </span>
                <h3 className="text-sm font-medium mt-1 group-hover:text-zinc-300 transition-colors">{post.title}</h3>
                <p className="text-xs text-zinc-500 mt-1">{post.author?.name}</p>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
```

- [ ] **Step 5: Create Journal index and post pages**

Create `apps/storefront/app/journal/page.tsx`:

```tsx
export default async function JournalPage({ searchParams }: { searchParams: { type?: string } }) {
  const url = `${process.env.NEXT_PUBLIC_API_URL}/blog${searchParams.type ? `?type=${searchParams.type}` : ''}`
  const res = await fetch(url, { next: { revalidate: 60 } })
  const posts = res.ok ? await res.json() : []

  const types = ['STAFF_PICKS', 'HIGHLIGHTS', 'NEWS', 'NEW_ARRIVALS', 'REVIEW', 'FEATURE', 'EVENT']

  return (
    <main className="px-6 py-12 max-w-5xl mx-auto">
      <h1 className="text-xs uppercase tracking-widest text-zinc-500 mb-8">Journal</h1>

      <div className="flex gap-3 mb-10 flex-wrap">
        <a href="/journal" className={`text-xs px-3 py-1 rounded-full border ${!searchParams.type ? 'border-zinc-100 text-zinc-100' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>All</a>
        {types.map((t) => (
          <a key={t} href={`/journal?type=${t}`}
            className={`text-xs px-3 py-1 rounded-full border ${searchParams.type === t ? 'border-zinc-100 text-zinc-100' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
            {t.replace('_', ' ')}
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post: any) => (
          <a key={post.id} href={`/journal/${post.slug}`} className="group block">
            {post.featuredImage && (
              <img src={post.featuredImage} alt={post.title} className="aspect-video object-cover w-full mb-3" />
            )}
            <span className="text-xs text-zinc-500 uppercase tracking-wider">{post.type.replace('_', ' ')}</span>
            <h2 className="text-sm font-semibold mt-1 group-hover:text-zinc-300 transition-colors">{post.title}</h2>
            {post.excerpt && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{post.excerpt}</p>}
            <p className="text-xs text-zinc-600 mt-2">{post.author?.name} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('id-ID') : ''}</p>
          </a>
        ))}
      </div>
    </main>
  )
}
```

Create `apps/storefront/app/journal/[slug]/page.tsx`:

```tsx
import { ReleaseCard } from '@/components/ReleaseCard'
import { notFound } from 'next/navigation'

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/blog/${params.slug}`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) notFound()
  const post = await res.json()

  return (
    <article className="px-6 py-12 max-w-3xl mx-auto">
      <div className="mb-8">
        <span className="text-xs text-zinc-500 uppercase tracking-widest">{post.type.replace('_', ' ')}</span>
        <h1 className="text-2xl font-semibold mt-2">{post.title}</h1>
        <p className="text-sm text-zinc-500 mt-2">
          {post.author?.name} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
        </p>
      </div>

      {post.featuredImage && (
        <img src={post.featuredImage} alt={post.title} className="w-full aspect-video object-cover mb-8" />
      )}

      {/* Staff Picks release grid */}
      {post.type === 'STAFF_PICKS' && post.staffPickItems?.length > 0 && (
        <section className="mb-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {post.staffPickItems.map((item: any) => (
              <div key={item.id}>
                <ReleaseCard release={{ ...item.release, hasPreview: false }} />
                {item.staffNote && (
                  <p className="text-xs text-zinc-500 mt-2 italic">"{item.staffNote}"</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rich text content rendered as raw JSON — swap for Plate.js renderer */}
      <div className="prose prose-invert prose-sm max-w-none">
        {post.excerpt && <p className="text-zinc-300 text-base leading-relaxed">{post.excerpt}</p>}
      </div>
    </article>
  )
}
```

- [ ] **Step 6: Create NowPlayingBar placeholder**

Create `apps/storefront/components/NowPlayingBar.tsx`:

```tsx
'use client'
import { usePlayerStore } from '@/stores/player.store'

export function NowPlayingBar() {
  const { currentTrack } = usePlayerStore()
  if (!currentTrack) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-900 border-t border-zinc-800 flex items-center px-6 gap-4 z-50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{currentTrack.trackTitle ?? currentTrack.releaseTitle}</p>
        <p className="text-xs text-zinc-500 truncate">{currentTrack.artist}</p>
      </div>
      <span className="text-xs text-zinc-600 uppercase">{currentTrack.source}</span>
    </div>
  )
}
```

Create `apps/storefront/stores/player.store.ts`:

```typescript
import { create } from 'zustand'

interface Track {
  releaseId: string
  releaseTitle: string
  artist: string
  trackTitle?: string
  source: string
  url: string
}

interface PlayerStore {
  currentTrack: Track | null
  play: (track: Track) => void
  stop: () => void
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  currentTrack: null,
  play: (track) => set({ currentTrack: track }),
  stop: () => set({ currentTrack: null }),
}))
```

- [ ] **Step 7: Commit**

```bash
git add apps/storefront/
git commit -m "feat: add storefront shell with release grid, journal pages, Now Playing bar, Staff Picks layout"
```

---

## Task 15: Dokploy Deployment Config

**Files:**
- Create: `docker-compose.yml`
- Create: `apps/api/Dockerfile`
- Create: `apps/backoffice/Dockerfile`
- Create: `apps/storefront/Dockerfile`

- [ ] **Step 1: Create API Dockerfile**

Create `apps/api/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json turbo.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/db/package*.json ./packages/db/
COPY packages/types/package*.json ./packages/types/
RUN npm ci
COPY . .
RUN npx turbo run build --filter=api

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/prisma ./prisma
EXPOSE 3001
CMD ["node", "dist/main"]
```

- [ ] **Step 2: Create Storefront Dockerfile**

Create `apps/storefront/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json turbo.json ./
COPY apps/storefront/package*.json ./apps/storefront/
RUN npm ci
COPY . .
RUN npx turbo run build --filter=storefront

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/apps/storefront/.next/standalone ./
COPY --from=builder /app/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public
EXPOSE 3002
CMD ["node", "apps/storefront/server.js"]
```

- [ ] **Step 3: Create GitHub Actions CI**

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build --workspaces
      - run: npm test --workspaces
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile* .github/ docker-compose.yml apps/api/Dockerfile apps/storefront/Dockerfile
git commit -m "feat: add Dockerfiles and GitHub Actions CI for Dokploy deployment"
```

---

## Task 16: Final Integration Test

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All test suites pass.

- [ ] **Step 2: Start full dev environment**

```bash
npm run dev
```

Expected:
- API running on port 3001 — `curl http://localhost:3001/inventory` returns `[]`
- Backoffice on port 3000 — login page visible
- Storefront on port 3002 — homepage renders with empty releases and journal sections

- [ ] **Step 3: Smoke test auth flow**

```bash
# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mf.com","password":"secret123","name":"Admin"}'

# Expected: { accessToken, refreshToken, user }
```

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: Plan 1 Foundation complete — monorepo, auth, inventory, orders, payments, shipping, blog, storefront"
```
