# Graph Report - order-detail-redesign-e4fe8c  (2026-07-12)

## Corpus Check
- 235 files · ~348,227 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 954 nodes · 948 edges · 110 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.77)
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
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 117|Community 117]]
- [[_COMMUNITY_Community 118|Community 118]]
- [[_COMMUNITY_Community 120|Community 120]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 122|Community 122]]
- [[_COMMUNITY_Community 123|Community 123]]
- [[_COMMUNITY_Community 124|Community 124]]
- [[_COMMUNITY_Community 125|Community 125]]
- [[_COMMUNITY_Community 126|Community 126]]
- [[_COMMUNITY_Community 127|Community 127]]
- [[_COMMUNITY_Community 129|Community 129]]
- [[_COMMUNITY_Community 130|Community 130]]
- [[_COMMUNITY_Community 131|Community 131]]
- [[_COMMUNITY_Community 132|Community 132]]
- [[_COMMUNITY_Community 133|Community 133]]
- [[_COMMUNITY_Community 134|Community 134]]
- [[_COMMUNITY_Community 135|Community 135]]
- [[_COMMUNITY_Community 136|Community 136]]
- [[_COMMUNITY_Community 137|Community 137]]
- [[_COMMUNITY_Community 138|Community 138]]
- [[_COMMUNITY_Community 139|Community 139]]
- [[_COMMUNITY_Community 140|Community 140]]
- [[_COMMUNITY_Community 141|Community 141]]
- [[_COMMUNITY_Community 143|Community 143]]
- [[_COMMUNITY_Community 144|Community 144]]
- [[_COMMUNITY_Community 145|Community 145]]
- [[_COMMUNITY_Community 146|Community 146]]
- [[_COMMUNITY_Community 147|Community 147]]
- [[_COMMUNITY_Community 148|Community 148]]
- [[_COMMUNITY_Community 149|Community 149]]
- [[_COMMUNITY_Community 150|Community 150]]
- [[_COMMUNITY_Community 151|Community 151]]
- [[_COMMUNITY_Community 152|Community 152]]

## God Nodes (most connected - your core abstractions)
1. `DealposSyncService` - 17 edges
2. `load()` - 16 edges
3. `PurchaseOrdersService` - 11 edges
4. `OpsService` - 11 edges
5. `onChange()` - 10 edges
6. `LocationsService` - 10 edges
7. `FinanceService` - 10 edges
8. `SubscribersService` - 10 edges
9. `StorefrontController` - 9 edges
10. `StorefrontService` - 9 edges

## Surprising Connections (you probably didn't know these)
- `getSyncStatus()` --calls--> `load()`  [INFERRED]
  /Users/sonatsu/Documents/Projects/Claude/MediumFormat/apps/backoffice/src/api/finance.ts → apps/backoffice/src/pages/channels/Channels.tsx
- `getSocialSettings()` --calls--> `load()`  [INFERRED]
  /Users/sonatsu/Documents/Projects/Claude/MediumFormat/apps/backoffice/src/api/social.ts → apps/backoffice/src/pages/channels/Channels.tsx
- `handleDelete()` --calls--> `load()`  [INFERRED]
  /Users/sonatsu/Documents/Projects/Claude/MediumFormat/apps/backoffice/src/pages/blog/BlogList.tsx → apps/backoffice/src/pages/channels/Channels.tsx
- `Item` --uses--> `Catalog Title with edition appended in parens if Edition is set.`  [INFERRED]
  /Users/sonatsu/Documents/Projects/Claude/MediumFormat/import_output/build_tsv.py → import_output/discogs_lookup.py
- `Item` --uses--> `Format(All Caps) Artist(All Caps) Smart Title`  [INFERRED]
  /Users/sonatsu/Documents/Projects/Claude/MediumFormat/import_output/build_tsv.py → import_output/discogs_lookup.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (23): getSyncStatus(), deleteCampaign(), deleteSubscriber(), duplicateCampaign(), importSubscribersCsv(), unsubscribeSubscriber(), getChannels(), syncPosFromDealpos() (+15 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (19): createLocation(), deleteLocation(), getLocations(), updateLocation(), setPreorder(), unsetPreorder(), onKey(), close() (+11 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (20): appleSearch(), bandcampSearch(), discogsLookup(), uploadAudio(), DealposClient, find_last_data_row(), get_service(), main() (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (9): genreFromCategory(), inferFormat(), mapVariantToRelease(), normalizeBarcode(), splitArtistTitle(), stripFormatPrefix(), dateOrNull(), DealposSyncService (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (9): FinanceController, toCsv(), SocialService, buildWaLink(), fillTemplate(), formatPriceIdr(), normalizeWaPhone(), releaseDisplayTitle() (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (19): build_block(), fmt_price(), Invoice, Item, main(), write_block(), build_query(), build_row() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (10): ApiError, getPost(), getRelease(), listPosts(), listPreorders(), listReleases(), subscribeNewsletter(), unwrap() (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (11): onChange(), add(), emptyLine(), remove(), update(), runFor(), addTrack(), patchTrack() (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (8): aiAssist(), createRelease(), deleteRelease(), getReleases(), updateRelease(), handleDelete(), handleSubmit(), runAi()

### Community 9 - "Community 9"
Cohesion: 0.21
Nodes (6): extractWeightGrams(), hasDescription(), inferFormat(), mapDiscogsRelease(), toQty(), DiscogsService

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (2): channelColor(), channelLabel()

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (5): createPost(), deletePost(), updatePost(), handleDelete(), handleSubmit()

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (2): num(), OpsService

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (3): FinanceService, num(), round2()

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (5): ThemeToggle(), useAuth(), useTheme(), Preferences(), ProtectedRoutes()

### Community 15 - "Community 15"
Cohesion: 0.24
Nodes (6): fmtDateTime(), fmtPaidRelative(), fmtStamp(), isDateOnly(), sameDay(), timeFor()

### Community 16 - "Community 16"
Cohesion: 0.32
Nodes (1): PurchaseOrdersService

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (1): LocationsService

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (1): SubscribersService

### Community 20 - "Community 20"
Cohesion: 0.2
Nodes (1): StorefrontController

### Community 21 - "Community 21"
Cohesion: 0.2
Nodes (1): StorefrontService

### Community 22 - "Community 22"
Cohesion: 0.2
Nodes (1): PurchaseOrdersController

### Community 23 - "Community 23"
Cohesion: 0.2
Nodes (1): OpsController

### Community 24 - "Community 24"
Cohesion: 0.2
Nodes (1): SubscribersController

### Community 25 - "Community 25"
Cohesion: 0.36
Nodes (6): downloadExport(), getMargins(), getPayments(), getSummary(), getTimeseries(), params()

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (1): PostsController

### Community 27 - "Community 27"
Cohesion: 0.28
Nodes (1): PostsService

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (1): InventoryService

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (1): InventoryController

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (1): CampaignsService

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (1): CampaignsController

### Community 32 - "Community 32"
Cohesion: 0.32
Nodes (3): completeSale(), handleCharge(), newOrderNumber()

### Community 34 - "Community 34"
Cohesion: 0.36
Nodes (1): VouchersService

### Community 35 - "Community 35"
Cohesion: 0.25
Nodes (1): VouchersController

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (1): LocationsController

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (1): UsersService

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (1): UsersController

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (2): AuthService, handleSubmit()

### Community 45 - "Community 45"
Cohesion: 0.4
Nodes (2): iso(), windows()

### Community 46 - "Community 46"
Cohesion: 0.4
Nodes (2): isoDay(), presetRange()

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (1): PreordersController

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (1): PreordersService

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (1): SocialController

### Community 51 - "Community 51"
Cohesion: 0.7
Nodes (4): commitSearch(), gotoPage(), onFormatChange(), setUrl()

### Community 53 - "Community 53"
Cohesion: 0.4
Nodes (1): AuthController

### Community 54 - "Community 54"
Cohesion: 0.4
Nodes (1): DiscogsController

### Community 55 - "Community 55"
Cohesion: 0.6
Nodes (1): UploadService

### Community 56 - "Community 56"
Cohesion: 0.4
Nodes (4): ChannelsQueryDto, CustomersQueryDto, OrdersQueryDto, PagedQueryDto

### Community 57 - "Community 57"
Cohesion: 0.4
Nodes (4): ExportQueryDto, FinanceQueryDto, MarginsQueryDto, TimeseriesQueryDto

### Community 58 - "Community 58"
Cohesion: 0.83
Nodes (3): escapeHtml(), inline(), renderMarkdown()

### Community 61 - "Community 61"
Cohesion: 0.83
Nodes (3): categoryOf(), formatLabel(), releaseToProduct()

### Community 63 - "Community 63"
Cohesion: 0.67
Nodes (2): pickPlayable(), TrackRow()

### Community 64 - "Community 64"
Cohesion: 0.5
Nodes (1): JwtStrategy

### Community 65 - "Community 65"
Cohesion: 0.5
Nodes (1): RolesGuard

### Community 66 - "Community 66"
Cohesion: 0.5
Nodes (1): PrismaService

### Community 67 - "Community 67"
Cohesion: 0.5
Nodes (1): AppleController

### Community 68 - "Community 68"
Cohesion: 0.5
Nodes (1): BandcampController

### Community 69 - "Community 69"
Cohesion: 0.5
Nodes (1): UploadController

### Community 70 - "Community 70"
Cohesion: 0.5
Nodes (1): PublicFeedController

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (2): ApplyFromDiscogsModal(), mapFormat()

### Community 76 - "Community 76"
Cohesion: 0.67
Nodes (1): main()

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (2): loadEnv(), main()

### Community 78 - "Community 78"
Cohesion: 0.67
Nodes (2): CreatePoDto, CreatePoLineDto

### Community 79 - "Community 79"
Cohesion: 0.67
Nodes (2): ReceiveLineDto, ReceiveLinesDto

### Community 80 - "Community 80"
Cohesion: 0.67
Nodes (1): AppleService

### Community 81 - "Community 81"
Cohesion: 0.67
Nodes (1): BandcampService

### Community 83 - "Community 83"
Cohesion: 0.67
Nodes (2): CampaignFilterDto, SubscriberFilterDto

### Community 106 - "Community 106"
Cohesion: 1.0
Nodes (1): AppModule

### Community 107 - "Community 107"
Cohesion: 1.0
Nodes (1): StorefrontModule

### Community 108 - "Community 108"
Cohesion: 1.0
Nodes (1): PostsModule

### Community 109 - "Community 109"
Cohesion: 1.0
Nodes (1): CreatePostDto

### Community 110 - "Community 110"
Cohesion: 1.0
Nodes (1): PostFilterDto

### Community 111 - "Community 111"
Cohesion: 1.0
Nodes (1): UpdatePostDto

### Community 112 - "Community 112"
Cohesion: 1.0
Nodes (1): PurchaseOrdersModule

### Community 114 - "Community 114"
Cohesion: 1.0
Nodes (1): PoFilterDto

### Community 115 - "Community 115"
Cohesion: 1.0
Nodes (1): UpdatePoDto

### Community 116 - "Community 116"
Cohesion: 1.0
Nodes (1): DealposModule

### Community 117 - "Community 117"
Cohesion: 1.0
Nodes (1): AuthModule

### Community 118 - "Community 118"
Cohesion: 1.0
Nodes (1): LoginDto

### Community 120 - "Community 120"
Cohesion: 1.0
Nodes (1): JwtAuthGuard

### Community 121 - "Community 121"
Cohesion: 1.0
Nodes (1): PrismaModule

### Community 122 - "Community 122"
Cohesion: 1.0
Nodes (1): PreordersModule

### Community 123 - "Community 123"
Cohesion: 1.0
Nodes (1): SetPreorderDto

### Community 124 - "Community 124"
Cohesion: 1.0
Nodes (1): IntegrationsModule

### Community 125 - "Community 125"
Cohesion: 1.0
Nodes (1): AppleModule

### Community 126 - "Community 126"
Cohesion: 1.0
Nodes (1): BandcampModule

### Community 127 - "Community 127"
Cohesion: 1.0
Nodes (1): DiscogsModule

### Community 129 - "Community 129"
Cohesion: 1.0
Nodes (1): UploadModule

### Community 130 - "Community 130"
Cohesion: 1.0
Nodes (1): SocialModule

### Community 131 - "Community 131"
Cohesion: 1.0
Nodes (1): UpdateSocialSettingsDto

### Community 132 - "Community 132"
Cohesion: 1.0
Nodes (1): LocationsModule

### Community 133 - "Community 133"
Cohesion: 1.0
Nodes (1): UpdateLocationDto

### Community 134 - "Community 134"
Cohesion: 1.0
Nodes (1): CreateLocationDto

### Community 135 - "Community 135"
Cohesion: 1.0
Nodes (1): InventoryModule

### Community 136 - "Community 136"
Cohesion: 1.0
Nodes (1): UpdateReleaseDto

### Community 137 - "Community 137"
Cohesion: 1.0
Nodes (1): ReleaseFilterDto

### Community 138 - "Community 138"
Cohesion: 1.0
Nodes (1): CreateReleaseDto

### Community 139 - "Community 139"
Cohesion: 1.0
Nodes (1): UsersModule

### Community 140 - "Community 140"
Cohesion: 1.0
Nodes (1): CreateUserDto

### Community 141 - "Community 141"
Cohesion: 1.0
Nodes (1): VouchersModule

### Community 143 - "Community 143"
Cohesion: 1.0
Nodes (1): CreateVoucherDto

### Community 144 - "Community 144"
Cohesion: 1.0
Nodes (1): UpdateVoucherDto

### Community 145 - "Community 145"
Cohesion: 1.0
Nodes (1): VoucherFilterDto

### Community 146 - "Community 146"
Cohesion: 1.0
Nodes (1): OpsModule

### Community 147 - "Community 147"
Cohesion: 1.0
Nodes (1): FinanceModule

### Community 148 - "Community 148"
Cohesion: 1.0
Nodes (1): NewsletterModule

### Community 149 - "Community 149"
Cohesion: 1.0
Nodes (1): UpdateSubscriberDto

### Community 150 - "Community 150"
Cohesion: 1.0
Nodes (1): UpdateCampaignDto

### Community 151 - "Community 151"
Cohesion: 1.0
Nodes (1): CreateSubscriberDto

### Community 152 - "Community 152"
Cohesion: 1.0
Nodes (1): CreateCampaignDto

## Knowledge Gaps
- **59 isolated node(s):** `Find a tab by case-insensitive match. Returns (sheetId, exact title).`, `1-indexed last row containing any value in column A. Returns 0 if empty.`, `AppModule`, `StorefrontModule`, `PostsModule` (+54 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (14 nodes): `channelColor()`, `channelLabel()`, `customerLabel()`, `fmtDate()`, `fmtIdr()`, `fmtIdrCompact()`, `getCatalogSummary()`, `getCustomerDetail()`, `getCustomers()`, `getCustomersSummary()`, `getOrder()`, `getOrders()`, `getPurchaseOrders()`, `ops.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (13 nodes): `ops.service.ts`, `num()`, `OpsService`, `.catalogSummary()`, `.channels()`, `.constructor()`, `.customerDetail()`, `.customers()`, `.customersSummary()`, `.order()`, `.orders()`, `.segment()`, `.shapeCustomer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (12 nodes): `purchase-orders.service.ts`, `PurchaseOrdersService`, `.cancel()`, `.constructor()`, `.create()`, `.findAll()`, `.findOne()`, `.nextPoNumber()`, `.receive()`, `.syncFromDealpos()`, `.totals()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (11 nodes): `locations.service.ts`, `LocationsService`, `.constructor()`, `.create()`, `.ensureSeeded()`, `.eventSalesBatch()`, `.findAll()`, `.findOne()`, `.remove()`, `.statsByStore()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (11 nodes): `subscribers.service.ts`, `SubscribersService`, `.constructor()`, `.create()`, `.exportCsv()`, `.findAll()`, `.findOne()`, `.importCsv()`, `.remove()`, `.unsubscribe()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (10 nodes): `storefront.controller.ts`, `StorefrontController`, `.constructor()`, `.post()`, `.posts()`, `.preorders()`, `.release()`, `.releases()`, `.subscribe()`, `.validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (10 nodes): `storefront.service.ts`, `StorefrontService`, `.constructor()`, `.postBySlug()`, `.posts()`, `.preorders()`, `.releaseBySlug()`, `.releases()`, `.subscribe()`, `.validateVoucher()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (10 nodes): `purchase-orders.controller.ts`, `PurchaseOrdersController`, `.cancel()`, `.constructor()`, `.create()`, `.findOne()`, `.list()`, `.receive()`, `.sync()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (10 nodes): `ops.controller.ts`, `OpsController`, `.catalogSummary()`, `.channels()`, `.constructor()`, `.customerDetail()`, `.customers()`, `.customersSummary()`, `.order()`, `.orders()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (10 nodes): `subscribers.controller.ts`, `SubscribersController`, `.constructor()`, `.create()`, `.export()`, `.import()`, `.list()`, `.remove()`, `.unsubscribe()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (9 nodes): `PostsController`, `.constructor()`, `.create()`, `.findAll()`, `.findBySlug()`, `.findOne()`, `.remove()`, `.update()`, `posts.controller.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (9 nodes): `PostsService`, `.constructor()`, `.create()`, `.findAll()`, `.findBySlug()`, `.findOne()`, `.remove()`, `.update()`, `posts.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (9 nodes): `inventory.service.ts`, `InventoryService`, `.adjustStock()`, `.constructor()`, `.create()`, `.findAll()`, `.findOne()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (9 nodes): `inventory.controller.ts`, `InventoryController`, `.assist()`, `.constructor()`, `.create()`, `.findAll()`, `.findOne()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (9 nodes): `campaigns.service.ts`, `CampaignsService`, `.constructor()`, `.create()`, `.duplicate()`, `.findAll()`, `.findOne()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (9 nodes): `campaigns.controller.ts`, `CampaignsController`, `.constructor()`, `.create()`, `.duplicate()`, `.findOne()`, `.list()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (8 nodes): `vouchers.service.ts`, `VouchersService`, `.constructor()`, `.create()`, `.findAll()`, `.findOne()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (8 nodes): `vouchers.controller.ts`, `VouchersController`, `.constructor()`, `.create()`, `.findOne()`, `.list()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (7 nodes): `locations.controller.ts`, `LocationsController`, `.constructor()`, `.create()`, `.findAll()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (7 nodes): `users.service.ts`, `UsersService`, `.constructor()`, `.create()`, `.deactivate()`, `.findAll()`, `.findOne()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (7 nodes): `users.controller.ts`, `UsersController`, `.constructor()`, `.create()`, `.deactivate()`, `.findAll()`, `.findOne()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (6 nodes): `AuthService`, `.constructor()`, `.login()`, `handleSubmit()`, `auth.service.ts`, `Login.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (6 nodes): `Dashboard.tsx`, `Delta()`, `iso()`, `RevenueChart()`, `Spark()`, `windows()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (6 nodes): `SalesOverview.tsx`, `ExportBtn()`, `fmtPct()`, `isoDay()`, `Panel()`, `presetRange()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (6 nodes): `preorders.controller.ts`, `PreordersController`, `.constructor()`, `.list()`, `.set()`, `.unset()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (6 nodes): `preorders.service.ts`, `PreordersService`, `.constructor()`, `.list()`, `.set()`, `.unset()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (6 nodes): `SocialController`, `.constructor()`, `.getSettings()`, `.listings()`, `.updateSettings()`, `social.controller.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (5 nodes): `AuthController`, `.constructor()`, `.login()`, `.me()`, `auth.controller.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (5 nodes): `discogs.controller.ts`, `DiscogsController`, `.constructor()`, `.lookup()`, `.rehost()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (5 nodes): `upload.service.ts`, `UploadService`, `.ensureRoot()`, `.saveAudio()`, `.saveRemoteImage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (4 nodes): `TrackRow.tsx`, `hasSource()`, `pickPlayable()`, `TrackRow()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (4 nodes): `JwtStrategy`, `.constructor()`, `.validate()`, `jwt.strategy.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (4 nodes): `RolesGuard`, `.canActivate()`, `.constructor()`, `roles.guard.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (4 nodes): `PrismaService`, `.onModuleDestroy()`, `.onModuleInit()`, `prisma.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (4 nodes): `AppleController`, `.constructor()`, `.search()`, `apple.controller.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (4 nodes): `bandcamp.controller.ts`, `BandcampController`, `.constructor()`, `.search()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (4 nodes): `upload.controller.ts`, `UploadController`, `.audio()`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (4 nodes): `PublicFeedController`, `.constructor()`, `.feed()`, `public-feed.controller.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (3 nodes): `ApplyFromDiscogsModal.tsx`, `ApplyFromDiscogsModal()`, `mapFormat()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (3 nodes): `main()`, `seed.js`, `seed.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (3 nodes): `loadEnv()`, `main()`, `sync-dealpos.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (3 nodes): `create-po.dto.ts`, `CreatePoDto`, `CreatePoLineDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (3 nodes): `receive-lines.dto.ts`, `ReceiveLineDto`, `ReceiveLinesDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (3 nodes): `AppleService`, `.search()`, `apple.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (3 nodes): `bandcamp.service.ts`, `BandcampService`, `.search()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (3 nodes): `filter.dto.ts`, `CampaignFilterDto`, `SubscriberFilterDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 106`** (2 nodes): `app.module.ts`, `AppModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 107`** (2 nodes): `storefront.module.ts`, `StorefrontModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 108`** (2 nodes): `PostsModule`, `posts.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 109`** (2 nodes): `CreatePostDto`, `create-post.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 110`** (2 nodes): `PostFilterDto`, `post-filter.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 111`** (2 nodes): `UpdatePostDto`, `update-post.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 112`** (2 nodes): `purchase-orders.module.ts`, `PurchaseOrdersModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 114`** (2 nodes): `po-filter.dto.ts`, `PoFilterDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 115`** (2 nodes): `update-po.dto.ts`, `UpdatePoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 116`** (2 nodes): `DealposModule`, `dealpos.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 117`** (2 nodes): `AuthModule`, `auth.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 118`** (2 nodes): `LoginDto`, `login.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 120`** (2 nodes): `JwtAuthGuard`, `jwt-auth.guard.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 121`** (2 nodes): `PrismaModule`, `prisma.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 122`** (2 nodes): `preorders.module.ts`, `PreordersModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 123`** (2 nodes): `set-preorder.dto.ts`, `SetPreorderDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 124`** (2 nodes): `integrations.module.ts`, `IntegrationsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 125`** (2 nodes): `AppleModule`, `apple.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 126`** (2 nodes): `bandcamp.module.ts`, `BandcampModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 127`** (2 nodes): `discogs.module.ts`, `DiscogsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 129`** (2 nodes): `upload.module.ts`, `UploadModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 130`** (2 nodes): `SocialModule`, `social.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 131`** (2 nodes): `UpdateSocialSettingsDto`, `update-social-settings.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 132`** (2 nodes): `locations.module.ts`, `LocationsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 133`** (2 nodes): `update-location.dto.ts`, `UpdateLocationDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 134`** (2 nodes): `create-location.dto.ts`, `CreateLocationDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 135`** (2 nodes): `inventory.module.ts`, `InventoryModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 136`** (2 nodes): `UpdateReleaseDto`, `update-release.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 137`** (2 nodes): `release-filter.dto.ts`, `ReleaseFilterDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 138`** (2 nodes): `create-release.dto.ts`, `CreateReleaseDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 139`** (2 nodes): `users.module.ts`, `UsersModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 140`** (2 nodes): `CreateUserDto`, `create-user.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 141`** (2 nodes): `vouchers.module.ts`, `VouchersModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 143`** (2 nodes): `create-voucher.dto.ts`, `CreateVoucherDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 144`** (2 nodes): `update-voucher.dto.ts`, `UpdateVoucherDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 145`** (2 nodes): `voucher-filter.dto.ts`, `VoucherFilterDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 146`** (2 nodes): `ops.module.ts`, `OpsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 147`** (2 nodes): `FinanceModule`, `finance.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 148`** (2 nodes): `newsletter.module.ts`, `NewsletterModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 149`** (2 nodes): `update-subscriber.dto.ts`, `UpdateSubscriberDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 150`** (2 nodes): `update-campaign.dto.ts`, `UpdateCampaignDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 151`** (2 nodes): `create-subscriber.dto.ts`, `CreateSubscriberDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 152`** (2 nodes): `create-campaign.dto.ts`, `CreateCampaignDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `load()` connect `Community 0` to `Community 8`, `Community 1`, `Community 11`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `onSaved()` connect `Community 1` to `Community 0`, `Community 6`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `load()` (e.g. with `onSync()` and `onSaved()`) actually correct?**
  _`load()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `onChange()` (e.g. with `update()` and `remove()`) actually correct?**
  _`onChange()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Find a tab by case-insensitive match. Returns (sheetId, exact title).`, `1-indexed last row containing any value in column A. Returns 0 if empty.`, `AppModule` to the rest of the system?**
  _59 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._