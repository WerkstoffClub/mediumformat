import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InventoryModule } from './inventory/inventory.module';
import { PostsModule } from './posts/posts.module';
import { DealposModule } from './dealpos/dealpos.module';
import { FinanceModule } from './finance/finance.module';
import { SocialModule } from './social/social.module';
import { OpsModule } from './ops/ops.module';
import { LocationsModule } from './locations/locations.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { PreordersModule } from './preorders/preorders.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { StorefrontModule } from './storefront/storefront.module';
import { ImportsModule } from './imports/imports.module';
import { CategoryPagesModule } from './category-pages/category-pages.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WebOrdersModule } from './web-orders/web-orders.module';
import { PeersModule } from './peers/peers.module';
import { DealersModule } from './dealers/dealers.module';
import { PosModule } from './pos/pos.module';

/** Per-IP requests/min for every route; stricter limits use @Throttle on the handler. */
const DEFAULT_THROTTLE_LIMIT = 300;

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: DEFAULT_THROTTLE_LIMIT }]), PrismaModule, AuthModule, UsersModule, InventoryModule, PostsModule, DealposModule, FinanceModule, SocialModule, OpsModule, LocationsModule, IntegrationsModule, PurchaseOrdersModule, PreordersModule, VouchersModule, NewsletterModule, StorefrontModule, CategoryPagesModule, ImportsModule, AnalyticsModule, WebOrdersModule, PeersModule, DealersModule, PosModule],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
