import { Module } from '@nestjs/common';
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

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, InventoryModule, PostsModule, DealposModule, FinanceModule, SocialModule, OpsModule, LocationsModule, IntegrationsModule, PurchaseOrdersModule, PreordersModule, VouchersModule, NewsletterModule, StorefrontModule],
})
export class AppModule {}
