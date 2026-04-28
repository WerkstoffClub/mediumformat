import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InventoryModule } from './inventory/inventory.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, InventoryModule, PostsModule],
})
export class AppModule {}
