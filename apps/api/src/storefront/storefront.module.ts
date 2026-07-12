import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])],
  controllers: [StorefrontController],
  providers: [StorefrontService],
})
export class StorefrontModule {}
