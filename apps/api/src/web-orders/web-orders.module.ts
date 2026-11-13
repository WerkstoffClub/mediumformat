import { Module } from '@nestjs/common';
import { StorefrontOrdersController, WebOrdersController } from './web-orders.controller';
import { WebOrdersService } from './web-orders.service';

@Module({
  controllers: [StorefrontOrdersController, WebOrdersController],
  providers: [WebOrdersService],
})
export class WebOrdersModule {}
