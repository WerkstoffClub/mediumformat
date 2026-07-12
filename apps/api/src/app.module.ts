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

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, InventoryModule, PostsModule, DealposModule, FinanceModule, SocialModule, OpsModule, LocationsModule, IntegrationsModule],
})
export class AppModule {}
