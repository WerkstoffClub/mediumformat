# Graph Report - MediumFormat  (2026-07-06)

## Corpus Check
- 108 files · ~267,602 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 422 nodes · 429 edges · 53 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.74)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]

## God Nodes (most connected - your core abstractions)
1. `DealposSyncService` - 17 edges
2. `FinanceService` - 10 edges
3. `DealposClient` - 9 edges
4. `load()` - 8 edges
5. `PostsController` - 8 edges
6. `PostsService` - 8 edges
7. `InventoryService` - 8 edges
8. `OpsService` - 8 edges
9. `OpsController` - 8 edges
10. `FinanceController` - 8 edges

## Surprising Connections (you probably didn't know these)
- `load()` --calls--> `getReleases()`  [INFERRED]
  apps/backoffice/src/pages/channels/Channels.tsx → apps/backoffice/src/api/inventory.ts
- `load()` --calls--> `getChannels()`  [INFERRED]
  apps/backoffice/src/pages/channels/Channels.tsx → apps/backoffice/src/api/ops.ts
- `load()` --calls--> `getSocialSettings()`  [INFERRED]
  apps/backoffice/src/pages/channels/Channels.tsx → apps/backoffice/src/api/social.ts
- `handleDelete()` --calls--> `load()`  [INFERRED]
  apps/backoffice/src/pages/blog/BlogList.tsx → apps/backoffice/src/pages/channels/Channels.tsx
- `Item` --uses--> `Catalog Title with edition appended in parens if Edition is set.`  [INFERRED]
  import_output/build_tsv.py → import_output/discogs_lookup.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (11): getSyncStatus(), getChannels(), getListings(), getSocialSettings(), updateSocialSettings(), load(), onFeedToggle(), onSyncNow() (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.18
Nodes (19): build_block(), fmt_price(), Invoice, Item, main(), write_block(), build_query(), build_row() (+11 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (9): DealposClient, find_last_data_row(), get_service(), main(), push(), Find a tab by case-insensitive match. Returns (sheetId, exact title)., 1-indexed last row containing any value in column A. Returns 0 if empty., read_tsv() (+1 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (3): dateOrNull(), DealposSyncService, dec()

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (11): downloadExport(), getMargins(), getPayments(), getSummary(), getTimeseries(), params(), exportCsv(), fmtRp() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.19
Nodes (7): SocialService, buildWaLink(), fillTemplate(), formatPriceIdr(), normalizeWaPhone(), releaseDisplayTitle(), releaseToFeedRow()

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (6): createRelease(), deleteRelease(), getReleases(), updateRelease(), handleDelete(), handleSubmit()

### Community 7 - "Community 7"
Cohesion: 0.26
Nodes (4): FinanceService, num(), round2(), toCsv()

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (5): createPost(), deletePost(), updatePost(), handleDelete(), handleSubmit()

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (5): ThemeToggle(), useAuth(), useTheme(), Preferences(), ProtectedRoutes()

### Community 10 - "Community 10"
Cohesion: 0.2
Nodes (1): OpsService

### Community 11 - "Community 11"
Cohesion: 0.22
Nodes (1): PostsController

### Community 12 - "Community 12"
Cohesion: 0.28
Nodes (1): PostsService

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (1): InventoryService

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (1): OpsController

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (1): FinanceController

### Community 17 - "Community 17"
Cohesion: 0.43
Nodes (6): genreFromCategory(), inferFormat(), mapVariantToRelease(), normalizeBarcode(), splitArtistTitle(), stripFormatPrefix()

### Community 18 - "Community 18"
Cohesion: 0.25
Nodes (1): InventoryController

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (1): UsersService

### Community 20 - "Community 20"
Cohesion: 0.29
Nodes (1): UsersController

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (2): AuthService, handleSubmit()

### Community 22 - "Community 22"
Cohesion: 0.4
Nodes (2): iso(), windows()

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (1): SocialController

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (1): AuthController

### Community 25 - "Community 25"
Cohesion: 0.4
Nodes (4): ExportQueryDto, FinanceQueryDto, MarginsQueryDto, TimeseriesQueryDto

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (2): iso(), range()

### Community 27 - "Community 27"
Cohesion: 0.5
Nodes (1): JwtStrategy

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (1): RolesGuard

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (1): PrismaService

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (1): PublicFeedController

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (3): ChannelsQueryDto, OrdersQueryDto, PagedQueryDto

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (1): main()

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (2): loadEnv(), main()

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): AppModule

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): PostsModule

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): CreatePostDto

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): PostFilterDto

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): UpdatePostDto

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): DealposModule

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): AuthModule

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): LoginDto

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (1): JwtAuthGuard

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (1): PrismaModule

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (1): SocialModule

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (1): UpdateSocialSettingsDto

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (1): InventoryModule

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (1): UpdateReleaseDto

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (1): ReleaseFilterDto

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (1): CreateReleaseDto

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (1): UsersModule

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (1): CreateUserDto

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (1): OpsModule

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (1): FinanceModule

## Knowledge Gaps
- **29 isolated node(s):** `Find a tab by case-insensitive match. Returns (sheetId, exact title).`, `1-indexed last row containing any value in column A. Returns 0 if empty.`, `AppModule`, `PostsModule`, `CreatePostDto` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (10 nodes): `ops.service.ts`, `num()`, `OpsService`, `.catalogSummary()`, `.channels()`, `.constructor()`, `.customers()`, `.order()`, `.orders()`, `.purchaseOrders()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (9 nodes): `posts.controller.ts`, `PostsController`, `.constructor()`, `.create()`, `.findAll()`, `.findBySlug()`, `.findOne()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (9 nodes): `posts.service.ts`, `PostsService`, `.constructor()`, `.create()`, `.findAll()`, `.findBySlug()`, `.findOne()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (9 nodes): `inventory.service.ts`, `InventoryService`, `.adjustStock()`, `.constructor()`, `.create()`, `.findAll()`, `.findOne()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (9 nodes): `ops.controller.ts`, `OpsController`, `.catalogSummary()`, `.channels()`, `.constructor()`, `.customers()`, `.order()`, `.orders()`, `.purchaseOrders()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (9 nodes): `finance.controller.ts`, `FinanceController`, `.constructor()`, `.export()`, `.filters()`, `.margins()`, `.payments()`, `.summary()`, `.timeseries()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (8 nodes): `inventory.controller.ts`, `InventoryController`, `.constructor()`, `.create()`, `.findAll()`, `.findOne()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (7 nodes): `users.service.ts`, `UsersService`, `.constructor()`, `.create()`, `.deactivate()`, `.findAll()`, `.findOne()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (7 nodes): `users.controller.ts`, `UsersController`, `.constructor()`, `.create()`, `.deactivate()`, `.findAll()`, `.findOne()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (6 nodes): `auth.service.ts`, `Login.tsx`, `AuthService`, `.constructor()`, `.login()`, `handleSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (6 nodes): `Dashboard.tsx`, `Delta()`, `iso()`, `RevenueChart()`, `Spark()`, `windows()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (6 nodes): `social.controller.ts`, `SocialController`, `.constructor()`, `.getSettings()`, `.listings()`, `.updateSettings()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (5 nodes): `auth.controller.ts`, `AuthController`, `.constructor()`, `.login()`, `.me()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (4 nodes): `iso()`, `range()`, `ShareBar()`, `Analytics.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (4 nodes): `jwt.strategy.ts`, `JwtStrategy`, `.constructor()`, `.validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (4 nodes): `roles.guard.ts`, `RolesGuard`, `.canActivate()`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (4 nodes): `prisma.service.ts`, `PrismaService`, `.onModuleDestroy()`, `.onModuleInit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (4 nodes): `public-feed.controller.ts`, `PublicFeedController`, `.constructor()`, `.feed()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (3 nodes): `seed.js`, `seed.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (3 nodes): `sync-dealpos.ts`, `loadEnv()`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `app.module.ts`, `AppModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (2 nodes): `posts.module.ts`, `PostsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `create-post.dto.ts`, `CreatePostDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `post-filter.dto.ts`, `PostFilterDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `update-post.dto.ts`, `UpdatePostDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (2 nodes): `dealpos.module.ts`, `DealposModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (2 nodes): `auth.module.ts`, `AuthModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (2 nodes): `login.dto.ts`, `LoginDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (2 nodes): `jwt-auth.guard.ts`, `JwtAuthGuard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (2 nodes): `prisma.module.ts`, `PrismaModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (2 nodes): `social.module.ts`, `SocialModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (2 nodes): `update-social-settings.dto.ts`, `UpdateSocialSettingsDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (2 nodes): `inventory.module.ts`, `InventoryModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (2 nodes): `update-release.dto.ts`, `UpdateReleaseDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (2 nodes): `release-filter.dto.ts`, `ReleaseFilterDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (2 nodes): `create-release.dto.ts`, `CreateReleaseDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (2 nodes): `users.module.ts`, `UsersModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (2 nodes): `create-user.dto.ts`, `CreateUserDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (2 nodes): `ops.module.ts`, `OpsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (2 nodes): `finance.module.ts`, `FinanceModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `load()` connect `Community 0` to `Community 8`, `Community 6`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `getReleases()` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `handleDelete()` connect `Community 8` to `Community 0`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `load()` (e.g. with `handleDelete()` and `onSync()`) actually correct?**
  _`load()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Find a tab by case-insensitive match. Returns (sheetId, exact title).`, `1-indexed last row containing any value in column A. Returns 0 if empty.`, `AppModule` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._