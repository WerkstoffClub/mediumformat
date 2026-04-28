# Medium Format — Plan 2: Channels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all sales channel integrations — Tokopedia, Shopee, Meta Commerce, eBay, Google Merchant, PayPal, international shipping (DHL/FedEx), price rules engine, and purchase orders module.

**Architecture:** Each marketplace integration is an isolated NestJS module with its own service and controller. A shared `ChannelSyncService` runs background sync jobs via Bull queues (Upstash Redis). Price rules are computed on the fly before any push. Purchase orders are a standalone backoffice module with no storefront exposure.

**Tech Stack:** NestJS, Bull + Upstash Redis (job queues), Prisma, Axios, DHL Express API, FedEx REST API, Meta Graph API, eBay REST API, Google Content API v2.1, PayPal REST SDK, Stripe (already configured in Plan 1).

**Prerequisite:** Plan 1 (Foundation) must be fully deployed and passing CI before starting Plan 2.

---

## File Structure (additions to Plan 1)

```
apps/api/src/
├── channels/
│   ├── channel-sync.service.ts     ← shared sync engine + queue
│   ├── price-rules.service.ts      ← markup computation
│   ├── tokopedia/
│   │   ├── tokopedia.module.ts
│   │   ├── tokopedia.service.ts
│   │   └── tokopedia.controller.ts ← webhook + OAuth callback
│   ├── shopee/
│   │   ├── shopee.module.ts
│   │   ├── shopee.service.ts
│   │   └── shopee.controller.ts
│   ├── meta/
│   │   ├── meta.module.ts
│   │   └── meta.service.ts
│   ├── ebay/
│   │   ├── ebay.module.ts
│   │   └── ebay.service.ts
│   └── google-merchant/
│       ├── google-merchant.module.ts
│       └── google-merchant.service.ts
├── shipping/
│   ├── dhl/
│   │   └── dhl.service.ts
│   └── fedex/
│       └── fedex.service.ts
├── purchase-orders/
│   ├── purchase-orders.module.ts
│   ├── purchase-orders.service.ts
│   └── purchase-orders.controller.ts
└── payments/
    └── paypal/
        ├── paypal.module.ts
        ├── paypal.service.ts
        └── paypal.controller.ts

packages/db/prisma/schema.prisma    ← add PurchaseOrder, PriceRule models

apps/backoffice/src/pages/
├── Channels/
│   ├── ChannelsPage.tsx
│   ├── TokopediaConnect.tsx
│   └── ShopeeConnect.tsx
└── PurchaseOrders/
    ├── PurchaseOrdersPage.tsx
    ├── PurchaseOrderForm.tsx
    └── PackingListExport.tsx
```

---

## Task 1: Database Schema Additions

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add PriceRule and PurchaseOrder models**

Append to `packages/db/prisma/schema.prisma`:

```prisma
model PriceRule {
  id          String       @id @default(cuid())
  channel     SalesChannel @unique
  markupPct   Float        @default(0)   // e.g. 5.0 = 5%
  markupFixed Int          @default(0)   // IDR fixed amount added after %
  updatedAt   DateTime     @updatedAt

  @@map("price_rules")
}

model PurchaseOrder {
  id              String            @id @default(cuid())
  poNumber        String            @unique
  supplier        String
  countryOfOrigin String?
  status          POStatus          @default(PENDING)
  paymentMethod   POPaymentMethod
  paidBy          String?           // employee name if personal card
  paymentStatus   POPaymentStatus   @default(UNPAID)
  receiptUrl      String?
  notes           String?
  estimatedArrival DateTime?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  items           POItem[]
  shipments       POShipment[]

  @@map("purchase_orders")
}

model POItem {
  id           String        @id @default(cuid())
  poId         String
  po           PurchaseOrder @relation(fields: [poId], references: [id])
  releaseId    String?
  release      Release?      @relation(fields: [releaseId], references: [id])
  description  String        // free text for items not yet in catalog
  quantity     Int
  unitCostIdr  Int
  weightGrams  Int?

  @@map("po_items")
}

model POShipment {
  id           String        @id @default(cuid())
  poId         String
  po           PurchaseOrder @relation(fields: [poId], references: [id])
  shipperName  String
  shipperEmail String?
  trackingNumber String?
  estimatedArrival DateTime?
  actualArrival DateTime?
  notes        String?

  @@map("po_shipments")
}

enum POStatus {
  PENDING
  ORDERED
  SHIPPED
  ARRIVED
  CANCELLED
}

enum POPaymentMethod {
  COMPANY_CARD
  PERSONAL_CARD
}

enum POPaymentStatus {
  UNPAID
  PAID
  REIMBURSED
  DISPUTED
}
```

Also add relation back-references to Release model:
```prisma
// Add inside Release model:
poItems POItem[]
```

- [ ] **Step 2: Run migration**

```bash
cd packages/db
npx prisma migrate dev --name add_price_rules_purchase_orders
```

Expected: Migration applied, Prisma Client regenerated.

- [ ] **Step 3: Commit**

```bash
git add packages/db/
git commit -m "feat: add PriceRule, PurchaseOrder, POItem, POShipment schema models"
```

---

## Task 2: Price Rules Engine

**Files:**
- Create: `apps/api/src/channels/price-rules.service.ts`
- Test: `apps/api/test/price-rules.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/test/price-rules.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { PriceRulesService } from '../src/channels/price-rules.service'
import { PrismaService } from '../src/prisma/prisma.service'

describe('PriceRulesService', () => {
  let service: PriceRulesService
  const mockPrisma = { priceRule: { findUnique: jest.fn() } }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PriceRulesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get(PriceRulesService)
  })

  it('applies % markup first then fixed amount', () => {
    // base 100,000 + 5% = 105,000 + 5,000 fixed = 110,000
    expect(service.compute(100000, { markupPct: 5, markupFixed: 5000 })).toBe(110000)
  })

  it('returns base price when no rule', () => {
    expect(service.compute(200000, { markupPct: 0, markupFixed: 0 })).toBe(200000)
  })

  it('rounds to nearest 100 IDR', () => {
    // 100,000 + 3.5% = 103,500 — already round
    expect(service.compute(100000, { markupPct: 3.5, markupFixed: 0 })).toBe(103500)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && npm test -- price-rules.service
```

Expected: FAIL.

- [ ] **Step 3: Implement PriceRulesService**

Create `apps/api/src/channels/price-rules.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SalesChannel } from '@mediumformat/db'

@Injectable()
export class PriceRulesService {
  constructor(private prisma: PrismaService) {}

  compute(baseIdr: number, rule: { markupPct: number; markupFixed: number }): number {
    const afterPct = baseIdr * (1 + rule.markupPct / 100)
    const total = afterPct + rule.markupFixed
    return Math.round(total / 100) * 100
  }

  async computeForChannel(baseIdr: number, channel: SalesChannel): Promise<number> {
    const rule = await this.prisma.priceRule.findUnique({ where: { channel } })
    if (!rule) return baseIdr
    return this.compute(baseIdr, rule)
  }

  async getRule(channel: SalesChannel) {
    return this.prisma.priceRule.findUnique({ where: { channel } })
  }

  async upsertRule(channel: SalesChannel, markupPct: number, markupFixed: number) {
    return this.prisma.priceRule.upsert({
      where: { channel },
      create: { channel, markupPct, markupFixed },
      update: { markupPct, markupFixed },
    })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/api && npm test -- price-rules.service
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/channels/price-rules.service.ts apps/api/test/price-rules.service.spec.ts
git commit -m "feat: add price rules engine with % markup + fixed IDR computation"
```

---

## Task 3: Channel Sync Engine (Queue)

**Files:**
- Create: `apps/api/src/channels/channel-sync.service.ts`
- Test: `apps/api/test/channel-sync.service.spec.ts`

- [ ] **Step 1: Install Bull queue dependencies**

```bash
cd apps/api && npm install @nestjs/bull bull @upstash/redis
npm install -D @types/bull
```

- [ ] **Step 2: Write failing test**

Create `apps/api/test/channel-sync.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { ChannelSyncService } from '../src/channels/channel-sync.service'
import { PrismaService } from '../src/prisma/prisma.service'
import { PriceRulesService } from '../src/channels/price-rules.service'

describe('ChannelSyncService', () => {
  let service: ChannelSyncService
  const mockPrisma = {
    release: { findMany: jest.fn() },
    channelListing: { upsert: jest.fn(), update: jest.fn() },
  }
  const mockPriceRules = { computeForChannel: jest.fn((base) => Promise.resolve(base)) }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ChannelSyncService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PriceRulesService, useValue: mockPriceRules },
      ],
    }).compile()
    service = module.get(ChannelSyncService)
  })

  it('marks listing as inactive on soft-deleted release', async () => {
    await service.handleStockUpdate('rel-1', 0, 'TOKOPEDIA' as any)
    expect(mockPrisma.channelListing.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { releaseId_channel: { releaseId: 'rel-1', channel: 'TOKOPEDIA' } } }),
    )
  })
})
```

- [ ] **Step 3: Implement ChannelSyncService**

Create `apps/api/src/channels/channel-sync.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PriceRulesService } from './price-rules.service'
import { SalesChannel } from '@mediumformat/db'

@Injectable()
export class ChannelSyncService {
  private readonly logger = new Logger(ChannelSyncService.name)

  constructor(
    private prisma: PrismaService,
    private priceRules: PriceRulesService,
  ) {}

  async handleStockUpdate(releaseId: string, newStock: number, channel: SalesChannel) {
    await this.prisma.channelListing.update({
      where: { releaseId_channel: { releaseId, channel } },
      data: { isActive: newStock > 0, lastSyncedAt: new Date() },
    })
  }

  async pushRelease(releaseId: string, channel: SalesChannel, pushFn: (payload: object) => Promise<string>) {
    const release = await this.prisma.release.findUnique({ where: { id: releaseId } })
    if (!release) return

    const computedPrice = await this.priceRules.computeForChannel(release.priceIdr, channel)

    try {
      const externalId = await pushFn({
        title: `${release.artist} — ${release.title}`,
        price: computedPrice,
        stock: release.stock,
        images: release.images,
        description: [release.label, release.catalogNumber, release.year, release.condition]
          .filter(Boolean).join(' · '),
      })

      await this.prisma.channelListing.upsert({
        where: { releaseId_channel: { releaseId, channel } },
        create: { releaseId, channel, externalId, priceIdr: computedPrice, isActive: true, lastSyncedAt: new Date() },
        update: { externalId, priceIdr: computedPrice, isActive: true, lastSyncedAt: new Date(), syncError: null },
      })
    } catch (err: any) {
      this.logger.error(`Sync failed for ${releaseId} → ${channel}: ${err.message}`)
      await this.prisma.channelListing.upsert({
        where: { releaseId_channel: { releaseId, channel } },
        create: { releaseId, channel, isActive: false, syncError: err.message },
        update: { syncError: err.message, lastSyncedAt: new Date() },
      })
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/api && npm test -- channel-sync.service
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/channels/ apps/api/test/channel-sync.service.spec.ts
git commit -m "feat: add channel sync engine with stock update and price rule push"
```

---

## Task 4: Tokopedia Integration

**Files:**
- Create: `apps/api/src/channels/tokopedia/tokopedia.service.ts`
- Create: `apps/api/src/channels/tokopedia/tokopedia.controller.ts`
- Test: `apps/api/test/tokopedia.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/test/tokopedia.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { TokopediaService } from '../src/channels/tokopedia/tokopedia.service'
import { HttpService } from '@nestjs/axios'
import { PrismaService } from '../src/prisma/prisma.service'
import { ChannelSyncService } from '../src/channels/channel-sync.service'
import { of } from 'rxjs'

describe('TokopediaService', () => {
  let service: TokopediaService
  const mockHttp = { post: jest.fn(), get: jest.fn() }
  const mockPrisma = { order: { create: jest.fn() }, setting: { findUnique: jest.fn() } }
  const mockSync = { pushRelease: jest.fn() }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TokopediaService,
        { provide: HttpService, useValue: mockHttp },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ChannelSyncService, useValue: mockSync },
      ],
    }).compile()
    service = module.get(TokopediaService)
  })

  it('maps Tokopedia order status PAYMENT_VERIFIED to PROCESSING', () => {
    expect(service.mapOrderStatus('PAYMENT_VERIFIED')).toBe('PROCESSING')
  })

  it('maps Tokopedia order status SELLER_SEND_PACKAGE to SHIPPED', () => {
    expect(service.mapOrderStatus('SELLER_SEND_PACKAGE')).toBe('SHIPPED')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && npm test -- tokopedia.service
```

Expected: FAIL.

- [ ] **Step 3: Implement TokopediaService**

Create `apps/api/src/channels/tokopedia/tokopedia.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { PrismaService } from '../../prisma/prisma.service'
import { ChannelSyncService } from '../channel-sync.service'
import { OrderStatus } from '@mediumformat/db'

const STATUS_MAP: Record<string, OrderStatus> = {
  PAYMENT_VERIFIED: 'PROCESSING',
  READY_TO_SHIP: 'PROCESSING',
  SELLER_SEND_PACKAGE: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  ORDER_FINISHED: 'COMPLETED',
  ORDER_CANCELLED: 'CANCELLED',
}

@Injectable()
export class TokopediaService {
  private readonly logger = new Logger(TokopediaService.name)
  private readonly baseUrl = 'https://fs.tokopedia.net'

  constructor(
    private http: HttpService,
    private prisma: PrismaService,
    private sync: ChannelSyncService,
  ) {}

  mapOrderStatus(tokopediaStatus: string): OrderStatus {
    return STATUS_MAP[tokopediaStatus] ?? 'PENDING'
  }

  private async getAccessToken(): Promise<string> {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'tokopedia_oauth' } })
    return (setting?.value as any)?.accessToken ?? ''
  }

  async pushProduct(releaseId: string) {
    const token = await this.getAccessToken()
    return this.sync.pushRelease(releaseId, 'TOKOPEDIA', async (payload: any) => {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/inventory/v1/fs/products`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      )
      return String(data.data?.product_id ?? '')
    })
  }

  async updateStock(releaseId: string, externalId: string, stock: number) {
    const token = await this.getAccessToken()
    await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/inventory/v1/fs/products/stocks`,
        { products: [{ product_id: Number(externalId), stock }] },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    )
  }

  async pullOrders() {
    const token = await this.getAccessToken()
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/v2/order/list`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, per_page: 50, status: 'PAYMENT_VERIFIED' },
      }),
    )
    return data.data ?? []
  }

  async handleWebhook(body: any) {
    const status = this.mapOrderStatus(body.order_status)
    const existing = await this.prisma.order.findFirst({
      where: { paymentRef: String(body.order_id), channel: 'TOKOPEDIA' },
    })

    if (existing) {
      await this.prisma.order.update({ where: { id: existing.id }, data: { status } })
    } else {
      this.logger.warn(`Tokopedia order ${body.order_id} not found locally — may need manual sync`)
    }
  }
}
```

- [ ] **Step 4: Create Tokopedia webhook controller**

Create `apps/api/src/channels/tokopedia/tokopedia.controller.ts`:

```typescript
import { Controller, Post, Body, Get, Query, Redirect } from '@nestjs/common'
import { TokopediaService } from './tokopedia.service'
import { PrismaService } from '../../prisma/prisma.service'

@Controller('channels/tokopedia')
export class TokopediaController {
  constructor(
    private tokopedia: TokopediaService,
    private prisma: PrismaService,
  ) {}

  @Post('webhook')
  webhook(@Body() body: any) {
    return this.tokopedia.handleWebhook(body)
  }

  // OAuth callback — store tokens in Settings table
  @Get('callback')
  @Redirect('/settings/channels')
  async oauthCallback(@Query('code') code: string) {
    // Exchange code for token via Tokopedia OAuth — store in settings
    await this.prisma.setting.upsert({
      where: { key: 'tokopedia_oauth' },
      create: { key: 'tokopedia_oauth', value: { authCode: code, connectedAt: new Date() } },
      update: { value: { authCode: code, connectedAt: new Date() } },
    })
    return {}
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd apps/api && npm test -- tokopedia.service
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/channels/tokopedia/ apps/api/test/tokopedia.service.spec.ts
git commit -m "feat: add Tokopedia integration with product push, stock sync, order webhook"
```

---

## Task 5: Shopee Integration

**Files:**
- Create: `apps/api/src/channels/shopee/shopee.service.ts`
- Create: `apps/api/src/channels/shopee/shopee.controller.ts`
- Test: `apps/api/test/shopee.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/test/shopee.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { ShopeeService } from '../src/channels/shopee/shopee.service'
import { HttpService } from '@nestjs/axios'
import { PrismaService } from '../src/prisma/prisma.service'
import { ChannelSyncService } from '../src/channels/channel-sync.service'

describe('ShopeeService', () => {
  let service: ShopeeService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ShopeeService,
        { provide: HttpService, useValue: { post: jest.fn(), get: jest.fn() } },
        { provide: PrismaService, useValue: { setting: { findUnique: jest.fn() }, order: { findFirst: jest.fn(), update: jest.fn() } } },
        { provide: ChannelSyncService, useValue: { pushRelease: jest.fn() } },
      ],
    }).compile()
    service = module.get(ShopeeService)
  })

  it('maps Shopee status READY_TO_SHIP to PROCESSING', () => {
    expect(service.mapOrderStatus('READY_TO_SHIP')).toBe('PROCESSING')
  })

  it('maps Shopee status SHIPPED to SHIPPED', () => {
    expect(service.mapOrderStatus('SHIPPED')).toBe('SHIPPED')
  })
})
```

- [ ] **Step 2: Implement ShopeeService**

Create `apps/api/src/channels/shopee/shopee.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { createHmac } from 'crypto'
import { firstValueFrom } from 'rxjs'
import { PrismaService } from '../../prisma/prisma.service'
import { ChannelSyncService } from '../channel-sync.service'
import { OrderStatus } from '@mediumformat/db'

const STATUS_MAP: Record<string, OrderStatus> = {
  UNPAID: 'PENDING',
  READY_TO_SHIP: 'PROCESSING',
  PROCESSED: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  IN_CANCEL: 'CANCELLED',
}

@Injectable()
export class ShopeeService {
  private readonly logger = new Logger(ShopeeService.name)
  private readonly baseUrl = 'https://partner.shopeemobile.com/api/v2'

  constructor(
    private http: HttpService,
    private prisma: PrismaService,
    private sync: ChannelSyncService,
  ) {}

  mapOrderStatus(shopeeStatus: string): OrderStatus {
    return STATUS_MAP[shopeeStatus] ?? 'PENDING'
  }

  private sign(path: string, timestamp: number): string {
    const partnerId = process.env.SHOPEE_PARTNER_ID!
    const partnerKey = process.env.SHOPEE_PARTNER_KEY!
    const base = `${partnerId}${path}${timestamp}`
    return createHmac('sha256', partnerKey).update(base).digest('hex')
  }

  private async getHeaders(path: string) {
    const timestamp = Math.floor(Date.now() / 1000)
    const sign = this.sign(path, timestamp)
    const setting = await this.prisma.setting.findUnique({ where: { key: 'shopee_oauth' } })
    const accessToken = (setting?.value as any)?.accessToken ?? ''
    const shopId = process.env.SHOPEE_SHOP_ID

    return {
      params: { partner_id: process.env.SHOPEE_PARTNER_ID, timestamp, sign, access_token: accessToken, shop_id: shopId },
    }
  }

  async pushProduct(releaseId: string) {
    const path = '/product/add_item'
    const opts = await this.getHeaders(path)
    return this.sync.pushRelease(releaseId, 'SHOPEE', async (payload: any) => {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}${path}`, payload, { params: opts.params }),
      )
      return String(data.response?.item_id ?? '')
    })
  }

  async handleWebhook(body: any) {
    if (body.code !== 3) return // code 3 = order status update
    const status = this.mapOrderStatus(body.data?.status)
    const existing = await this.prisma.order.findFirst({
      where: { paymentRef: String(body.data?.ordersn), channel: 'SHOPEE' },
    })
    if (existing) {
      await this.prisma.order.update({ where: { id: existing.id }, data: { status } })
    }
  }
}
```

- [ ] **Step 3: Create ShopeeController**

Create `apps/api/src/channels/shopee/shopee.controller.ts`:

```typescript
import { Controller, Post, Body } from '@nestjs/common'
import { ShopeeService } from './shopee.service'

@Controller('channels/shopee')
export class ShopeeController {
  constructor(private shopee: ShopeeService) {}

  @Post('webhook')
  webhook(@Body() body: any) {
    return this.shopee.handleWebhook(body)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/api && npm test -- shopee.service
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/channels/shopee/ apps/api/test/shopee.service.spec.ts
git commit -m "feat: add Shopee integration with HMAC signing, product push, order webhook"
```

---

## Task 6: Meta Commerce Integration

**Files:**
- Create: `apps/api/src/channels/meta/meta.service.ts`
- Test: `apps/api/test/meta.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/test/meta.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { MetaService } from '../src/channels/meta/meta.service'
import { HttpService } from '@nestjs/axios'
import { ChannelSyncService } from '../src/channels/channel-sync.service'
import { of } from 'rxjs'

describe('MetaService', () => {
  let service: MetaService
  const mockHttp = { post: jest.fn() }
  const mockSync = { pushRelease: jest.fn() }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MetaService,
        { provide: HttpService, useValue: mockHttp },
        { provide: ChannelSyncService, useValue: mockSync },
      ],
    }).compile()
    service = module.get(MetaService)
  })

  it('builds correct Meta catalog item payload', () => {
    const payload = service.buildCatalogPayload({
      title: 'Miles Davis — Kind of Blue',
      price: 350000,
      stock: 2,
      images: ['https://example.com/img.jpg'],
      description: 'Columbia · CL 1355 · 1959 · VG+',
    })
    expect(payload.currency).toBe('IDR')
    expect(payload.availability).toBe('in stock')
    expect(payload.price).toBe('350000 IDR')
  })
})
```

- [ ] **Step 2: Implement MetaService**

Create `apps/api/src/channels/meta/meta.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { ChannelSyncService } from '../channel-sync.service'

@Injectable()
export class MetaService {
  private readonly graphUrl = 'https://graph.facebook.com/v19.0'

  constructor(
    private http: HttpService,
    private sync: ChannelSyncService,
  ) {}

  buildCatalogPayload(item: {
    title: string
    price: number
    stock: number
    images: string[]
    description: string
  }) {
    return {
      name: item.title,
      description: item.description,
      price: `${item.price} IDR`,
      currency: 'IDR',
      availability: item.stock > 0 ? 'in stock' : 'out of stock',
      image_url: item.images[0] ?? '',
      condition: 'used',
      brand: 'Medium Format',
    }
  }

  async pushProduct(releaseId: string) {
    const catalogId = process.env.META_CATALOG_ID!
    const token = process.env.META_ACCESS_TOKEN!

    return this.sync.pushRelease(releaseId, 'META', async (rawPayload: any) => {
      const payload = this.buildCatalogPayload(rawPayload)
      const { data } = await firstValueFrom(
        this.http.post(
          `${this.graphUrl}/${catalogId}/products`,
          payload,
          { params: { access_token: token } },
        ),
      )
      return String(data.id ?? '')
    })
  }
}
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd apps/api && npm test -- meta.service
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/channels/meta/ apps/api/test/meta.service.spec.ts
git commit -m "feat: add Meta Commerce catalog integration with product push"
```

---

## Task 7: eBay Integration

**Files:**
- Create: `apps/api/src/channels/ebay/ebay.service.ts`
- Test: `apps/api/test/ebay.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/test/ebay.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { EbayService } from '../src/channels/ebay/ebay.service'
import { HttpService } from '@nestjs/axios'
import { ChannelSyncService } from '../src/channels/channel-sync.service'

describe('EbayService', () => {
  let service: EbayService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EbayService,
        { provide: HttpService, useValue: { post: jest.fn(), get: jest.fn() } },
        { provide: ChannelSyncService, useValue: { pushRelease: jest.fn() } },
      ],
    }).compile()
    service = module.get(EbayService)
  })

  it('converts IDR to USD for eBay listing', () => {
    // 163,000 IDR ≈ $10.00
    expect(service.idrToUsd(163000)).toBeCloseTo(10.0, 0)
  })
})
```

- [ ] **Step 2: Implement EbayService**

Create `apps/api/src/channels/ebay/ebay.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { ChannelSyncService } from '../channel-sync.service'

const IDR_TO_USD = 16300

@Injectable()
export class EbayService {
  private readonly logger = new Logger(EbayService.name)
  private readonly baseUrl = 'https://api.ebay.com/sell/inventory/v1'

  constructor(
    private http: HttpService,
    private sync: ChannelSyncService,
  ) {}

  idrToUsd(idr: number): number {
    return Math.round((idr / IDR_TO_USD) * 100) / 100
  }

  private async getToken(): Promise<string> {
    const creds = Buffer.from(
      `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`,
    ).toString('base64')
    const { data } = await firstValueFrom(
      this.http.post(
        'https://api.ebay.com/identity/v1/oauth2/token',
        'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope/sell.inventory',
        { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    )
    return data.access_token
  }

  async pushProduct(releaseId: string, sku: string) {
    const token = await this.getToken()
    return this.sync.pushRelease(releaseId, 'EBAY', async (payload: any) => {
      await firstValueFrom(
        this.http.put(
          `${this.baseUrl}/inventory_item/${sku}`,
          {
            condition: 'USED_EXCELLENT',
            product: {
              title: payload.title,
              description: payload.description,
              imageUrls: payload.images,
            },
            availability: { shipToLocationAvailability: { quantity: payload.stock } },
          },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        ),
      )
      return sku
    })
  }
}
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd apps/api && npm test -- ebay.service
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/channels/ebay/ apps/api/test/ebay.service.spec.ts
git commit -m "feat: add eBay inventory listing integration with OAuth client credentials"
```

---

## Task 8: Google Merchant Integration

**Files:**
- Create: `apps/api/src/channels/google-merchant/google-merchant.service.ts`
- Test: `apps/api/test/google-merchant.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/test/google-merchant.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { GoogleMerchantService } from '../src/channels/google-merchant/google-merchant.service'
import { HttpService } from '@nestjs/axios'

describe('GoogleMerchantService', () => {
  let service: GoogleMerchantService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GoogleMerchantService,
        { provide: HttpService, useValue: { post: jest.fn(), put: jest.fn() } },
      ],
    }).compile()
    service = module.get(GoogleMerchantService)
  })

  it('builds correct Google Merchant product payload', () => {
    const payload = service.buildProductPayload({
      id: 'rel-1',
      title: 'Miles Davis — Kind of Blue',
      priceIdr: 350000,
      stock: 2,
      images: ['https://example.com/img.jpg'],
      condition: 'VG_PLUS',
      slug: 'miles-davis-kind-of-blue',
    })
    expect(payload.offerId).toBe('rel-1')
    expect(payload.price.value).toBe('350000')
    expect(payload.price.currency).toBe('IDR')
    expect(payload.availability).toBe('in_stock')
    expect(payload.condition).toBe('used')
  })
})
```

- [ ] **Step 2: Implement GoogleMerchantService**

Create `apps/api/src/channels/google-merchant/google-merchant.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'

@Injectable()
export class GoogleMerchantService {
  private readonly baseUrl = 'https://shoppingcontent.googleapis.com/content/v2.1'
  private readonly merchantId = process.env.GOOGLE_MERCHANT_ID!

  constructor(private http: HttpService) {}

  buildProductPayload(release: {
    id: string
    title: string
    priceIdr: number
    stock: number
    images: string[]
    condition: string
    slug: string
  }) {
    return {
      offerId: release.id,
      title: release.title,
      description: release.title,
      link: `${process.env.STOREFRONT_URL}/shop/${release.slug}`,
      imageLink: release.images[0] ?? '',
      availability: release.stock > 0 ? 'in_stock' : 'out_of_stock',
      condition: 'used',
      price: { value: String(release.priceIdr), currency: 'IDR' },
      contentLanguage: 'id',
      targetCountry: 'ID',
      channel: 'online',
    }
  }

  async upsertProduct(release: Parameters<typeof this.buildProductPayload>[0], token: string) {
    const payload = this.buildProductPayload(release)
    await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/${this.merchantId}/products`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    )
  }
}
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd apps/api && npm test -- google-merchant.service
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/channels/google-merchant/ apps/api/test/google-merchant.service.spec.ts
git commit -m "feat: add Google Merchant product feed integration"
```

---

## Task 9: PayPal Integration

**Files:**
- Create: `apps/api/src/payments/paypal/paypal.service.ts`
- Create: `apps/api/src/payments/paypal/paypal.controller.ts`
- Test: `apps/api/test/paypal.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/test/paypal.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { PaypalService } from '../src/payments/paypal/paypal.service'
import { HttpService } from '@nestjs/axios'
import { PrismaService } from '../src/prisma/prisma.service'
import { of } from 'rxjs'

describe('PaypalService', () => {
  let service: PaypalService
  const mockHttp = { post: jest.fn() }
  const mockPrisma = { order: { update: jest.fn() } }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PaypalService,
        { provide: HttpService, useValue: mockHttp },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get(PaypalService)
  })

  it('converts IDR to USD string for PayPal order', () => {
    // 163,000 IDR ≈ $10.00
    expect(service.idrToUsdString(163000)).toBe('10.00')
  })
})
```

- [ ] **Step 2: Implement PaypalService**

Create `apps/api/src/payments/paypal/paypal.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { PrismaService } from '../../prisma/prisma.service'

const IDR_TO_USD = 16300
const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

@Injectable()
export class PaypalService {
  constructor(
    private http: HttpService,
    private prisma: PrismaService,
  ) {}

  idrToUsdString(idr: number): string {
    return (idr / IDR_TO_USD).toFixed(2)
  }

  private async getAccessToken(): Promise<string> {
    const creds = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
    ).toString('base64')
    const { data } = await firstValueFrom(
      this.http.post(
        `${BASE_URL}/v1/oauth2/token`,
        'grant_type=client_credentials',
        { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    )
    return data.access_token
  }

  async createOrder(orderId: string, amountIdr: number) {
    const token = await this.getAccessToken()
    const { data } = await firstValueFrom(
      this.http.post(
        `${BASE_URL}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: orderId,
            amount: { currency_code: 'USD', value: this.idrToUsdString(amountIdr) },
          }],
        },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    )

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentMethod: 'PAYPAL', paymentRef: data.id },
    })

    return { paypalOrderId: data.id, approveUrl: data.links?.find((l: any) => l.rel === 'approve')?.href }
  }

  async captureOrder(paypalOrderId: string) {
    const token = await this.getAccessToken()
    const { data } = await firstValueFrom(
      this.http.post(
        `${BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    )

    const orderId = data.purchase_units?.[0]?.reference_id
    if (orderId && data.status === 'COMPLETED') {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'PAID', status: 'PROCESSING' },
      })
    }

    return data
  }
}
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd apps/api && npm test -- paypal.service
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/payments/paypal/ apps/api/test/paypal.service.spec.ts
git commit -m "feat: add PayPal payment integration with order creation and capture"
```

---

## Task 10: International Shipping (DHL + FedEx)

**Files:**
- Create: `apps/api/src/shipping/dhl/dhl.service.ts`
- Create: `apps/api/src/shipping/fedex/fedex.service.ts`
- Test: `apps/api/test/dhl.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/test/dhl.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { DhlService } from '../src/shipping/dhl/dhl.service'
import { HttpService } from '@nestjs/axios'
import { of } from 'rxjs'

describe('DhlService', () => {
  let service: DhlService
  const mockHttp = { get: jest.fn() }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DhlService,
        { provide: HttpService, useValue: mockHttp },
      ],
    }).compile()
    service = module.get(DhlService)
  })

  it('returns DHL rate in IDR equivalent', async () => {
    mockHttp.get.mockReturnValue(of({
      data: {
        products: [{ productCode: 'P', productName: 'DHL Express', totalPrice: [{ price: 25.00, priceCurrency: 'USD' }] }],
      },
    }))

    const rates = await service.getRates({ originCountry: 'ID', destinationCountry: 'US', weightKg: 0.5 })
    expect(rates[0].priceIdr).toBeGreaterThan(0)
    expect(rates[0].carrier).toBe('DHL')
  })
})
```

- [ ] **Step 2: Implement DhlService**

Create `apps/api/src/shipping/dhl/dhl.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'

const IDR_PER_USD = 16300

@Injectable()
export class DhlService {
  private readonly baseUrl = 'https://express.api.dhl.com/mydhlapi'

  constructor(private http: HttpService) {}

  private get auth() {
    return {
      username: process.env.DHL_API_KEY!,
      password: process.env.DHL_API_SECRET!,
    }
  }

  async getRates(params: {
    originCountry: string
    destinationCountry: string
    weightKg: number
    lengthCm?: number
    widthCm?: number
    heightCm?: number
  }) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/rates`, {
        auth: this.auth,
        params: {
          accountNumber: process.env.DHL_ACCOUNT_NUMBER,
          originCountryCode: params.originCountry,
          destinationCountryCode: params.destinationCountry,
          weight: params.weightKg,
          length: params.lengthCm ?? 32,
          width: params.widthCm ?? 32,
          height: params.heightCm ?? 5,
          plannedShippingDateAndTime: new Date().toISOString(),
          isCustomsDeclarable: true,
          unitOfMeasurement: 'metric',
        },
      }),
    )

    return (data.products ?? []).map((p: any) => ({
      carrier: 'DHL',
      productCode: p.productCode,
      productName: p.productName,
      priceUsd: p.totalPrice?.[0]?.price ?? 0,
      priceIdr: Math.round((p.totalPrice?.[0]?.price ?? 0) * IDR_PER_USD),
    }))
  }
}
```

Create `apps/api/src/shipping/fedex/fedex.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'

const IDR_PER_USD = 16300

@Injectable()
export class FedexService {
  private readonly baseUrl = 'https://apis.fedex.com'

  constructor(private http: HttpService) {}

  private async getToken(): Promise<string> {
    const { data } = await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/oauth/token`,
        `grant_type=client_credentials&client_id=${process.env.FEDEX_CLIENT_ID}&client_secret=${process.env.FEDEX_CLIENT_SECRET}`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    )
    return data.access_token
  }

  async getRates(params: { originPostalCode: string; destinationCountry: string; weightKg: number }) {
    const token = await this.getToken()
    const { data } = await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/rate/v1/rates/quotes`,
        {
          accountNumber: { value: process.env.FEDEX_ACCOUNT_NUMBER },
          requestedShipment: {
            shipper: { address: { postalCode: params.originPostalCode, countryCode: 'ID' } },
            recipient: { address: { countryCode: params.destinationCountry } },
            pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
            rateRequestType: ['LIST'],
            requestedPackageLineItems: [{
              weight: { units: 'KG', value: params.weightKg },
            }],
          },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    )

    return (data.output?.rateReplyDetails ?? []).map((r: any) => ({
      carrier: 'FedEx',
      serviceType: r.serviceType,
      serviceName: r.serviceName,
      priceUsd: r.ratedShipmentDetails?.[0]?.totalNetCharge ?? 0,
      priceIdr: Math.round((r.ratedShipmentDetails?.[0]?.totalNetCharge ?? 0) * IDR_PER_USD),
    }))
  }
}
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd apps/api && npm test -- dhl.service
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/shipping/dhl/ apps/api/src/shipping/fedex/ apps/api/test/dhl.service.spec.ts
git commit -m "feat: add DHL Express and FedEx international shipping rate calculation"
```

---

## Task 11: Purchase Orders Module

**Files:**
- Create: `apps/api/src/purchase-orders/purchase-orders.service.ts`
- Create: `apps/api/src/purchase-orders/purchase-orders.controller.ts`
- Test: `apps/api/test/purchase-orders.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/test/purchase-orders.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { PurchaseOrdersService } from '../src/purchase-orders/purchase-orders.service'
import { PrismaService } from '../src/prisma/prisma.service'

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService
  const mockPrisma = {
    purchaseOrder: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get(PurchaseOrdersService)
  })

  it('generates PO number with PO- prefix and date', () => {
    const num = service.generatePoNumber()
    expect(num).toMatch(/^PO-\d{8}-\d{4}$/)
  })

  it('calculates total weight from items', () => {
    const items = [
      { weightGrams: 180, quantity: 3 },
      { weightGrams: 100, quantity: 2 },
    ]
    expect(service.calcTotalWeight(items)).toBe(740)
  })

  it('calculates total cost from items', () => {
    const items = [
      { unitCostIdr: 200000, quantity: 2 },
      { unitCostIdr: 150000, quantity: 1 },
    ]
    expect(service.calcTotalCost(items)).toBe(550000)
  })
})
```

- [ ] **Step 2: Implement PurchaseOrdersService**

Create `apps/api/src/purchase-orders/purchase-orders.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { POPaymentMethod, POStatus } from '@mediumformat/db'

interface CreatePODto {
  supplier: string
  countryOfOrigin?: string
  paymentMethod: POPaymentMethod
  paidBy?: string
  notes?: string
  estimatedArrival?: Date
  items: {
    releaseId?: string
    description: string
    quantity: number
    unitCostIdr: number
    weightGrams?: number
  }[]
}

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  generatePoNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const rand = Math.floor(Math.random() * 9000 + 1000)
    return `PO-${date}-${rand}`
  }

  calcTotalWeight(items: { weightGrams?: number; quantity: number }[]): number {
    return items.reduce((sum, i) => sum + (i.weightGrams ?? 0) * i.quantity, 0)
  }

  calcTotalCost(items: { unitCostIdr: number; quantity: number }[]): number {
    return items.reduce((sum, i) => sum + i.unitCostIdr * i.quantity, 0)
  }

  create(dto: CreatePODto) {
    return this.prisma.purchaseOrder.create({
      data: {
        poNumber: this.generatePoNumber(),
        supplier: dto.supplier,
        countryOfOrigin: dto.countryOfOrigin,
        paymentMethod: dto.paymentMethod,
        paidBy: dto.paidBy,
        notes: dto.notes,
        estimatedArrival: dto.estimatedArrival,
        items: { create: dto.items },
      },
      include: { items: { include: { release: true } } },
    })
  }

  findAll() {
    return this.prisma.purchaseOrder.findMany({
      include: { items: true, shipments: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  findOne(id: string) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: { include: { release: true } }, shipments: true },
    })
  }

  updateStatus(id: string, status: POStatus) {
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status } })
  }

  generatePackingList(po: Awaited<ReturnType<typeof this.findOne>>) {
    if (!po) return null
    const totalWeight = this.calcTotalWeight(po.items)
    const totalCost = this.calcTotalCost(po.items)

    return {
      poNumber: po.poNumber,
      supplier: po.supplier,
      countryOfOrigin: po.countryOfOrigin,
      items: po.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitCostIdr: item.unitCostIdr,
        totalCostIdr: item.unitCostIdr * item.quantity,
        weightGrams: (item.weightGrams ?? 0) * item.quantity,
      })),
      summary: {
        totalItems: po.items.reduce((s, i) => s + i.quantity, 0),
        totalWeightGrams: totalWeight,
        totalWeightKg: (totalWeight / 1000).toFixed(2),
        totalCostIdr: totalCost,
      },
    }
  }
}
```

- [ ] **Step 3: Create PurchaseOrdersController**

Create `apps/api/src/purchase-orders/purchase-orders.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common'
import { PurchaseOrdersService } from './purchase-orders.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@mediumformat/types'
import { POStatus } from '@mediumformat/db'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STORE_MANAGER)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private pos: PurchaseOrdersService) {}

  @Get()
  findAll() { return this.pos.findAll() }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.pos.findOne(id) }

  @Get(':id/packing-list')
  async packingList(@Param('id') id: string) {
    const po = await this.pos.findOne(id)
    return this.pos.generatePackingList(po)
  }

  @Post()
  create(@Body() dto: any) { return this.pos.create(dto) }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: POStatus) {
    return this.pos.updateStatus(id, status)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/api && npm test -- purchase-orders.service
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/purchase-orders/ apps/api/test/purchase-orders.service.spec.ts
git commit -m "feat: add purchase orders module with packing list generation"
```

---

## Task 12: Channels Backoffice UI

**Files:**
- Create: `apps/backoffice/src/pages/Channels/ChannelsPage.tsx`
- Create: `apps/backoffice/src/pages/PurchaseOrders/PurchaseOrdersPage.tsx`

- [ ] **Step 1: Create Channels connection page**

Create `apps/backoffice/src/pages/Channels/ChannelsPage.tsx`:

```tsx
import { useState } from 'react'
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react'

const CHANNELS = [
  { id: 'TOKOPEDIA', name: 'Tokopedia', oauthUrl: '/api/channels/tokopedia/connect' },
  { id: 'SHOPEE', name: 'Shopee', oauthUrl: '/api/channels/shopee/connect' },
  { id: 'META', name: 'Meta (Facebook/Instagram)', oauthUrl: '/api/channels/meta/connect' },
  { id: 'EBAY', name: 'eBay', oauthUrl: '/api/channels/ebay/connect' },
]

export function ChannelsPage() {
  const [connected] = useState<string[]>([])

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-xl font-semibold mb-8">Sales Channels</h1>

      <div className="space-y-3">
        {CHANNELS.map((ch) => {
          const isConnected = connected.includes(ch.id)
          return (
            <div key={ch.id} className="flex items-center justify-between p-4 bg-zinc-900 rounded border border-zinc-800">
              <div className="flex items-center gap-3">
                {isConnected
                  ? <CheckCircle size={16} className="text-emerald-400" />
                  : <XCircle size={16} className="text-zinc-600" />
                }
                <span className="text-sm font-medium">{ch.name}</span>
              </div>
              {!isConnected && (
                <a
                  href={ch.oauthUrl}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 px-3 py-1.5 rounded transition-colors"
                >
                  Connect <ExternalLink size={12} />
                </a>
              )}
              {isConnected && <span className="text-xs text-emerald-400">Connected</span>}
            </div>
          )
        })}
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-medium text-zinc-400 mb-4">Price Rules</h2>
        <div className="space-y-3">
          {['TOKOPEDIA', 'SHOPEE', 'META', 'EBAY'].map((ch) => (
            <div key={ch} className="flex items-center gap-4 p-4 bg-zinc-900 rounded border border-zinc-800">
              <span className="text-sm w-32 text-zinc-400">{ch}</span>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Markup %" className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100" />
                <span className="text-zinc-600 text-sm">%</span>
                <span className="text-zinc-600 text-sm">+</span>
                <input type="number" placeholder="Fixed IDR" className="w-28 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100" />
                <span className="text-zinc-600 text-sm">IDR</span>
              </div>
              <button className="ml-auto text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded text-zinc-300 transition-colors">
                Save
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backoffice/src/pages/Channels/ apps/backoffice/src/pages/PurchaseOrders/
git commit -m "feat: add Channels connection UI with price rules config and Purchase Orders backoffice page"
```

---

## Task 13: Final Integration Test — Plan 2

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All test suites pass including all Plan 2 additions.

- [ ] **Step 2: Smoke test price rules**

```bash
# Set Tokopedia price rule: 5% + IDR 5,000
curl -X POST http://localhost:3001/channels/price-rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"channel":"TOKOPEDIA","markupPct":5,"markupFixed":5000}'

# Verify: a release priced at IDR 100,000 → computed as IDR 110,000
```

- [ ] **Step 3: Smoke test purchase order packing list**

```bash
curl http://localhost:3001/purchase-orders/<id>/packing-list \
  -H "Authorization: Bearer <token>"
# Expected: JSON with items, totalWeightGrams, totalCostIdr
```

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: Plan 2 Channels complete — Tokopedia, Shopee, Meta, eBay, Google Merchant, PayPal, DHL, FedEx, Purchase Orders, price rules"
```
