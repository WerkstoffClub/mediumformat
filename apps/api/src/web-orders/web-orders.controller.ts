import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { STAFF_ROLES } from '@mf/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateWebOrderDto, UpdateWebOrderStatusDto, WebOrderFilterDto } from './dto/create-web-order.dto';
import { WebOrdersService } from './web-orders.service';

/** Public checkout endpoint — lives under /storefront like the rest of the shop API. */
@Controller('storefront/orders')
export class StorefrontOrdersController {
  constructor(private svc: WebOrdersService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  create(@Body() body: CreateWebOrderDto) {
    return this.svc.create(body);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('web-orders')
export class WebOrdersController {
  constructor(private svc: WebOrdersService) {}

  @Roles(...STAFF_ROLES)
  @Get()
  list(@Query() f: WebOrderFilterDto) {
    return this.svc.findAll(f);
  }

  @Roles(...STAFF_ROLES)
  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() body: UpdateWebOrderStatusDto) {
    return this.svc.setStatus(id, body.status);
  }
}
