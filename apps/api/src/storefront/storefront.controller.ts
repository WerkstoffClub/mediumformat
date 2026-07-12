import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { StorefrontService } from './storefront.service';

@Controller('storefront')
export class StorefrontController {
  constructor(private svc: StorefrontService) {}

  @Get('releases')
  releases(@Query() q: { page?: string; limit?: string; format?: string; q?: string }) {
    return this.svc.releases(q);
  }

  @Get('releases/:slug')
  release(@Param('slug') s: string) {
    return this.svc.releaseBySlug(s);
  }

  @Get('preorders')
  preorders() {
    return this.svc.preorders();
  }

  @Get('posts')
  posts() {
    return this.svc.posts();
  }

  @Get('posts/:slug')
  post(@Param('slug') s: string) {
    return this.svc.postBySlug(s);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('newsletter/subscribe')
  subscribe(@Body() b: { email: string; name?: string; source?: string }) {
    return this.svc.subscribe(b);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('vouchers/validate')
  validate(@Body() b: { code: string; subtotalIdr: number }) {
    return this.svc.validateVoucher(b);
  }
}
