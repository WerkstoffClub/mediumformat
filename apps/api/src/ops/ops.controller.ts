import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, STAFF_ROLES } from '@mf/shared';
import { OpsService } from './ops.service';
import { ChannelsQueryDto, OrdersQueryDto, PagedQueryDto } from './dto/ops-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
@Controller()
export class OpsController {
  constructor(private ops: OpsService) {}

  @Get('orders')
  orders(@Query() query: OrdersQueryDto) {
    return this.ops.orders(query);
  }

  @Get('orders/:id')
  order(@Param('id') id: string) {
    return this.ops.order(id);
  }

  @Get('customers-list')
  customers(@Query() query: PagedQueryDto) {
    return this.ops.customers(query);
  }

  @Get('purchase-orders')
  purchaseOrders(@Query() query: PagedQueryDto) {
    return this.ops.purchaseOrders(query);
  }

  @Get('catalog-summary')
  catalogSummary() {
    return this.ops.catalogSummary();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('channels-summary')
  channels(@Query() query: ChannelsQueryDto) {
    return this.ops.channels(query);
  }
}
