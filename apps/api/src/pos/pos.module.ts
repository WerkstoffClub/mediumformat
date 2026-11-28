import { Module } from '@nestjs/common';
import { LocationsModule } from '../locations/locations.module';
import { PosSalesController, XenditWebhookController } from './pos-sales.controller';
import { PosSalesService } from './pos-sales.service';
import { XenditClient } from './xendit.client';

@Module({
  imports: [LocationsModule],
  controllers: [PosSalesController, XenditWebhookController],
  providers: [PosSalesService, XenditClient],
})
export class PosModule {}
