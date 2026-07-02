# Graph Report - MediumFormat  (2026-07-02)

## Corpus Check
- 88 files · ~256,627 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 344 nodes · 357 edges · 49 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.71)
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
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]

## God Nodes (most connected - your core abstractions)
1. `DealposSyncService` - 17 edges
2. `FinanceService` - 10 edges
3. `DealposClient` - 9 edges
4. `PostsController` - 8 edges
5. `PostsService` - 8 edges
6. `InventoryService` - 8 edges
7. `FinanceController` - 8 edges
8. `mapVariantToRelease()` - 7 edges
9. `SocialService` - 7 edges
10. `InventoryController` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Item` --uses--> `Catalog Title with edition appended in parens if Edition is set.`  [INFERRED]
  import_output/build_tsv.py → import_output/discogs_lookup.py
- `Item` --uses--> `Format(All Caps) Artist(All Caps) Smart Title`  [INFERRED]
  import_output/build_tsv.py → import_output/discogs_lookup.py
- `Item` --uses--> `Cached Discogs search. Returns parsed JSON or None on failure.`  [INFERRED]
  import_output/build_tsv.py → import_output/discogs_lookup.py
- `Item` --uses--> `Returns (identifier, barcode).      identifier = "release/<id>" or "master/<id>"`  [INFERRED]
  import_output/build_tsv.py → import_output/discogs_lookup.py
- `Invoice` --uses--> `Catalog Title with edition appended in parens if Edition is set.`  [INFERRED]
  import_output/build_tsv.py → import_output/discogs_lookup.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (14): downloadExport(), getMargins(), getPayments(), getSummary(), getSyncStatus(), getTimeseries(), params(), DealposController (+6 more)

### Community 1 - "Community 1"
Cohesion: 0.18
Nodes (19): build_block(), fmt_price(), Invoice, Item, main(), write_block(), build_query(), build_row() (+11 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (3): dateOrNull(), DealposSyncService, dec()

### Community 3 - "Community 3"
Cohesion: 0.19
Nodes (7): SocialService, buildWaLink(), fillTemplate(), formatPriceIdr(), normalizeWaPhone(), releaseDisplayTitle(), releaseToFeedRow()

### Community 4 - "Community 4"
Cohesion: 0.26
Nodes (4): FinanceService, num(), round2(), toCsv()

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (5): createPost(), deletePost(), updatePost(), handleDelete(), handleSubmit()

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (5): createRelease(), deleteRelease(), updateRelease(), handleDelete(), handleSubmit()

### Community 7 - "Community 7"
Cohesion: 0.22
Nodes (3): getListings(), updateSocialSettings(), save()

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (1): DealposClient

### Community 9 - "Community 9"
Cohesion: 0.36
Nodes (8): find_last_data_row(), get_service(), main(), push(), Find a tab by case-insensitive match. Returns (sheetId, exact title)., 1-indexed last row containing any value in column A. Returns 0 if empty., read_tsv(), resolve_tab()

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (1): PostsController

### Community 11 - "Community 11"
Cohesion: 0.28
Nodes (1): PostsService

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (1): InventoryService

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (1): FinanceController

### Community 14 - "Community 14"
Cohesion: 0.43
Nodes (6): genreFromCategory(), inferFormat(), mapVariantToRelease(), normalizeBarcode(), splitArtistTitle(), stripFormatPrefix()

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (1): InventoryController

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (1): UsersService

### Community 17 - "Community 17"
Cohesion: 0.29
Nodes (1): UsersController

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (2): AuthService, handleSubmit()

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (1): SocialController

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (2): useAuth(), ProtectedRoutes()

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (1): AuthController

### Community 22 - "Community 22"
Cohesion: 0.4
Nodes (4): ExportQueryDto, FinanceQueryDto, MarginsQueryDto, TimeseriesQueryDto

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (2): ThemeToggle(), useTheme()

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (1): JwtStrategy

### Community 26 - "Community 26"
Cohesion: 0.5
Nodes (1): RolesGuard

### Community 27 - "Community 27"
Cohesion: 0.5
Nodes (1): PrismaService

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (1): PublicFeedController

### Community 30 - "Community 30"
Cohesion: 0.67
Nodes (1): main()

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (2): loadEnv(), main()

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): AppModule

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): PostsModule

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (1): CreatePostDto

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (1): PostFilterDto

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): UpdatePostDto

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): DealposModule

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): AuthModule

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): LoginDto

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): JwtAuthGuard

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): PrismaModule

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): SocialModule

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): UpdateSocialSettingsDto

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): InventoryModule

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): UpdateReleaseDto

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): ReleaseFilterDto

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): CreateReleaseDto

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (1): UsersModule

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (1): CreateUserDto

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (1): FinanceModule

## Knowledge Gaps
- **25 isolated node(s):** `Find a tab by case-insensitive match. Returns (sheetId, exact title).`, `1-indexed last row containing any value in column A. Returns 0 if empty.`, `AppModule`, `PostsModule`, `CreatePostDto` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 8`** (10 nodes): `dealpos.client.ts`, `DealposClient`, `.authenticate()`, `.baseUrl()`, `.ensureToken()`, `.get()`, `.isConfigured()`, `.paginate()`, `.post()`, `.request()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (9 nodes): `posts.controller.ts`, `PostsController`, `.constructor()`, `.create()`, `.findAll()`, `.findBySlug()`, `.findOne()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (9 nodes): `posts.service.ts`, `PostsService`, `.constructor()`, `.create()`, `.findAll()`, `.findBySlug()`, `.findOne()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (9 nodes): `inventory.service.ts`, `InventoryService`, `.adjustStock()`, `.constructor()`, `.create()`, `.findAll()`, `.findOne()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (9 nodes): `finance.controller.ts`, `FinanceController`, `.constructor()`, `.export()`, `.filters()`, `.margins()`, `.payments()`, `.summary()`, `.timeseries()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (8 nodes): `inventory.controller.ts`, `InventoryController`, `.constructor()`, `.create()`, `.findAll()`, `.findOne()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (7 nodes): `users.service.ts`, `UsersService`, `.constructor()`, `.create()`, `.deactivate()`, `.findAll()`, `.findOne()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (7 nodes): `users.controller.ts`, `UsersController`, `.constructor()`, `.create()`, `.deactivate()`, `.findAll()`, `.findOne()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (6 nodes): `auth.service.ts`, `Login.tsx`, `AuthService`, `.constructor()`, `.login()`, `handleSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (6 nodes): `social.controller.ts`, `SocialController`, `.constructor()`, `.getSettings()`, `.listings()`, `.updateSettings()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (5 nodes): `App.tsx`, `useAuth.tsx`, `AuthProvider()`, `useAuth()`, `ProtectedRoutes()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (5 nodes): `auth.controller.ts`, `AuthController`, `.constructor()`, `.login()`, `.me()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (4 nodes): `ThemeToggle.tsx`, `useTheme.ts`, `ThemeToggle()`, `useTheme()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (4 nodes): `jwt.strategy.ts`, `JwtStrategy`, `.constructor()`, `.validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (4 nodes): `roles.guard.ts`, `RolesGuard`, `.canActivate()`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (4 nodes): `prisma.service.ts`, `PrismaService`, `.onModuleDestroy()`, `.onModuleInit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (4 nodes): `public-feed.controller.ts`, `PublicFeedController`, `.constructor()`, `.feed()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (3 nodes): `seed.js`, `seed.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (3 nodes): `sync-dealpos.ts`, `loadEnv()`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `app.module.ts`, `AppModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `posts.module.ts`, `PostsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `create-post.dto.ts`, `CreatePostDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `post-filter.dto.ts`, `PostFilterDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `update-post.dto.ts`, `UpdatePostDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `dealpos.module.ts`, `DealposModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `auth.module.ts`, `AuthModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `login.dto.ts`, `LoginDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (2 nodes): `jwt-auth.guard.ts`, `JwtAuthGuard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `prisma.module.ts`, `PrismaModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `social.module.ts`, `SocialModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `update-social-settings.dto.ts`, `UpdateSocialSettingsDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (2 nodes): `inventory.module.ts`, `InventoryModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (2 nodes): `update-release.dto.ts`, `UpdateReleaseDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (2 nodes): `release-filter.dto.ts`, `ReleaseFilterDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (2 nodes): `create-release.dto.ts`, `CreateReleaseDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (2 nodes): `users.module.ts`, `UsersModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (2 nodes): `create-user.dto.ts`, `CreateUserDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (2 nodes): `finance.module.ts`, `FinanceModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toCsv()` connect `Community 4` to `Community 3`, `Community 13`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `DealposSyncService` connect `Community 2` to `Community 14`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `Find a tab by case-insensitive match. Returns (sheetId, exact title).`, `1-indexed last row containing any value in column A. Returns 0 if empty.`, `AppModule` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._