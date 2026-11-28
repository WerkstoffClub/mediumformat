import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationStockService } from './location-stock.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateTransferDto, ReportQueryDto, StockQueryDto, TransferQueryDto } from './dto/stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@mf/shared';

interface AuthUser { id: string; role: string }

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('locations')
export class LocationsController {
  constructor(private locations: LocationsService, private stock: LocationStockService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.SHOPKEEPER)
  @Get()
  findAll() {
    return this.locations.findAll();
  }

  /** Sales, trend, sell-through, stock and transfers for one location and period. */
  @Roles(Role.ADMIN, Role.MANAGER, Role.SHOPKEEPER)
  @Get(':id/report')
  report(@Param('id') id: string, @Query() q: ReportQueryDto) {
    return this.locations.report(id, q.from, q.to);
  }

  /** Releases with their quantity at this location (search with q; inStock=true for qty > 0). */
  @Roles(Role.ADMIN, Role.MANAGER, Role.SHOPKEEPER)
  @Get(':id/stock')
  stockAt(@Param('id') id: string, @Query() q: StockQueryDto) {
    return this.stock.stockAt(id, { q: q.q, limit: q.limit, inStock: q.inStock === 'true' });
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() body: CreateLocationDto) {
    return this.locations.create(body);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateLocationDto) {
    return this.locations.update(id, body);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.locations.remove(id);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock-transfers')
export class StockTransfersController {
  constructor(private stock: LocationStockService) {}

  /** Move stock directly from one location to another. */
  @Roles(Role.ADMIN, Role.MANAGER, Role.SHOPKEEPER)
  @Post()
  create(@Body() body: CreateTransferDto, @CurrentUser() user: AuthUser) {
    return this.stock.transfer(body, user?.id ?? null);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.SHOPKEEPER)
  @Get()
  list(@Query() q: TransferQueryDto) {
    return this.stock.transfers(q.locationId, q.limit);
  }
}
