import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { StorefrontOrdersController, WebOrdersController } from './web-orders.controller';
import { WebOrdersService } from './web-orders.service';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])],
  controllers: [StorefrontOrdersController, WebOrdersController],
  providers: [WebOrdersService],
})
export class WebOrdersModule {}
