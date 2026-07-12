import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, STAFF_ROLES } from '@mf/shared';
import { CreatePoDto } from './dto/create-po.dto';
import { UpdatePoDto } from './dto/update-po.dto';
import { ReceiveLinesDto } from './dto/receive-lines.dto';
import { PoFilterDto } from './dto/po-filter.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private svc: PurchaseOrdersService) {}

  @Roles(...STAFF_ROLES)
  @Get()
  list(@Query() filter: PoFilterDto) {
    return this.svc.findAll(filter);
  }

  @Roles(...STAFF_ROLES)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() body: CreatePoDto) {
    return this.svc.create(body);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdatePoDto) {
    return this.svc.update(id, body);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  receive(@Param('id') id: string, @Body() body: ReceiveLinesDto) {
    return this.svc.receive(id, body);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string) {
    return this.svc.cancel(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('sync-from-dealpos')
  @HttpCode(HttpStatus.OK)
  sync() {
    return this.svc.syncFromDealpos();
  }
}
