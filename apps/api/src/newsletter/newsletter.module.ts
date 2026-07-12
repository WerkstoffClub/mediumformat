import { Module } from '@nestjs/common';
import { SubscribersController } from './subscribers.controller';
import { SubscribersService } from './subscribers.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  controllers: [SubscribersController, CampaignsController],
  providers: [SubscribersService, CampaignsService],
  exports: [SubscribersService, CampaignsService],
})
export class NewsletterModule {}
