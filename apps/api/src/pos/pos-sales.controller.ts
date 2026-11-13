import {
  Body, Controller, Get, Headers, HttpCode, NotImplementedException, Param, Post, Query,
  UnauthorizedException, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { STAFF_ROLES } from '@mf/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePosSaleDto, PosSaleFilterDto } from './dto/create-pos-sale.dto';
import { PosSalesService } from './pos-sales.service';
import { XenditClient, callbackTokenValid, parseInvoiceEvent } from './xendit.client';

interface AuthUser { id: string; role: string }

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pos/sales')
export class PosSalesController {
  constructor(private svc: PosSalesService) {}

  @Roles(...STAFF_ROLES)
  @Post()
  create(@Body() body: CreatePosSaleDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(body, user?.id ?? null);
  }

  @Roles(...STAFF_ROLES)
  @Get()
  list(@Query() f: PosSaleFilterDto) {
    return this.svc.findAll(f);
  }

  /** The register polls this while a Xendit payment is pending. */
  @Roles(...STAFF_ROLES)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Roles(...STAFF_ROLES)
  @Post(':id/void')
  @HttpCode(200)
  void(@Param('id') id: string) {
    return this.svc.void(id);
  }
}

/** Xendit invoice callback. Set its URL to /api/v1/webhooks/xendit/invoice in the Xendit dashboard. */
@Controller('webhooks/xendit')
export class XenditWebhookController {
  constructor(private svc: PosSalesService, private xendit: XenditClient) {}

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('invoice')
  @HttpCode(200)
  async invoice(@Headers('x-callback-token') token: string | undefined, @Body() body: unknown) {
    if (!this.xendit.configured) throw new NotImplementedException('Xendit is not configured.');
    if (!callbackTokenValid(token, this.xendit.callbackToken)) throw new UnauthorizedException();
    const ev = parseInvoiceEvent(body);
    if (!ev) return { handled: false };
    return this.svc.handleInvoiceEvent(ev);
  }
}
