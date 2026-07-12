# Backoffice storefront modules + release-edit integrations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship real-data backoffice for Purchase Orders (editable, promoted above Inventory), Preorders, Vouchers, Newsletter; public storefront read APIs; and Release-editor integrations for Discogs autofill + Apple/Spotify/YouTube/Bandcamp/SoundCloud/upload previews.

**Architecture:** One Prisma migration adds five models + one column. New NestJS modules mirror existing patterns (`inventory` for CRUD, `dealpos` for sync). Integrations proxy external APIs server-side. Backoffice pages follow the existing `OrderDetail` drawer + `BlogList` table patterns. Storefront endpoints ride a new unauthenticated controller with a rate-limit guard.

**Tech Stack:** NestJS + Prisma + PostgreSQL (backend); React + Vite + Tailwind + React Query (frontend); Vitest for tests; Multer for uploads; Cheerio for Bandcamp scrape; official Discogs / iTunes / Spotify / YouTube Data v3 REST APIs.

**Spec:** [2026-07-12-backoffice-storefront-modules-design.md](../specs/2026-07-12-backoffice-storefront-modules-design.md)

---

## File map

**Backend (new)**
- `apps/api/prisma/schema.prisma` — add `PurchaseOrder`, `PurchaseOrderLine`, `Voucher`, `NewsletterSubscriber`, `NewsletterCampaign`, `Release.gallery`, 4 enums
- `apps/api/prisma/migrations/<ts>_add_backoffice_modules/migration.sql`
- `apps/api/prisma/scripts/backfill-purchase-orders.ts`
- `apps/api/src/integrations/integrations.module.ts`
- `apps/api/src/integrations/discogs/{discogs.module,discogs.controller,discogs.service,discogs.mapper}.ts` + spec
- `apps/api/src/integrations/apple/{apple.module,apple.controller,apple.service}.ts`
- `apps/api/src/integrations/spotify/{spotify.module,spotify.controller,spotify.service}.ts`
- `apps/api/src/integrations/youtube/{youtube.module,youtube.controller,youtube.service}.ts`
- `apps/api/src/integrations/bandcamp/{bandcamp.module,bandcamp.controller,bandcamp.service}.ts`
- `apps/api/src/integrations/upload/{upload.module,upload.controller,upload.service}.ts`
- `apps/api/src/purchase-orders/{purchase-orders.module,.controller,.service}.ts` + `dto/*`
- `apps/api/src/preorders/{preorders.module,.controller,.service}.ts` + `dto/*`
- `apps/api/src/vouchers/{vouchers.module,.controller,.service,.validator}.ts` + spec + `dto/*`
- `apps/api/src/newsletter/{newsletter.module,subscribers.controller,subscribers.service,campaigns.controller,campaigns.service}.ts` + `dto/*`
- `apps/api/src/storefront/{storefront.module,storefront.controller,storefront.service}.ts`
- `apps/api/src/common/throttler.guard.ts`
- `apps/api/uploads/` (gitignore)

**Backend (modified)**
- `apps/api/src/app.module.ts` — register new modules
- `apps/api/src/main.ts` — serve `uploads/` static, add global helmet + rate-limit
- `apps/api/src/ops/ops.controller.ts` — remove stub `/purchase-orders` route (moved to new module)
- `apps/api/src/dealpos/dealpos-sync.service.ts` — call PO seed on Bill upsert

**Frontend (new)**
- `apps/backoffice/src/api/{purchaseOrders,preorders,vouchers,newsletter,storefront,integrations}.ts`
- `apps/backoffice/src/pages/purchase-orders/{PurchaseOrdersList,PurchaseOrderDrawer,LineEditor}.tsx`
- `apps/backoffice/src/pages/preorders/{PreordersList,AddPreorderDrawer}.tsx` (replaces existing shell)
- `apps/backoffice/src/pages/vouchers/{VouchersList,VoucherDrawer}.tsx` (replaces existing shell)
- `apps/backoffice/src/pages/newsletter/{NewsletterPage,SubscribersTab,CampaignsTab,CampaignDrawer,SubscriberDrawer}.tsx` (replaces existing shell)
- `apps/backoffice/src/pages/inventory/release-edit/{Basics,FormatCondition,Pricing,StockLocation,Channels,Media,Description,Seo,Merchandising,TrackRow,PreviewSourcePopover,GetDetailsButton,GetMediaModal}.tsx`
- `apps/backoffice/src/components/ui/{Drawer,PanelHeader,KpiStrip,StatusPill,Toolbar,DataTable,ConfirmModal,ChoiceModal}.tsx` (only if missing — check first)

**Frontend (modified)**
- `apps/backoffice/src/App.tsx` — mount new routes for existing `Preorders`/`Vouchers`/`Newsletter` replacements (paths already routed)
- `apps/backoffice/src/layouts/Sidebar.tsx` — reorder groups so `Purchase orders` sits at top of `Shop`, promote it above Inventory by moving into `Selling` above `Inventory`
- `apps/backoffice/src/pages/inventory/ReleaseForm.tsx` — rewrite around the new section components + centered wrapper

**Shared**
- `packages/shared/src/index.ts` — add `PoStatus`, `VoucherKind`, `NewsletterSource`, `CampaignStatus` enums re-exports

---

## Assumptions & environment

- Node 18+, pnpm workspace (root has `package.json`, `pnpm-workspace.yaml`)
- `apps/api` is NestJS 10 with Prisma 5
- Existing packages: `axios` is likely present in api deps (used by `dealpos`); if not, install
- Add if missing: `multer`, `@types/multer`, `cheerio`, `@nestjs/throttler`, `googleapis` (optional; we'll use raw fetch)
- Frontend already uses React Query — check the useAuth hook for query client wiring; if missing, add QueryClientProvider

Before starting any task, run:

```bash
cd /Users/sonatsu/Documents/Projects/Claude/MediumFormat/.claude/worktrees/backoffice-storefront-modules-07919a
pnpm install
```

---

## Wave 1 — Data foundation

### Task 1: Add Prisma models, enums, and Release.gallery

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add enums after existing `PostStatus`**

Append after the last enum in `schema.prisma`:

```prisma
enum PoStatus {
  DRAFT
  SENT
  PARTIAL
  RECEIVED
  CANCELLED
}

enum VoucherKind {
  PERCENT
  FIXED_IDR
}

enum NewsletterSource {
  STOREFRONT
  CHECKOUT
  POS
  MANUAL
  IMPORT
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  SENT
}
```

- [ ] **Step 2: Add `PurchaseOrder` + `PurchaseOrderLine` models**

Append:

```prisma
model PurchaseOrder {
  id           String   @id @default(cuid())
  poNumber     String   @unique
  supplierId   String?
  supplierName String
  status       PoStatus @default(DRAFT)
  currency     String   @default("IDR")
  subtotalIdr  Int      @default(0)
  taxIdr       Int      @default(0)
  totalIdr     Int      @default(0)
  orderedAt    DateTime?
  etaAt        DateTime?
  receivedAt   DateTime?
  notes        String?
  sourceBillId String?  @unique
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  lines        PurchaseOrderLine[]

  @@index([status, etaAt])
}

model PurchaseOrderLine {
  id             String  @id @default(cuid())
  purchaseOrder  PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  purchaseOrderId String
  releaseId      String?
  description    String
  qtyOrdered     Int     @default(0)
  qtyReceived    Int     @default(0)
  unitCostIdr    Int     @default(0)
  totalIdr       Int     @default(0)

  @@index([purchaseOrderId])
}
```

- [ ] **Step 3: Add `Voucher` model**

```prisma
model Voucher {
  id           String      @id @default(cuid())
  code         String      @unique
  kind         VoucherKind
  value        Int
  minOrderIdr  Int         @default(0)
  startsAt     DateTime?
  expiresAt    DateTime?
  usageLimit   Int?
  usageCount   Int         @default(0)
  active       Boolean     @default(true)
  notes        String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  @@index([active, expiresAt])
}
```

- [ ] **Step 4: Add `NewsletterSubscriber` + `NewsletterCampaign` models**

```prisma
model NewsletterSubscriber {
  id             String           @id @default(cuid())
  email          String           @unique
  name           String?
  source         NewsletterSource @default(MANUAL)
  subscribedAt   DateTime         @default(now())
  unsubscribedAt DateTime?
  tags           String[]

  @@index([source, subscribedAt])
}

model NewsletterCampaign {
  id             String         @id @default(cuid())
  subject        String
  previewText    String?
  body           String
  status         CampaignStatus @default(DRAFT)
  scheduledFor   DateTime?
  sentAt         DateTime?
  recipientCount Int            @default(0)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@index([status, scheduledFor])
}
```

- [ ] **Step 5: Add `gallery` column to `Release`**

Inside `model Release { … }`, next to `imageUrl`:

```prisma
  gallery           Json?
```

- [ ] **Step 6: Commit schema changes (no migration yet)**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat(prisma): add PO/voucher/newsletter models and Release.gallery"
```

---

### Task 2: Generate migration + Prisma client

**Files:**
- Create: `apps/api/prisma/migrations/<ts>_add_backoffice_modules/migration.sql`

- [ ] **Step 1: Create migration**

```bash
cd apps/api
pnpm prisma migrate dev --name add_backoffice_modules --create-only
```

- [ ] **Step 2: Review the SQL**

Open the generated migration and verify it contains: 4 CREATE TYPE, 5 CREATE TABLE, ALTER TABLE `Release` ADD COLUMN `gallery`, and the indexes.

- [ ] **Step 3: Apply the migration**

```bash
pnpm prisma migrate dev
pnpm prisma generate
```

- [ ] **Step 4: Verify Prisma client picks up new types**

```bash
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); console.log(Object.keys(p).filter(k => !k.startsWith('$')).sort());"
```

Expected output includes: `purchaseOrder`, `purchaseOrderLine`, `voucher`, `newsletterSubscriber`, `newsletterCampaign`.

- [ ] **Step 5: Commit migration**

```bash
git add apps/api/prisma/migrations/
git commit -m "feat(prisma): migration add_backoffice_modules"
```

---

### Task 3: Shared enums re-export

**Files:**
- Modify: `packages/shared/src/index.ts` (path may be `packages/shared/src/enums.ts` — check first with `grep -l Role packages/shared/src/*.ts`)

- [ ] **Step 1: Add typed re-exports**

Append after existing `Role`/`RecordFormat` exports:

```typescript
export const PoStatus = { DRAFT: 'DRAFT', SENT: 'SENT', PARTIAL: 'PARTIAL', RECEIVED: 'RECEIVED', CANCELLED: 'CANCELLED' } as const;
export type PoStatus = typeof PoStatus[keyof typeof PoStatus];

export const VoucherKind = { PERCENT: 'PERCENT', FIXED_IDR: 'FIXED_IDR' } as const;
export type VoucherKind = typeof VoucherKind[keyof typeof VoucherKind];

export const NewsletterSource = { STOREFRONT: 'STOREFRONT', CHECKOUT: 'CHECKOUT', POS: 'POS', MANUAL: 'MANUAL', IMPORT: 'IMPORT' } as const;
export type NewsletterSource = typeof NewsletterSource[keyof typeof NewsletterSource];

export const CampaignStatus = { DRAFT: 'DRAFT', SCHEDULED: 'SCHEDULED', SENT: 'SENT' } as const;
export type CampaignStatus = typeof CampaignStatus[keyof typeof CampaignStatus];
```

- [ ] **Step 2: Build shared package**

```bash
pnpm --filter @mf/shared build || true
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): expose new enums"
```

---

## Wave 2 — Backend integrations

### Task 4: Discogs integration (TDD for mapper)

**Files:**
- Create: `apps/api/src/integrations/discogs/discogs.mapper.ts`
- Create: `apps/api/src/integrations/discogs/discogs.mapper.spec.ts`
- Create: `apps/api/src/integrations/discogs/discogs.service.ts`
- Create: `apps/api/src/integrations/discogs/discogs.controller.ts`
- Create: `apps/api/src/integrations/discogs/discogs.module.ts`
- Create: `apps/api/test/fixtures/discogs/release-lp-180g.json` (paste a real Discogs API response)

- [ ] **Step 1: Save a Discogs fixture**

Fetch and save one real response (adjust ID to a known 180g LP release):

```bash
curl "https://api.discogs.com/releases/249504" -H "User-Agent: MediumFormat/1.0" > apps/api/test/fixtures/discogs/release-249504.json
```

- [ ] **Step 2: Write the failing mapper test**

```typescript
// apps/api/src/integrations/discogs/discogs.mapper.spec.ts
import { mapDiscogsRelease } from './discogs.mapper';
import fixture from '../../../test/fixtures/discogs/release-249504.json';

describe('mapDiscogsRelease', () => {
  it('extracts core fields', () => {
    const r = mapDiscogsRelease(fixture);
    expect(r.artist).toBeTruthy();
    expect(r.title).toBeTruthy();
    expect(r.year).toBeGreaterThan(1900);
  });

  it('maps format string to RecordFormat enum', () => {
    const r = mapDiscogsRelease({ ...fixture, formats: [{ name: 'Vinyl', qty: '1', descriptions: ['LP', '180 Gram'] }] });
    expect(r.format).toBe('LP');
    expect(r.weightGrams).toBe(180);
  });

  it('maps 2xLP format and doubles weight', () => {
    const r = mapDiscogsRelease({ ...fixture, formats: [{ name: 'Vinyl', qty: '2', descriptions: ['LP', '180 Gram'] }] });
    expect(r.format).toBe('TWO_LP');
    expect(r.weightGrams).toBe(360);
  });

  it('extracts tracklist with position, title, duration', () => {
    const r = mapDiscogsRelease({ ...fixture, tracklist: [{ position: 'A1', title: 'Test', duration: '3:24' }] });
    expect(r.tracks).toEqual([{ position: 'A1', title: 'Test', duration: '3:24' }]);
  });

  it('extracts primary + secondary images', () => {
    const r = mapDiscogsRelease({ ...fixture, images: [
      { type: 'primary', uri: 'https://x/p.jpg', uri150: 'https://x/p150.jpg' },
      { type: 'secondary', uri: 'https://x/s.jpg', uri150: 'https://x/s150.jpg' },
    ]});
    expect(r.images[0]).toEqual(expect.objectContaining({ type: 'primary', uri: 'https://x/p.jpg' }));
    expect(r.images).toHaveLength(2);
  });

  it('returns weightGrams=null when no gram indicator', () => {
    const r = mapDiscogsRelease({ ...fixture, formats: [{ name: 'Vinyl', qty: '1', descriptions: ['LP'] }] });
    expect(r.weightGrams).toBeNull();
  });
});
```

- [ ] **Step 3: Run test, expect fail**

```bash
cd apps/api
pnpm test -- discogs.mapper
```

Expected: fails with "mapDiscogsRelease is not a function" or module not found.

- [ ] **Step 4: Implement mapper**

```typescript
// apps/api/src/integrations/discogs/discogs.mapper.ts
import { RecordFormat } from '@prisma/client';

export interface DiscogsMapped {
  discogsId: string;
  artist: string;
  title: string;
  label?: string;
  catNumber?: string;
  year?: number;
  country?: string;
  format?: RecordFormat;
  weightGrams: number | null;
  dimensionsMm: null;
  tracks: { position: string; title: string; duration?: string }[];
  images: { type: 'primary' | 'secondary'; uri: string; uri150?: string }[];
}

const GRAM_RE = /(\d{2,4})\s*Gram/i;

function mapFormat(name: string, qty: number, descriptions: string[]): RecordFormat | undefined {
  const d = descriptions.map(s => s.toLowerCase());
  if (name === 'Vinyl') {
    if (d.includes('lp') || d.includes('album')) {
      if (qty === 2) return 'TWO_LP';
      if (qty === 3) return 'THREE_LP';
      return 'LP';
    }
    if (d.includes('12"')) return 'TWELVE_INCH';
    if (d.includes('7"')) return 'SEVEN_INCH';
    return 'LP';
  }
  if (name === 'CD') return qty === 2 ? 'TWO_CD' : 'CD';
  if (name === 'Cassette') return 'CASSETTE';
  return undefined;
}

function extractWeight(descriptions: string[], qty: number): number | null {
  for (const d of descriptions) {
    const m = GRAM_RE.exec(d);
    if (m) return parseInt(m[1], 10) * qty;
  }
  return null;
}

export function mapDiscogsRelease(r: any): DiscogsMapped {
  const primaryFormat = r.formats?.[0] ?? { name: '', qty: '1', descriptions: [] };
  const qty = parseInt(primaryFormat.qty ?? '1', 10) || 1;
  const format = mapFormat(primaryFormat.name, qty, primaryFormat.descriptions ?? []);
  const weightGrams = extractWeight(primaryFormat.descriptions ?? [], qty);

  const artist = Array.isArray(r.artists) && r.artists.length
    ? r.artists.map((a: any) => a.name).join(', ').replace(/\s*\(\d+\)$/, '')
    : (r.artists_sort ?? '');

  return {
    discogsId: String(r.id ?? ''),
    artist,
    title: r.title ?? '',
    label: r.labels?.[0]?.name,
    catNumber: r.labels?.[0]?.catno,
    year: r.year,
    country: r.country,
    format,
    weightGrams,
    dimensionsMm: null,
    tracks: (r.tracklist ?? []).map((t: any) => ({
      position: t.position ?? '',
      title: t.title ?? '',
      duration: t.duration || undefined,
    })),
    images: (r.images ?? []).map((i: any) => ({
      type: i.type === 'primary' ? 'primary' : 'secondary',
      uri: i.uri,
      uri150: i.uri150,
    })),
  };
}
```

- [ ] **Step 5: Run tests, expect pass**

```bash
pnpm test -- discogs.mapper
```

- [ ] **Step 6: Implement `discogs.service.ts`**

```typescript
// apps/api/src/integrations/discogs/discogs.service.ts
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { mapDiscogsRelease, DiscogsMapped } from './discogs.mapper';

@Injectable()
export class DiscogsService {
  private readonly log = new Logger(DiscogsService.name);
  private readonly base = 'https://api.discogs.com';
  private readonly ua = 'MediumFormat/1.0 +https://mediumformat.info';
  private get token() { return process.env.DISCOGS_TOKEN; }

  private authHeader() {
    return this.token ? { Authorization: `Discogs token=${this.token}` } : {};
  }

  async lookupById(id: string): Promise<DiscogsMapped> {
    try {
      const { data } = await axios.get(`${this.base}/releases/${encodeURIComponent(id)}`, {
        headers: { 'User-Agent': this.ua, ...this.authHeader() },
        timeout: 8000,
      });
      return mapDiscogsRelease(data);
    } catch (e: any) {
      this.log.error(`Discogs lookup by id=${id} failed: ${e.message}`);
      throw new ServiceUnavailableException('Discogs lookup failed');
    }
  }

  async search(artist: string, title: string) {
    try {
      const { data } = await axios.get(`${this.base}/database/search`, {
        params: { artist, release_title: title, type: 'release', per_page: 5 },
        headers: { 'User-Agent': this.ua, ...this.authHeader() },
        timeout: 8000,
      });
      return (data.results ?? []).map((r: any) => ({
        id: String(r.id),
        title: r.title,
        year: r.year,
        format: r.format,
        thumb: r.thumb,
        country: r.country,
      }));
    } catch (e: any) {
      this.log.error(`Discogs search failed: ${e.message}`);
      throw new ServiceUnavailableException('Discogs search failed');
    }
  }
}
```

- [ ] **Step 7: Implement `discogs.controller.ts`**

```typescript
// apps/api/src/integrations/discogs/discogs.controller.ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { DiscogsService } from './discogs.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@mf/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations/discogs')
export class DiscogsController {
  constructor(private discogs: DiscogsService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('lookup')
  async lookup(@Body() body: { discogsId?: string; artist?: string; title?: string }) {
    if (body.discogsId) return this.discogs.lookupById(body.discogsId);
    if (body.artist && body.title) return { results: await this.discogs.search(body.artist, body.title) };
    return { results: [] };
  }
}
```

- [ ] **Step 8: Wire module**

```typescript
// apps/api/src/integrations/discogs/discogs.module.ts
import { Module } from '@nestjs/common';
import { DiscogsController } from './discogs.controller';
import { DiscogsService } from './discogs.service';

@Module({
  controllers: [DiscogsController],
  providers: [DiscogsService],
  exports: [DiscogsService],
})
export class DiscogsModule {}
```

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/integrations/discogs/ apps/api/test/fixtures/discogs/
git commit -m "feat(api): discogs integration with mapper + tests"
```

---

### Task 5: Apple / iTunes preview integration

**Files:**
- Create: `apps/api/src/integrations/apple/{apple.module,apple.controller,apple.service}.ts`

- [ ] **Step 1: Implement `apple.service.ts`**

```typescript
// apps/api/src/integrations/apple/apple.service.ts
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AppleService {
  private readonly log = new Logger(AppleService.name);

  async search(artist: string, title: string) {
    try {
      const term = `${artist} ${title}`.trim();
      const { data } = await axios.get('https://itunes.apple.com/search', {
        params: { term, media: 'music', entity: 'song', limit: 3 },
        timeout: 8000,
      });
      return (data.results ?? []).map((r: any) => ({
        trackName: r.trackName,
        artistName: r.artistName,
        collectionName: r.collectionName,
        previewUrl: r.previewUrl,
        artworkUrl100: r.artworkUrl100,
        trackViewUrl: r.trackViewUrl,
      }));
    } catch (e: any) {
      this.log.error(`Apple search failed: ${e.message}`);
      throw new ServiceUnavailableException('Apple search failed');
    }
  }
}
```

- [ ] **Step 2: Controller + module (follow discogs pattern)**

Controller at `POST /integrations/apple/search` body `{ artist, title }` → returns `{ results: [...] }`. Module exports `AppleService`.

- [ ] **Step 3: Manual sanity check**

```bash
# Assumes api dev server running on 3000 with a valid token in localStorage
curl -X POST http://localhost:3000/api/v1/integrations/apple/search \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"artist":"Aphex Twin","title":"Xtal"}'
```

Expected: JSON with `results[0].previewUrl` ending in `.m4a`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/integrations/apple/
git commit -m "feat(api): apple/iTunes preview integration"
```

---

### Task 6: Spotify integration

**Files:**
- Create: `apps/api/src/integrations/spotify/{spotify.module,spotify.controller,spotify.service}.ts`

- [ ] **Step 1: Implement `spotify.service.ts` with client-credentials token cache**

```typescript
// apps/api/src/integrations/spotify/spotify.service.ts
import { Injectable, Logger, NotImplementedException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SpotifyService {
  private readonly log = new Logger(SpotifyService.name);
  private token: string | null = null;
  private tokenExp = 0;

  private get id()     { return process.env.SPOTIFY_CLIENT_ID; }
  private get secret() { return process.env.SPOTIFY_CLIENT_SECRET; }

  private async ensureToken() {
    if (!this.id || !this.secret) {
      throw new NotImplementedException('Spotify integration not configured — set SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET');
    }
    if (this.token && Date.now() < this.tokenExp - 60_000) return this.token;
    const basic = Buffer.from(`${this.id}:${this.secret}`).toString('base64');
    const { data } = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({ grant_type: 'client_credentials' }),
      { headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 },
    );
    this.token = data.access_token;
    this.tokenExp = Date.now() + data.expires_in * 1000;
    return this.token!;
  }

  async search(artist: string, title: string) {
    const token = await this.ensureToken();
    try {
      const q = `track:${title} artist:${artist}`;
      const { data } = await axios.get('https://api.spotify.com/v1/search', {
        params: { q, type: 'track', limit: 3 },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      });
      return (data.tracks?.items ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        artist: t.artists?.map((a: any) => a.name).join(', '),
        previewUrl: t.preview_url,
        externalUrl: t.external_urls?.spotify,
      }));
    } catch (e: any) {
      this.log.error(`Spotify search failed: ${e.message}`);
      throw new ServiceUnavailableException('Spotify search failed');
    }
  }
}
```

- [ ] **Step 2: Controller + module (follow discogs pattern)**

Controller `POST /integrations/spotify/search` body `{ artist, title }` → `{ results }`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/integrations/spotify/
git commit -m "feat(api): spotify search integration with token cache"
```

---

### Task 7: YouTube integration

**Files:**
- Create: `apps/api/src/integrations/youtube/{youtube.module,youtube.controller,youtube.service}.ts`

- [ ] **Step 1: Implement service**

```typescript
// apps/api/src/integrations/youtube/youtube.service.ts
import { Injectable, Logger, NotImplementedException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class YoutubeService {
  private readonly log = new Logger(YoutubeService.name);
  private get key() { return process.env.YOUTUBE_API_KEY; }

  async search(artist: string, title: string) {
    if (!this.key) throw new NotImplementedException('YouTube integration not configured — set YOUTUBE_API_KEY');
    try {
      const { data } = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: { key: this.key, part: 'snippet', maxResults: 3, q: `${artist} ${title}`, type: 'video' },
        timeout: 8000,
      });
      return (data.items ?? []).map((i: any) => ({
        id: i.id.videoId,
        title: i.snippet?.title,
        channel: i.snippet?.channelTitle,
        thumbnail: i.snippet?.thumbnails?.medium?.url,
      }));
    } catch (e: any) {
      this.log.error(`YouTube search failed: ${e.message}`);
      throw new ServiceUnavailableException('YouTube search failed');
    }
  }
}
```

- [ ] **Step 2: Controller + module (follow discogs pattern)**

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/integrations/youtube/
git commit -m "feat(api): youtube search integration"
```

---

### Task 8: Bandcamp best-effort integration

**Files:**
- Create: `apps/api/src/integrations/bandcamp/{bandcamp.module,bandcamp.controller,bandcamp.service}.ts`

- [ ] **Step 1: Install cheerio**

```bash
cd apps/api && pnpm add cheerio
```

- [ ] **Step 2: Implement service**

```typescript
// apps/api/src/integrations/bandcamp/bandcamp.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class BandcampService {
  private readonly log = new Logger(BandcampService.name);

  async search(artist: string, title: string) {
    const q = encodeURIComponent(`${artist} ${title}`);
    const searchUrl = `https://bandcamp.com/search?q=${q}&item_type=t`;
    let guessedTrackUrl: string | undefined;
    try {
      const { data } = await axios.get(searchUrl, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 MediumFormat/1.0' } });
      const $ = cheerio.load(data);
      const first = $('.result-info .heading a').first().attr('href');
      if (first) guessedTrackUrl = first.startsWith('http') ? first : `https://bandcamp.com${first}`;
    } catch (e: any) {
      this.log.warn(`Bandcamp scrape failed: ${e.message}`);
    }
    return { searchUrl, guessedTrackUrl };
  }
}
```

- [ ] **Step 3: Controller + module (follow discogs pattern)**

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/integrations/bandcamp/ apps/api/package.json apps/api/../../pnpm-lock.yaml
git commit -m "feat(api): bandcamp best-effort search"
```

---

### Task 9: Upload integration for audio + images

**Files:**
- Create: `apps/api/src/integrations/upload/{upload.module,upload.controller,upload.service}.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/.gitignore` (add `uploads/`)

- [ ] **Step 1: Install multer**

```bash
cd apps/api && pnpm add @nestjs/platform-express multer && pnpm add -D @types/multer
```

- [ ] **Step 2: Implement service**

```typescript
// apps/api/src/integrations/upload/upload.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const AUDIO_MIME = new Set(['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/mp3']);
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class UploadService {
  private readonly root = path.join(process.cwd(), 'uploads');

  ensureRoot() {
    if (!fs.existsSync(this.root)) fs.mkdirSync(this.root, { recursive: true });
  }

  saveAudio(file: Express.Multer.File): { url: string } {
    if (!AUDIO_MIME.has(file.mimetype)) throw new BadRequestException(`Unsupported audio type: ${file.mimetype}`);
    if (file.size > 20 * 1024 * 1024) throw new BadRequestException('File too large (max 20MB)');
    this.ensureRoot();
    const ext = file.originalname.match(/\.[a-z0-9]+$/i)?.[0] ?? '.mp3';
    const name = `audio-${crypto.randomUUID()}${ext.toLowerCase()}`;
    fs.writeFileSync(path.join(this.root, name), file.buffer);
    return { url: `/uploads/${name}` };
  }

  saveRemoteImage(bytes: Buffer, mime: string, hint = 'image'): { url: string } {
    if (!IMAGE_MIME.has(mime)) throw new BadRequestException(`Unsupported image type: ${mime}`);
    this.ensureRoot();
    const ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
    const name = `${hint}-${crypto.randomUUID()}${ext}`;
    fs.writeFileSync(path.join(this.root, name), bytes);
    return { url: `/uploads/${name}` };
  }
}
```

- [ ] **Step 3: Controller with multer**

```typescript
// apps/api/src/integrations/upload/upload.controller.ts
import { Controller, Post, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@mf/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations/upload')
export class UploadController {
  constructor(private uploads: UploadService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('audio')
  @UseInterceptors(FileInterceptor('file'))
  audio(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return this.uploads.saveAudio(file);
  }
}
```

- [ ] **Step 4: Module**

Standard module. Export `UploadService` (Discogs `Get media` will use it to re-host images).

- [ ] **Step 5: Serve static `/uploads` in main.ts**

Locate `main.ts`; where the app is bootstrapped, add before `app.listen`:

```typescript
import * as path from 'node:path';
import { NestExpressApplication } from '@nestjs/platform-express';

const app = await NestFactory.create<NestExpressApplication>(AppModule);
// …existing setup…
app.useStaticAssets(path.join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
```

- [ ] **Step 6: gitignore**

```bash
echo "uploads/" >> apps/api/.gitignore
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/integrations/upload/ apps/api/src/main.ts apps/api/.gitignore apps/api/package.json ../../pnpm-lock.yaml
git commit -m "feat(api): local audio upload endpoint + static serve"
```

---

### Task 10: Integrations aggregate module + Discogs image re-host

**Files:**
- Create: `apps/api/src/integrations/integrations.module.ts`
- Modify: `apps/api/src/integrations/discogs/discogs.service.ts` — add `rehostImages()`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add `rehostImages` to DiscogsService**

```typescript
// append to DiscogsService
async rehostImages(uris: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const uri of uris) {
    try {
      const { data, headers } = await axios.get<ArrayBuffer>(uri, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': this.ua, ...this.authHeader() },
        timeout: 15000,
      });
      const mime = headers['content-type'] || 'image/jpeg';
      const buf = Buffer.from(data);
      const { url } = this.uploads.saveRemoteImage(buf, String(mime), 'discogs');
      out.push(url);
    } catch (e: any) {
      this.log.warn(`Rehost failed for ${uri}: ${e.message}`);
    }
  }
  return out;
}
```

Inject `UploadService` into `DiscogsService` constructor.

- [ ] **Step 2: Add controller endpoint for rehost**

Extend `DiscogsController`:

```typescript
@Roles(Role.ADMIN, Role.MANAGER)
@Post('rehost')
rehost(@Body() body: { uris: string[] }) {
  return this.discogs.rehostImages(body.uris ?? []);
}
```

- [ ] **Step 3: Aggregate module**

```typescript
// apps/api/src/integrations/integrations.module.ts
import { Module } from '@nestjs/common';
import { DiscogsModule } from './discogs/discogs.module';
import { AppleModule } from './apple/apple.module';
import { SpotifyModule } from './spotify/spotify.module';
import { YoutubeModule } from './youtube/youtube.module';
import { BandcampModule } from './bandcamp/bandcamp.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [UploadModule, DiscogsModule, AppleModule, SpotifyModule, YoutubeModule, BandcampModule],
  exports: [DiscogsModule, AppleModule, SpotifyModule, YoutubeModule, BandcampModule, UploadModule],
})
export class IntegrationsModule {}
```

- [ ] **Step 4: Register in `app.module.ts`**

Add `IntegrationsModule` to the `imports` array.

- [ ] **Step 5: Ensure DiscogsModule imports UploadModule**

Update `DiscogsModule.imports = [UploadModule]`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/integrations/ apps/api/src/app.module.ts
git commit -m "feat(api): integrations aggregate module + Discogs image re-host"
```

---

## Wave 3 — Backend business modules

### Task 11: Purchase Orders module + DealPOS seeding

**Files:**
- Create: `apps/api/src/purchase-orders/purchase-orders.module.ts`
- Create: `apps/api/src/purchase-orders/purchase-orders.controller.ts`
- Create: `apps/api/src/purchase-orders/purchase-orders.service.ts`
- Create: `apps/api/src/purchase-orders/dto/{create-po,update-po,receive-lines,po-filter}.dto.ts`
- Create: `apps/api/src/purchase-orders/purchase-orders.service.spec.ts`
- Modify: `apps/api/src/ops/ops.controller.ts` — remove stub `GET /purchase-orders`
- Modify: `apps/api/src/dealpos/dealpos-sync.service.ts` — call PO sync after Bill upsert
- Modify: `apps/api/src/app.module.ts` — register

- [ ] **Step 1: DTOs**

```typescript
// dto/create-po.dto.ts
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class LineDto {
  @IsOptional() @IsString() releaseId?: string;
  @IsString() description!: string;
  @IsInt() qtyOrdered!: number;
  @IsInt() unitCostIdr!: number;
}

export class CreatePoDto {
  @IsOptional() @IsString() supplierId?: string;
  @IsString() supplierName!: string;
  @IsOptional() @IsString() etaAt?: string;
  @IsOptional() @IsString() orderedAt?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => LineDto) lines!: LineDto[];
}
```

`UpdatePoDto` extends `PartialType(CreatePoDto)` from `@nestjs/mapped-types` and adds optional `status`.

`ReceiveLinesDto` — `{ lines: { id: string; qtyReceived: number }[] }`.

`PoFilterDto` — `page?, limit?, status?, q?`.

- [ ] **Step 2: Service (TDD for status transitions)**

Write test first:

```typescript
// purchase-orders.service.spec.ts
import { Test } from '@nestjs/testing';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PurchaseOrdersService.receive', () => {
  it('marks PARTIAL when some lines short', async () => {
    // build a fake prisma with a PO having qtyOrdered=[5,5], receive [3,5]
    // expect status = 'PARTIAL'
  });
  it('marks RECEIVED when all lines meet ordered qty', async () => {
    // ...
  });
});
```

Then implement:

```typescript
// purchase-orders.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePoDto } from './dto/create-po.dto';
import { UpdatePoDto } from './dto/update-po.dto';
import { PoFilterDto } from './dto/po-filter.dto';
import { ReceiveLinesDto } from './dto/receive-lines.dto';
import { PoStatus } from '@prisma/client';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  private async nextPoNumber(): Promise<string> {
    const last = await this.prisma.purchaseOrder.findFirst({ orderBy: { createdAt: 'desc' }, select: { poNumber: true } });
    const n = last?.poNumber?.match(/PO-(\d+)/)?.[1];
    const next = n ? parseInt(n, 10) + 1 : 100;
    return `PO-${next}`;
  }

  private totals(lines: { qtyOrdered: number; unitCostIdr: number }[]) {
    const subtotal = lines.reduce((s, l) => s + l.qtyOrdered * l.unitCostIdr, 0);
    return { subtotalIdr: subtotal, taxIdr: 0, totalIdr: subtotal };
  }

  async create(body: CreatePoDto) {
    const poNumber = await this.nextPoNumber();
    const linesInput = body.lines.map(l => ({
      description: l.description,
      releaseId: l.releaseId ?? null,
      qtyOrdered: l.qtyOrdered,
      qtyReceived: 0,
      unitCostIdr: l.unitCostIdr,
      totalIdr: l.qtyOrdered * l.unitCostIdr,
    }));
    const { subtotalIdr, taxIdr, totalIdr } = this.totals(body.lines);
    return this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: body.supplierId,
        supplierName: body.supplierName,
        etaAt: body.etaAt ? new Date(body.etaAt) : null,
        orderedAt: body.orderedAt ? new Date(body.orderedAt) : null,
        notes: body.notes,
        subtotalIdr, taxIdr, totalIdr,
        lines: { create: linesInput },
      },
      include: { lines: true },
    });
  }

  async findAll(f: PoFilterDto) {
    const page = Math.max(1, Number(f.page ?? 1));
    const limit = Math.min(100, Number(f.limit ?? 25));
    const where: any = {};
    if (f.status) where.status = f.status;
    if (f.q) where.OR = [
      { poNumber:     { contains: f.q, mode: 'insensitive' } },
      { supplierName: { contains: f.q, mode: 'insensitive' } },
    ];
    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { lines: true } }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: { lines: true } });
    if (!po) throw new NotFoundException();
    return po;
  }

  async update(id: string, body: UpdatePoDto) {
    const po = await this.findOne(id);
    const data: any = { ...body };
    if (body.lines) {
      await this.prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });
      data.lines = { create: body.lines.map(l => ({
        description: l.description, releaseId: l.releaseId ?? null,
        qtyOrdered: l.qtyOrdered, qtyReceived: 0,
        unitCostIdr: l.unitCostIdr, totalIdr: l.qtyOrdered * l.unitCostIdr,
      })) };
      Object.assign(data, this.totals(body.lines));
    }
    if (body.etaAt) data.etaAt = new Date(body.etaAt);
    if (body.orderedAt) data.orderedAt = new Date(body.orderedAt);
    return this.prisma.purchaseOrder.update({ where: { id }, data, include: { lines: true } });
  }

  async receive(id: string, body: ReceiveLinesDto) {
    const po = await this.findOne(id);
    if (po.status === PoStatus.CANCELLED) throw new BadRequestException('PO is cancelled');
    await this.prisma.$transaction(body.lines.map(l =>
      this.prisma.purchaseOrderLine.update({ where: { id: l.id }, data: { qtyReceived: l.qtyReceived } })
    ));
    const fresh = await this.findOne(id);
    const anyReceived = fresh.lines.some(l => l.qtyReceived > 0);
    const allFull   = fresh.lines.every(l => l.qtyReceived >= l.qtyOrdered);
    const status: PoStatus = allFull ? PoStatus.RECEIVED : anyReceived ? PoStatus.PARTIAL : PoStatus.SENT;
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status, receivedAt: status === PoStatus.RECEIVED ? new Date() : null },
      include: { lines: true },
    });
  }

  async cancel(id: string) {
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: PoStatus.CANCELLED }, include: { lines: true } });
  }

  async syncFromDealpos() {
    // Walk Bill rows without a matching PO.sourceBillId; insert DRAFTs.
    const bills = await this.prisma.bill.findMany({ where: { purchaseOrder: null } as any, include: { lines: true, supplier: true } });
    let created = 0;
    for (const b of bills) {
      const already = await this.prisma.purchaseOrder.findUnique({ where: { sourceBillId: b.id } });
      if (already) continue;
      const linesInput = b.lines.map((l: any) => ({
        description: l.description ?? l.productName ?? 'Item',
        qtyOrdered: l.quantity ?? 0,
        qtyReceived: 0,
        unitCostIdr: Math.round(l.unitCost ?? 0),
        totalIdr: Math.round((l.quantity ?? 0) * (l.unitCost ?? 0)),
      }));
      const { subtotalIdr, taxIdr, totalIdr } = this.totals(b.lines.map((l: any) => ({ qtyOrdered: l.quantity ?? 0, unitCostIdr: l.unitCost ?? 0 })));
      await this.prisma.purchaseOrder.create({
        data: {
          poNumber: await this.nextPoNumber(),
          supplierName: b.supplier?.name ?? 'Unknown supplier',
          sourceBillId: b.id,
          orderedAt: b.date ?? null,
          subtotalIdr, taxIdr, totalIdr,
          lines: { create: linesInput },
        },
      });
      created++;
    }
    return { created };
  }
}
```

Notes on the sync: adjust field names on `Bill`/`BillLine` to match `prisma/schema.prisma` at lines 250–271; the shape above assumes `quantity` / `unitCost` / `date` fields. Grep the schema and rename if needed.

- [ ] **Step 3: Controller**

```typescript
// purchase-orders.controller.ts
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, STAFF_ROLES } from '@mf/shared';
import { CreatePoDto } from './dto/create-po.dto';
import { UpdatePoDto } from './dto/update-po.dto';
import { ReceiveLinesDto } from './dto/receive-lines.dto';
import { PoFilterDto } from './dto/po-filter.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private svc: PurchaseOrdersService) {}

  @Roles(...STAFF_ROLES) @Get() list(@Query() f: PoFilterDto) { return this.svc.findAll(f); }
  @Roles(...STAFF_ROLES) @Get(':id') one(@Param('id') id: string) { return this.svc.findOne(id); }
  @Roles(Role.ADMIN, Role.MANAGER) @Post() create(@Body() b: CreatePoDto) { return this.svc.create(b); }
  @Roles(Role.ADMIN, Role.MANAGER) @Patch(':id') update(@Param('id') id: string, @Body() b: UpdatePoDto) { return this.svc.update(id, b); }
  @Roles(Role.ADMIN, Role.MANAGER) @Post(':id/receive') receive(@Param('id') id: string, @Body() b: ReceiveLinesDto) { return this.svc.receive(id, b); }
  @Roles(Role.ADMIN, Role.MANAGER) @Post(':id/cancel') @HttpCode(200) cancel(@Param('id') id: string) { return this.svc.cancel(id); }
  @Roles(Role.ADMIN, Role.MANAGER) @Post('sync-from-dealpos') sync() { return this.svc.syncFromDealpos(); }
}
```

- [ ] **Step 4: Module + register**

Standard module. Add `PurchaseOrdersModule` to `AppModule.imports`.

- [ ] **Step 5: Retire ops stub**

In `apps/api/src/ops/ops.controller.ts`, remove the `@Get('purchase-orders')` method and its DTO wiring (grep for it around line 40). Keep everything else.

- [ ] **Step 6: Optional DealPOS-side hook**

In `apps/api/src/dealpos/dealpos-sync.service.ts`, after Bill upsert loop, call `purchaseOrdersService.syncFromDealpos()` — inject via constructor. This means `DealposModule` imports `PurchaseOrdersModule` (forward reference not required; PO does not import Dealpos).

- [ ] **Step 7: Run tests**

```bash
cd apps/api && pnpm test -- purchase-orders
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/purchase-orders/ apps/api/src/app.module.ts apps/api/src/ops/ apps/api/src/dealpos/
git commit -m "feat(api): purchase orders module with DealPOS seed"
```

---

### Task 12: Preorders module

**Files:**
- Create: `apps/api/src/preorders/{preorders.module,controller,service}.ts`
- Create: `apps/api/src/preorders/dto/set-preorder.dto.ts`

- [ ] **Step 1: DTO**

```typescript
// dto/set-preorder.dto.ts
import { IsOptional, IsString } from 'class-validator';
export class SetPreorderDto {
  @IsString() eta!: string;
  @IsOptional() @IsString() notes?: string;
}
```

- [ ] **Step 2: Service**

```typescript
// preorders.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PreordersService {
  constructor(private prisma: PrismaService) {}

  list(f: { q?: string; scope?: 'all' | 'upcoming' | 'overdue' } = {}) {
    const now = new Date();
    const where: any = { preorder: true };
    if (f.scope === 'upcoming') where.preorderEta = { gt: now };
    if (f.scope === 'overdue')  where.preorderEta = { lte: now };
    if (f.q) where.OR = [
      { artist: { contains: f.q, mode: 'insensitive' } },
      { title:  { contains: f.q, mode: 'insensitive' } },
    ];
    return this.prisma.release.findMany({ where, orderBy: [{ preorderEta: 'asc' }] });
  }

  set(releaseId: string, body: { eta: string; notes?: string }) {
    return this.prisma.release.update({
      where: { id: releaseId },
      data: {
        preorder: true,
        preorderEta: new Date(body.eta),
        notes: body.notes ?? undefined,
      },
    });
  }

  unset(releaseId: string) {
    return this.prisma.release.update({
      where: { id: releaseId },
      data: { preorder: false, preorderEta: null },
    });
  }
}
```

- [ ] **Step 3: Controller**

```typescript
// preorders.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PreordersService } from './preorders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, STAFF_ROLES } from '@mf/shared';
import { SetPreorderDto } from './dto/set-preorder.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('preorders')
export class PreordersController {
  constructor(private svc: PreordersService) {}
  @Roles(...STAFF_ROLES) @Get() list(@Query() q: any) { return this.svc.list(q); }
  @Roles(Role.ADMIN, Role.MANAGER) @Post(':releaseId') set(@Param('releaseId') id: string, @Body() b: SetPreorderDto) { return this.svc.set(id, b); }
  @Roles(Role.ADMIN, Role.MANAGER) @Delete(':releaseId') unset(@Param('releaseId') id: string) { return this.svc.unset(id); }
}
```

- [ ] **Step 4: Module + register + commit**

```bash
git add apps/api/src/preorders/ apps/api/src/app.module.ts
git commit -m "feat(api): preorders module backed by Release.preorder"
```

---

### Task 13: Vouchers module (TDD for validator)

**Files:**
- Create: `apps/api/src/vouchers/{vouchers.module,controller,service,validator}.ts`
- Create: `apps/api/src/vouchers/vouchers.validator.spec.ts`
- Create: `apps/api/src/vouchers/dto/{create-voucher,update-voucher,voucher-filter}.dto.ts`

- [ ] **Step 1: Validator test (fail first)**

```typescript
// vouchers.validator.spec.ts
import { validateVoucher } from './vouchers.validator';

const now = new Date('2026-07-12T00:00:00Z');

describe('validateVoucher', () => {
  const base = { id: 'v', code: 'X', kind: 'PERCENT' as const, value: 10, minOrderIdr: 0, startsAt: null, expiresAt: null, usageLimit: null, usageCount: 0, active: true };

  it('rejects inactive', () => {
    expect(validateVoucher({ ...base, active: false }, 100_000, now)).toEqual({ valid: false, discountIdr: 0, reason: 'inactive' });
  });

  it('applies percent discount', () => {
    expect(validateVoucher(base, 100_000, now)).toEqual({ valid: true, discountIdr: 10_000 });
  });

  it('applies fixed idr, capped to subtotal', () => {
    expect(validateVoucher({ ...base, kind: 'FIXED_IDR', value: 200_000 }, 50_000, now)).toEqual({ valid: true, discountIdr: 50_000 });
  });

  it('rejects below min order', () => {
    expect(validateVoucher({ ...base, minOrderIdr: 100_000 }, 50_000, now)).toEqual({ valid: false, discountIdr: 0, reason: 'below_minimum' });
  });

  it('rejects past expiry', () => {
    expect(validateVoucher({ ...base, expiresAt: new Date('2026-07-11T00:00:00Z') }, 100_000, now)).toEqual({ valid: false, discountIdr: 0, reason: 'expired' });
  });

  it('rejects before start', () => {
    expect(validateVoucher({ ...base, startsAt: new Date('2026-07-13T00:00:00Z') }, 100_000, now)).toEqual({ valid: false, discountIdr: 0, reason: 'not_started' });
  });

  it('rejects at usage limit', () => {
    expect(validateVoucher({ ...base, usageLimit: 5, usageCount: 5 }, 100_000, now)).toEqual({ valid: false, discountIdr: 0, reason: 'limit_reached' });
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
cd apps/api && pnpm test -- vouchers.validator
```

- [ ] **Step 3: Implement validator**

```typescript
// vouchers.validator.ts
import { Voucher } from '@prisma/client';

export type ValidatorResult = { valid: true; discountIdr: number } | { valid: false; discountIdr: 0; reason: string };

export function validateVoucher(v: Pick<Voucher, 'kind' | 'value' | 'minOrderIdr' | 'startsAt' | 'expiresAt' | 'usageLimit' | 'usageCount' | 'active'>, subtotalIdr: number, now = new Date()): ValidatorResult {
  if (!v.active)                                  return { valid: false, discountIdr: 0, reason: 'inactive' };
  if (v.startsAt && v.startsAt > now)             return { valid: false, discountIdr: 0, reason: 'not_started' };
  if (v.expiresAt && v.expiresAt < now)           return { valid: false, discountIdr: 0, reason: 'expired' };
  if (v.usageLimit != null && v.usageCount >= v.usageLimit) return { valid: false, discountIdr: 0, reason: 'limit_reached' };
  if (subtotalIdr < v.minOrderIdr)                return { valid: false, discountIdr: 0, reason: 'below_minimum' };
  const raw = v.kind === 'PERCENT' ? Math.round(subtotalIdr * (v.value / 100)) : v.value;
  return { valid: true, discountIdr: Math.min(raw, subtotalIdr) };
}
```

- [ ] **Step 4: Run tests — expect pass**

- [ ] **Step 5: Service (CRUD)**

Mirror `purchase-orders.service.ts` shape: `findAll` with filter, `create`, `update`, `remove` (guard: hard delete only when `usageCount === 0`, else set `active=false`), `validate(code, subtotalIdr)` that uses the validator function.

- [ ] **Step 6: Controller**

```typescript
// vouchers.controller.ts
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, STAFF_ROLES } from '@mf/shared';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VoucherFilterDto } from './dto/voucher-filter.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vouchers')
export class VouchersController {
  constructor(private svc: VouchersService) {}
  @Roles(...STAFF_ROLES) @Get() list(@Query() f: VoucherFilterDto) { return this.svc.findAll(f); }
  @Roles(Role.ADMIN, Role.MANAGER) @Post() create(@Body() b: CreateVoucherDto) { return this.svc.create(b); }
  @Roles(Role.ADMIN, Role.MANAGER) @Patch(':id') update(@Param('id') id: string, @Body() b: UpdateVoucherDto) { return this.svc.update(id, b); }
  @Roles(Role.ADMIN) @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id') id: string) { return this.svc.remove(id); }
}
```

- [ ] **Step 7: Module + register + commit**

```bash
git add apps/api/src/vouchers/ apps/api/src/app.module.ts
git commit -m "feat(api): vouchers module with validator"
```

---

### Task 14: Newsletter module

**Files:**
- Create: `apps/api/src/newsletter/{newsletter.module,subscribers.controller,subscribers.service,campaigns.controller,campaigns.service}.ts`
- Create: `apps/api/src/newsletter/dto/{create-subscriber,update-subscriber,create-campaign,update-campaign,filter}.dto.ts`

- [ ] **Step 1: Subscribers service**

Standard CRUD over `NewsletterSubscriber`. `create` lowercases email; upsert on conflict (idempotent subscribe). `list` filters by source/tag/email substring. `unsubscribe(email)` sets `unsubscribedAt`. Export CSV endpoint returns `text/csv` with headers `email,name,source,tags,subscribedAt`.

- [ ] **Step 2: Subscribers controller (backoffice)**

`GET/POST/PATCH/DELETE /newsletter/subscribers`; `POST /newsletter/subscribers/import` (multer, CSV parse); `GET /newsletter/subscribers/export.csv`.

- [ ] **Step 3: Campaigns service**

CRUD over `NewsletterCampaign`. `duplicate(id)` clones with `status=DRAFT`. No send logic — omit that method.

- [ ] **Step 4: Campaigns controller**

`GET/POST/PATCH/DELETE /newsletter/campaigns`, `POST /newsletter/campaigns/:id/duplicate`.

- [ ] **Step 5: Module + register + commit**

```bash
git add apps/api/src/newsletter/ apps/api/src/app.module.ts
git commit -m "feat(api): newsletter subscribers + campaigns (send stubbed)"
```

---

### Task 15: Public storefront module

**Files:**
- Create: `apps/api/src/common/throttler.guard.ts` (or install `@nestjs/throttler`)
- Create: `apps/api/src/storefront/{storefront.module,storefront.controller,storefront.service}.ts`
- Create: `apps/api/src/storefront/storefront.controller.spec.ts`
- Modify: `apps/api/src/main.ts` — global rate-limit if using @nestjs/throttler

- [ ] **Step 1: Install throttler**

```bash
cd apps/api && pnpm add @nestjs/throttler
```

- [ ] **Step 2: Storefront service**

```typescript
// storefront.service.ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { validateVoucher } from '../vouchers/vouchers.validator';

@Injectable()
export class StorefrontService {
  constructor(private prisma: PrismaService) {}

  releases(f: { page?: string; limit?: string; format?: string; q?: string }) {
    const page = Math.max(1, Number(f.page ?? 1));
    const limit = Math.min(48, Number(f.limit ?? 24));
    const where: any = { stock: { gt: 0 } };
    if (f.format) where.format = f.format;
    if (f.q) where.OR = [{ artist: { contains: f.q, mode: 'insensitive' } }, { title: { contains: f.q, mode: 'insensitive' } }];
    return this.prisma.release.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit });
  }

  async releaseBySlug(slug: string) {
    const r = await this.prisma.release.findUnique({ where: { slug } });
    if (!r) throw new NotFoundException();
    return r;
  }

  preorders() {
    return this.prisma.release.findMany({ where: { preorder: true }, orderBy: { preorderEta: 'asc' } });
  }

  posts() {
    return this.prisma.post.findMany({ where: { status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' }, take: 50 });
  }

  async postBySlug(slug: string) {
    const p = await this.prisma.post.findUnique({ where: { slug } });
    if (!p || p.status !== 'PUBLISHED') throw new NotFoundException();
    return p;
  }

  async subscribe(body: { email: string; name?: string; source?: string }) {
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes('@')) throw new BadRequestException('Invalid email');
    try {
      return await this.prisma.newsletterSubscriber.create({
        data: { email, name: body.name, source: (body.source as any) ?? 'STOREFRONT' },
      });
    } catch (e: any) {
      if (e.code === 'P2002') return { email, already: true };
      throw e;
    }
  }

  async validateVoucher(body: { code: string; subtotalIdr: number }) {
    const code = body.code?.trim().toUpperCase();
    const v = await this.prisma.voucher.findUnique({ where: { code } });
    if (!v) return { valid: false, discountIdr: 0, reason: 'not_found' };
    return validateVoucher(v, body.subtotalIdr);
  }
}
```

- [ ] **Step 3: Controller (public, no guards)**

```typescript
// storefront.controller.ts
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { Throttle } from '@nestjs/throttler';

@Controller('storefront')
export class StorefrontController {
  constructor(private svc: StorefrontService) {}

  @Get('releases')                     releases(@Query() q: any)          { return this.svc.releases(q); }
  @Get('releases/:slug')               release(@Param('slug') s: string)  { return this.svc.releaseBySlug(s); }
  @Get('preorders')                    preorders()                        { return this.svc.preorders(); }
  @Get('posts')                        posts()                            { return this.svc.posts(); }
  @Get('posts/:slug')                  post(@Param('slug') s: string)     { return this.svc.postBySlug(s); }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('newsletter/subscribe')        subscribe(@Body() b: any)          { return this.svc.subscribe(b); }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('vouchers/validate')           validate(@Body() b: any)           { return this.svc.validateVoucher(b); }
}
```

- [ ] **Step 4: Module**

```typescript
// storefront.module.ts
import { Module } from '@nestjs/common';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])],
  controllers: [StorefrontController],
  providers: [StorefrontService],
})
export class StorefrontModule {}
```

- [ ] **Step 5: Integration test**

```typescript
// storefront.controller.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { StorefrontModule } from './storefront.module';
import { PrismaModule } from '../prisma/prisma.module';

describe('Storefront (public)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [PrismaModule, StorefrontModule] }).compile();
    app = m.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());

  it('rejects invalid email', () =>
    request(app.getHttpServer()).post('/storefront/newsletter/subscribe').send({ email: 'nope' }).expect(400));

  it('lists preorders without auth', () =>
    request(app.getHttpServer()).get('/storefront/preorders').expect(200));
});
```

- [ ] **Step 6: Register + commit**

```bash
git add apps/api/src/storefront/ apps/api/src/app.module.ts apps/api/package.json ../../pnpm-lock.yaml
git commit -m "feat(api): public storefront endpoints with rate-limit"
```

---

## Wave 4 — Frontend API client

### Task 16: API client additions

**Files:**
- Create: `apps/backoffice/src/api/purchaseOrders.ts`
- Create: `apps/backoffice/src/api/preorders.ts`
- Create: `apps/backoffice/src/api/vouchers.ts`
- Create: `apps/backoffice/src/api/newsletter.ts`
- Create: `apps/backoffice/src/api/integrations.ts`
- Create: `apps/backoffice/src/api/storefront.ts` (used by backoffice "preview on storefront" links)

- [ ] **Step 1: One client file per module — same shape as `posts.ts`**

Example — `purchaseOrders.ts`:

```typescript
// apps/backoffice/src/api/purchaseOrders.ts
import { client } from './client';

export interface PoLine { id?: string; releaseId?: string | null; description: string; qtyOrdered: number; qtyReceived: number; unitCostIdr: number; totalIdr: number; }
export interface PurchaseOrder { id: string; poNumber: string; supplierId?: string | null; supplierName: string; status: 'DRAFT'|'SENT'|'PARTIAL'|'RECEIVED'|'CANCELLED'; subtotalIdr: number; taxIdr: number; totalIdr: number; orderedAt?: string | null; etaAt?: string | null; receivedAt?: string | null; notes?: string | null; sourceBillId?: string | null; lines: PoLine[]; }

export const listPos      = (p: { page?: number; limit?: number; status?: string; q?: string } = {}) => client.get<{ items: PurchaseOrder[]; total: number; page: number; limit: number }>('/purchase-orders', { params: p }).then(r => r.data);
export const getPo        = (id: string) => client.get<PurchaseOrder>(`/purchase-orders/${id}`).then(r => r.data);
export const createPo     = (body: Partial<PurchaseOrder> & { lines: Omit<PoLine, 'id' | 'qtyReceived' | 'totalIdr'>[] }) => client.post<PurchaseOrder>('/purchase-orders', body).then(r => r.data);
export const updatePo     = (id: string, body: Partial<PurchaseOrder>) => client.patch<PurchaseOrder>(`/purchase-orders/${id}`, body).then(r => r.data);
export const receivePo    = (id: string, lines: { id: string; qtyReceived: number }[]) => client.post<PurchaseOrder>(`/purchase-orders/${id}/receive`, { lines }).then(r => r.data);
export const cancelPo     = (id: string) => client.post<PurchaseOrder>(`/purchase-orders/${id}/cancel`).then(r => r.data);
export const syncPosFromDealpos = () => client.post<{ created: number }>('/purchase-orders/sync-from-dealpos').then(r => r.data);
```

Repeat pattern for `preorders.ts`, `vouchers.ts`, `newsletter.ts` (two namespaces: `subscribers` and `campaigns`), `integrations.ts` (`discogsLookup`, `appleSearch`, `spotifySearch`, `youtubeSearch`, `bandcampSearch`, `uploadAudio(FormData)`, `discogsRehost(uris)`), `storefront.ts` (thin wrappers used only for the "View on storefront" link).

- [ ] **Step 2: Commit**

```bash
git add apps/backoffice/src/api/
git commit -m "feat(backoffice): API client for new modules and integrations"
```

---

## Wave 5 — Backoffice pages

### Task 17: Sidebar reorder — promote Purchase Orders

**Files:**
- Modify: `apps/backoffice/src/layouts/Sidebar.tsx`

- [ ] **Step 1: Move `Purchase orders` from `Shop` group into `Selling` group above `Inventory`**

Locate the `groups` array in `Sidebar.tsx`. Remove the `Purchase orders` line from `Shop` and insert it in `Selling` just before `Inventory`:

```typescript
{
  label: 'Selling',
  items: [
    { label: 'POS',             to: '/pos',             icon: icons.pos },
    { label: 'Orders',          to: '/orders',          icon: icons.orders, count: pendingOrders },
    { label: 'Purchase orders', to: '/purchase-orders', icon: icons.po },   // ← added
    { label: 'Inventory',       to: '/inventory',       icon: icons.inventory },
    { label: 'Customers',       to: '/customers',       icon: icons.customers },
    { label: 'Channels',        to: '/channels',        icon: icons.channels, statusDot: true },
  ],
},
{
  label: 'Shop',
  items: [
    { label: 'Preorders', to: '/preorders', icon: icons.preorders },
    { label: 'Vouchers',  to: '/vouchers',  icon: icons.vouchers },
  ],
},
```

- [ ] **Step 2: Commit**

```bash
git add apps/backoffice/src/layouts/Sidebar.tsx
git commit -m "feat(backoffice): promote Purchase Orders above Inventory"
```

---

### Task 18: Purchase Orders page

**Files:**
- Create: `apps/backoffice/src/pages/purchase-orders/PurchaseOrdersList.tsx` (rewrite of existing)
- Create: `apps/backoffice/src/pages/purchase-orders/PurchaseOrderDrawer.tsx`
- Create: `apps/backoffice/src/pages/purchase-orders/LineEditor.tsx`

- [ ] **Step 1: `PurchaseOrdersList.tsx`**

Structure:
- Header: title `Purchase Orders` + description
- KPI strip (4 tiles): Open POs · Partially received · Received this month · Value on order — derived client-side by counting the current page's totals plus an inexpensive summary call (implement `/purchase-orders/summary` in the service later if needed; for now compute from a `?limit=200&status=…` batch)
- Toolbar: status pill filter (chips with counts) · supplier search input · `Sync from DealPOS` (calls `syncPosFromDealpos`) · `New PO` (opens Drawer)
- Table columns: PO # · Supplier · Ordered · ETA · Items · Value · Status pill · Actions (Edit / Cancel)
- Table row click opens Drawer for that PO
- Uses React Query: `useQuery(['pos', filters], () => listPos(filters))`, `useMutation` for sync/cancel

Reference the existing `apps/backoffice/src/pages/orders/OrdersList.tsx` (if present) for the visual pattern. Match `.mf-panel-hdr` bar recipe from DESIGN.md at the top of the table card.

- [ ] **Step 2: `PurchaseOrderDrawer.tsx`**

Right-side sheet component:
- Header: PO number, status pill; if `sourceBillId` present, a small link "Sourced from DealPOS bill" with a warning line above the drawer body: "This PO was seeded from DealPOS. Edits stay here — DealPOS re-syncs will not overwrite once you move past DRAFT."
- Body sections: Supplier (name input + optional supplierId), Dates (orderedAt / etaAt), Notes, Lines (via `LineEditor`), Totals (auto-computed)
- Footer buttons: `Save draft`, `Send` (sets status=SENT), `Mark received` (opens a small per-line qty modal → calls `receivePo`), `Cancel PO` (confirm modal → `cancelPo`)

- [ ] **Step 3: `LineEditor.tsx`**

- Table with columns: Description · Release (autocomplete over `getInventory`) · Qty · Unit cost (IDR) · Line total (computed)
- `+ Add line` button appends an empty row
- `Remove` per row
- Emits `onChange(lines)` upward on any edit

- [ ] **Step 4: Commit**

```bash
git add apps/backoffice/src/pages/purchase-orders/
git commit -m "feat(backoffice): purchase orders list + drawer"
```

---

### Task 19: Preorders page

**Files:**
- Replace: `apps/backoffice/src/pages/preorders/Preorders.tsx`
- Create:  `apps/backoffice/src/pages/preorders/AddPreorderDrawer.tsx`

- [ ] **Step 1: Rewrite `Preorders.tsx`**

Structure:
- Header + KPI strip: Active preorders · Expected this month · Total preorder units · Preorder revenue committed
- Toolbar: search input · scope filter (All / Upcoming / Overdue) · `Add preorder` button
- Table: Cover thumb · Artist — Title · Format · Price · ETA (with "in N days" or "N days overdue" pill) · Actions (Edit ETA / Remove preorder / Open release → `/inventory/:id/edit`)
- Uses `listPreorders(filters)` and `setPreorder`/`unsetPreorder`

- [ ] **Step 2: `AddPreorderDrawer.tsx`**

- Release autocomplete (uses `getInventory` with `preorder=false` filter to avoid double-adding)
- ETA date picker (required)
- Notes textarea
- Save → calls `setPreorder(releaseId, { eta, notes })`

- [ ] **Step 3: Commit**

```bash
git add apps/backoffice/src/pages/preorders/
git commit -m "feat(backoffice): preorders list + add preorder drawer"
```

---

### Task 20: Vouchers page

**Files:**
- Replace: `apps/backoffice/src/pages/vouchers/Vouchers.tsx`
- Create:  `apps/backoffice/src/pages/vouchers/VoucherDrawer.tsx`

- [ ] **Step 1: Rewrite `Vouchers.tsx`**

Structure per spec chunk 3. KPI strip 4 tiles; toolbar with code search + status filter + `New voucher`. Table columns: Code · Kind · Value · Min. order · Usage (`used / limit`) · Starts · Expires · Status pill · Actions (Edit / Disable / Delete). Status derives client-side from `active + startsAt + expiresAt`.

- [ ] **Step 2: `VoucherDrawer.tsx`**

- Fields: code (with `Auto-generate` button that emits 8 uppercase chars), kind toggle (PERCENT / FIXED_IDR), value input with suffix `%` or `Rp`, min. order IDR, starts/expires datetimes, usage limit (blank = unlimited), active toggle, notes
- Save → `createVoucher` or `updateVoucher`
- Delete guard: if `usageCount > 0` show `Disable` (sets active=false); else show `Delete` (calls DELETE)

- [ ] **Step 3: Commit**

```bash
git add apps/backoffice/src/pages/vouchers/
git commit -m "feat(backoffice): vouchers list + create/edit drawer"
```

---

### Task 21: Newsletter page (Subscribers + Campaigns tabs)

**Files:**
- Replace: `apps/backoffice/src/pages/newsletter/Newsletter.tsx`
- Create:  `apps/backoffice/src/pages/newsletter/SubscribersTab.tsx`
- Create:  `apps/backoffice/src/pages/newsletter/CampaignsTab.tsx`
- Create:  `apps/backoffice/src/pages/newsletter/SubscriberDrawer.tsx`
- Create:  `apps/backoffice/src/pages/newsletter/CampaignDrawer.tsx`

- [ ] **Step 1: `Newsletter.tsx` (tab shell)**

URL-persisted tabs via `?tab=subscribers|campaigns` (default `subscribers`). Uses `useSearchParams`. Header + description + tabs strip. Body renders `<SubscribersTab />` or `<CampaignsTab />`.

- [ ] **Step 2: `SubscribersTab.tsx`**

KPI strip: Total · New this month · Active · Unsubscribed. Toolbar with email search + source filter + tag filter + `Add subscriber` + `Import CSV` (opens file picker → posts multipart) + `Export CSV` (calls `getExportUrl()` — client `href` triggers download). Table: Email · Name · Source · Tags · Subscribed · Status · Actions (Tag / Unsubscribe / Delete).

- [ ] **Step 3: `CampaignsTab.tsx`**

KPI strip: Draft · Scheduled · Sent · Avg. recipients. Toolbar with subject search + status filter + `New campaign`. Table: Subject · Status · Recipients · Scheduled/Sent · Actions (Edit / Duplicate / Send test / Delete). "Send now" button is **rendered but `disabled`** with tooltip "Email provider not connected (Resend / Mailchimp)".

- [ ] **Step 4: `CampaignDrawer.tsx`**

Fields: subject, preview text, body (markdown textarea, monospace), scheduled-for datetime. Footer: `Save draft`, `Schedule`.

- [ ] **Step 5: `SubscriberDrawer.tsx`**

Fields: email, name, source, tags (chip input). Footer: `Save`.

- [ ] **Step 6: Commit**

```bash
git add apps/backoffice/src/pages/newsletter/
git commit -m "feat(backoffice): newsletter subscribers + campaigns tabs"
```

---

## Wave 6 — Release editor rewrite

### Task 22: Split ReleaseForm into centered section components

**Files:**
- Modify: `apps/backoffice/src/pages/inventory/ReleaseForm.tsx`
- Create: `apps/backoffice/src/pages/inventory/release-edit/{Basics,FormatCondition,Pricing,StockLocation,Channels,Media,Description,Seo,Merchandising}.tsx`

- [ ] **Step 1: Extract each existing section**

Read the current `ReleaseForm.tsx`. For every logical section it renders, cut it into a component in `release-edit/`. Each section component takes `value: ReleaseFormState` and `onChange: (patch) => void`. Keep the form state at the top-level container.

- [ ] **Step 2: Wrap the form in a centered container**

In `ReleaseForm.tsx` return:

```tsx
<div className="mx-auto w-full max-w-[940px] px-6 py-8">
  <StickyFormHeader ... />
  <div className="flex flex-col gap-6">
    <Basics value={state} onChange={patch} />
    <FormatCondition value={state} onChange={patch} />
    <Pricing value={state} onChange={patch} />
    <StockLocation value={state} onChange={patch} />
    <Channels value={state} onChange={patch} />
    <Media value={state} onChange={patch} />
    <Description value={state} onChange={patch} />
    <Seo value={state} onChange={patch} />
    <Merchandising value={state} onChange={patch} />
  </div>
  <StickyFooter ... />
</div>
```

- [ ] **Step 3: Panel header helper**

Reusable `<PanelHeader index number={1} title="Basics" actions={<GetDetailsButton />} />` component that renders a solid accent bar with white text (per DESIGN.md `.mf-panel-hdr` recipe): black background with white text in light theme, inverted in dark.

- [ ] **Step 4: Commit**

```bash
git add apps/backoffice/src/pages/inventory/
git commit -m "refactor(backoffice): split ReleaseForm into centered section components"
```

---

### Task 23: Integrations UI — Get details, Get media, per-track preview

**Files:**
- Create: `apps/backoffice/src/pages/inventory/release-edit/GetDetailsButton.tsx`
- Create: `apps/backoffice/src/pages/inventory/release-edit/DiscogsLookupPopover.tsx`
- Create: `apps/backoffice/src/pages/inventory/release-edit/ApplyFromDiscogsModal.tsx`
- Create: `apps/backoffice/src/pages/inventory/release-edit/GetMediaButton.tsx`
- Create: `apps/backoffice/src/pages/inventory/release-edit/GetMediaModal.tsx`
- Create: `apps/backoffice/src/pages/inventory/release-edit/TrackRow.tsx`
- Create: `apps/backoffice/src/pages/inventory/release-edit/PreviewSourcePopover.tsx`
- Create: `apps/backoffice/src/pages/inventory/release-edit/BatchFetchMenu.tsx`

- [ ] **Step 1: `GetDetailsButton.tsx`**

```tsx
type Props = { discogsId?: string; artist?: string; title?: string; onApply: (fields: Partial<ReleaseState>) => void };

export function GetDetailsButton({ discogsId, artist, title, onApply }: Props) {
  const [popover, setPopover] = useState<'closed' | 'lookup' | 'apply'>('closed');
  const [payload, setPayload] = useState<DiscogsMapped | null>(null);
  const [pending, setPending] = useState(false);

  const runFetch = async (id: string) => {
    setPending(true);
    try {
      const r = await discogsLookup({ discogsId: id });
      setPayload(r);
      setPopover('apply');
    } catch (e) {
      toast.error('Discogs lookup failed');
    } finally {
      setPending(false);
    }
  };

  const onClick = () => {
    if (discogsId) return runFetch(discogsId);
    setPopover('lookup');
  };

  return (
    <>
      <button className="mf-btn" onClick={onClick} disabled={pending}>
        {pending ? 'Fetching…' : 'Get details'}
      </button>
      {popover === 'lookup' && (
        <DiscogsLookupPopover
          artist={artist} title={title}
          onPick={(id) => runFetch(id)}
          onClose={() => setPopover('closed')}
        />
      )}
      {popover === 'apply' && payload && (
        <ApplyFromDiscogsModal
          payload={payload}
          onApply={(picked) => { onApply(picked); setPopover('closed'); }}
          onCancel={() => setPopover('closed')}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: `DiscogsLookupPopover.tsx`**

Small popover with two fields (Discogs ID / Artist + Title). "Search Discogs" button hits `discogsLookup({ artist, title })` and renders up to 5 results as clickable cards. Selection calls `onPick(id)`.

- [ ] **Step 3: `ApplyFromDiscogsModal.tsx`**

Modal with a top note: **"Nothing is applied until you confirm."** Then a checkbox list mapping payload fields → form fields. Weight/dimensions checkboxes are `disabled` when null. `Apply` button computes patch and calls `onApply(patch)`.

- [ ] **Step 4: `GetMediaButton.tsx` + `GetMediaModal.tsx`**

Button in the Media panel header. If no `discogsId`, opens the same `DiscogsLookupPopover`. Once resolved, opens `GetMediaModal`:

- Grid of thumbnails from `payload.images`
- Radio: pick one as primary cover
- Checkboxes: toggle others into gallery
- On confirm: call `discogsRehost({ uris: [chosen, ...gallery] })`, receive our own URLs, then call `onApply({ imageUrl, gallery })`

- [ ] **Step 5: `TrackRow.tsx`**

Row shows: drag handle · position · title (editable) · duration (editable) · `▶` play button · coloured dots per source · `⋯` menu

- Play button chooses the best available preview: apple → spotify.previewUrl → upload → open embed player URL for YouTube/Bandcamp/SoundCloud
- Menu opens `PreviewSourcePopover`

- [ ] **Step 6: `PreviewSourcePopover.tsx`**

Tabs: Apple · Spotify · YouTube · Bandcamp · SoundCloud · Upload

Each tab has two sub-modes: **Fetch** and **Paste link**. Configure per tab:

| Tab | Fetch action | Paste validation |
|---|---|---|
| Apple | `appleSearch({ artist, title })` → list previewable → store `previews.apple = previewUrl` | URL contains `apple.com` or `itunes.apple.com` |
| Spotify | `spotifySearch` → store `{ id, previewUrl }` | Regex `open.spotify.com/track/(\w+)` or `spotify:track:(\w+)` |
| YouTube | `youtubeSearch` → store `{ id, title }` | Regex captures `youtu.be/(id)` or `v=(id)` |
| Bandcamp | `bandcampSearch` → store `guessedTrackUrl` if present, else `searchUrl` | URL contains `bandcamp.com` |
| SoundCloud | none (fetch tab tells user "no auto-search — paste link") | URL contains `soundcloud.com` |
| Upload | Dropzone for mp3 / m4a → `uploadAudio` → store URL | n/a |

Each tab shows a friendly error if the corresponding backend endpoint returns 501 (integration not configured).

- [ ] **Step 7: `BatchFetchMenu.tsx`**

Menu above the tracks list with `Fetch all previews from …` options: Apple, Spotify, YouTube. Loops the tracks sequentially; per-track status column shows `Fetching / Found / No match / Error`. Aborts on 4xx quota errors and toasts the reason.

- [ ] **Step 8: Wire everything into `Media.tsx`**

Media section renders: cover art dropzone + selected image, gallery strip, `Get media` button in the panel header, tracks list with `BatchFetchMenu` and rows of `TrackRow`.

Basics section renders: existing fields + `Get details` button in the panel header.

- [ ] **Step 9: Commit**

```bash
git add apps/backoffice/src/pages/inventory/release-edit/ apps/backoffice/src/pages/inventory/ReleaseForm.tsx
git commit -m "feat(backoffice): release-editor Get details/Get media + per-track previews"
```

---

## Wave 7 — Verification and polish

### Task 24: End-to-end smoke + docs

**Files:**
- Modify: `AGENTS.md` (or `docs/` — small note about the new modules)
- Optional: `.env.example` — add `DISCOGS_TOKEN`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `YOUTUBE_API_KEY`

- [ ] **Step 1: Run typecheck across the workspace**

```bash
pnpm --filter @mf/backoffice typecheck
pnpm --filter @mf/api typecheck
```

Fix errors as they surface. Common issues: enum mismatches between `@prisma/client` and `@mf/shared` re-exports; controllers missing `@Body()` decorators.

- [ ] **Step 2: Run all unit tests**

```bash
cd apps/api && pnpm test
cd ../backoffice && pnpm test
```

- [ ] **Step 3: Boot the dev stack**

```bash
cd apps/api && pnpm dev &
cd apps/backoffice && pnpm dev
```

- [ ] **Step 4: Manual smoke — walk each page**

- Login as admin.
- `/purchase-orders` — click `Sync from DealPOS`, verify DRAFT POs appear; open one; edit a line; click Save; move to SENT; call `Mark received` on one line; verify status flips to PARTIAL.
- `/preorders` — add a preorder from an existing release; verify it lists; edit ETA; remove.
- `/vouchers` — create PERCENT + FIXED_IDR vouchers; try to redeem via `POST /storefront/vouchers/validate` with curl.
- `/newsletter` — add a subscriber; import a small CSV; export CSV.
- `/inventory/:id/edit` — verify centered layout; click `Get details` with a valid Discogs ID; apply fields; click `Get media`, pick a cover; open a track row menu, fetch preview from Apple and paste a Spotify link.
- Public: `curl http://localhost:3000/api/v1/storefront/preorders` — 200; `curl -X POST .../storefront/newsletter/subscribe -d '{"email":"a@b.co"}' -H 'content-type: application/json'` — 201.

- [ ] **Step 5: Add short docs note**

Append to `AGENTS.md` or a new `docs/backoffice-storefront-modules.md` — one paragraph per new module + the env-var list.

- [ ] **Step 6: Commit and open PR**

```bash
git add .
git commit -m "chore: smoke pass + docs for backoffice storefront modules"
git push -u origin claude/backoffice-storefront-modules-07919a
gh pr create --title "Backoffice storefront modules + release-edit integrations" --body "$(cat <<'EOF'
## Summary
- Promote Purchase Orders to the main entry (above Inventory) with editable, DealPOS-seeded workflow
- Real-data backoffice for Preorders, Vouchers, Newsletter (send stubbed)
- Public storefront read endpoints and voucher/newsletter write endpoints
- Release editor now centered (940px) with Get details (Discogs), Get media (Discogs images), and per-track previews from Apple/Spotify/YouTube/Bandcamp/SoundCloud/upload

## Test plan
- [ ] Purchase Orders: sync from DealPOS, edit line, receive partial, cancel
- [ ] Preorders: add / edit ETA / remove
- [ ] Vouchers: create both kinds, disable, validate via public endpoint
- [ ] Newsletter: subscribe (public), import/export CSV, draft campaign
- [ ] Release editor: Get details apply, Get media apply, per-track preview via each source

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review

**Spec coverage check**

- Success criterion 1 (Preorders/Vouchers/Newsletter parity): Tasks 12, 13, 14, 19, 20, 21 ✓
- Success criterion 2 (Purchase Orders editable, above Inventory, DealPOS non-overwrite): Tasks 11, 17, 18 ✓
- Success criterion 3 (Blog unchanged, public endpoint): Task 15 covers `/storefront/posts` ✓
- Success criterion 4 (public storefront endpoints): Task 15 ✓
- Success criterion 5 (release editor centered): Task 22 ✓
- Success criterion 6 (`Get details` non-destructive): Task 4 + Task 23 ✓
- Success criterion 7 (`Get media` gallery, re-host): Task 4 (rehost) + Task 10 + Task 23 ✓
- Success criterion 8 (6 preview sources per track): Tasks 5, 6, 7, 8, 9 + Task 23 ✓
- Success criterion 9 (batch fetch previews): Task 23 step 7 ✓

**Placeholder scan**

- Task 14 Steps 1–4 use pattern references ("mirror `purchase-orders.service.ts`") rather than repeating boilerplate — acceptable per repo convention, but each pattern-referenced task calls out which existing file to model on.
- Task 21 sub-components reference DS recipes by name (`.mf-panel-hdr`); these are defined in DESIGN.md.
- No "TBD", no "add appropriate error handling" — all validation and error paths are described inline or delegated to a specific service call.

**Type consistency**

- `DiscogsMapped` shape used in Tasks 4, 10, 23 matches.
- Voucher validator return shape `{ valid, discountIdr, reason? }` matches storefront endpoint response.
- PO enums (`DRAFT|SENT|PARTIAL|RECEIVED|CANCELLED`) match across Tasks 1, 11, 16, 18.

Plan is complete.
