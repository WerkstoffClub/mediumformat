import { Module } from '@nestjs/common';
import { PosSalesController, XenditWebhookController } from './pos-sales.controller';
import { PosSalesService } from './pos-sales.service';
import { XenditClient } from './xendit.client';

@Module({
  controllers: [PosSalesController, XenditWebhookController],
  providers: [PosSalesService, XenditClient],
})
export class PosModule {}
