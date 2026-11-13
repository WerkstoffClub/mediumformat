import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role, STAFF_ROLES } from '@mf/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DealersService } from './dealers.service';
import { CreateDealerDto, IngestTxnsDto, SummaryDto, TxnFilterDto, UpdateDealerDto } from './dto';

/** Dealers = third-party record shops on MF's POS + catalog. No ticketing here. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dealers')
export class DealersController {
  constructor(private svc: DealersService) {}

  @Roles(...STAFF_ROLES) @Get()
  list() { return this.svc.findAll(); }

  @Roles(...STAFF_ROLES) @Get('summary')
  summary(@Query() q: SummaryDto) { return this.svc.summary(q.days ?? 30); }

  @Roles(...STAFF_ROLES) @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Roles(...STAFF_ROLES) @Get(':id/transactions')
  transactions(@Param('id') id: string, @Query() f: TxnFilterDto) { return this.svc.transactions(id, f); }

  @Roles(Role.ADMIN, Role.MANAGER) @Post(':id/transactions')
  ingest(@Param('id') id: string, @Body() b: IngestTxnsDto) { return this.svc.ingest(id, b); }

  @Roles(Role.ADMIN, Role.MANAGER) @Post()
  create(@Body() b: CreateDealerDto) { return this.svc.create(b); }

  @Roles(Role.ADMIN, Role.MANAGER) @Patch(':id')
  update(@Param('id') id: string, @Body() b: UpdateDealerDto) { return this.svc.update(id, b); }

  @Roles(Role.ADMIN) @Delete(':id')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
