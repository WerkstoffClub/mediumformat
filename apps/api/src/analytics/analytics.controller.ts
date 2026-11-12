import { Body, Controller, Get, Headers, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { STAFF_ROLES } from '@mf/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { TrackDto, VisitorsQueryDto } from './dto/track.dto';

@Controller()
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  /** Public page-view beacon from the storefront (navigator.sendBeacon). */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @HttpCode(204)
  @Post('track')
  async track(@Body() dto: TrackDto, @Headers('user-agent') ua?: string): Promise<void> {
    await this.analytics.track(dto, ua);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  @Get('visitors-summary')
  summary(@Query() q: VisitorsQueryDto) {
    return this.analytics.summary(q.days ?? 30);
  }
}
