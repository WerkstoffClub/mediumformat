import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, STAFF_ROLES } from '@mf/shared';
import { OpsService } from './ops.service';
import {
  ChannelsQueryDto, CreateCustomerDto, CustomersQueryDto, OrdersQueryDto, UpdateCustomerDto, UpdateTrackingDto,
} from './dto/ops-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
@Controller()
export class OpsController {
  constructor(private ops: OpsService) {}

  @Get('orders')
  orders(@Query() query: OrdersQueryDto) {
    return this.ops.orders(query);
  }

  @Get('orders-summary')
  ordersSummary(@Query() query: OrdersQueryDto) {
    return this.ops.ordersSummary(query);
  }

  @Get('orders/:id')
  order(@Param('id') id: string) {
    return this.ops.order(id);
  }

  @Patch('orders/:id/tracking')
  setTracking(@Param('id') id: string, @Body() body: UpdateTrackingDto) {
    return this.ops.setTracking(id, body);
  }

  @Post('customers')
  createCustomer(@Body() body: CreateCustomerDto) {
    return this.ops.createCustomer(body);
  }

  @Patch('customers/:id')
  updateCustomer(@Param('id') id: string, @Body() body: UpdateCustomerDto) {
    return this.ops.updateCustomer(id, body);
  }

  @Get('customers-list')
  customers(@Query() query: CustomersQueryDto) {
    return this.ops.customers(query);
  }

  @Get('customers-summary')
  customersSummary() {
    return this.ops.customersSummary();
  }

  @Get('customers-analytics')
  customersAnalytics() {
    return this.ops.customersAnalytics();
  }

  @Get('customers/:id')
  customerDetail(@Param('id') id: string) {
    return this.ops.customerDetail(id);
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
