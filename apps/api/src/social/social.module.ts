import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { PublicFeedController } from './public-feed.controller';

@Module({
  providers: [SocialService],
  controllers: [SocialController, PublicFeedController],
})
export class SocialModule {}
