import { Controller, Get, Header, Param } from '@nestjs/common';
import { SocialService } from './social.service';

/** Unauthenticated feed for Meta Commerce Manager; protected by an unguessable token. */
@Controller('public')
export class PublicFeedController {
  constructor(private social: SocialService) {}

  @Get('meta-feed/:token')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="meta-feed.csv"')
  @Header('Cache-Control', 'no-store')
  feed(@Param('token') token: string) {
    return this.social.feedCsv(token);
  }
}
