import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role, STAFF_ROLES } from '@mf/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EventsService } from './events.service';
import { TicketsService } from './tickets.service';
import {
  CheckinDto, CreateEventDto, CreateTierDto, EventFilterDto, SellTicketsDto, SummaryDto,
  TicketFilterDto, UpdateEventDto, UpdateTierDto,
} from './dto';

type Me = { id?: string } | undefined;
const EDITORS = [Role.ADMIN, Role.MANAGER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class EventsController {
  constructor(private events: EventsService, private tickets: TicketsService) {}

  @Roles(...STAFF_ROLES) @Get('events')
  list(@Query() f: EventFilterDto) { return this.events.findAll(f); }

  @Roles(...STAFF_ROLES) @Get('events/summary')
  summary(@Query() q: SummaryDto) { return this.events.summary(q.days ?? 30); }

  @Roles(...STAFF_ROLES) @Get('events/:id')
  findOne(@Param('id') id: string) { return this.events.findOne(id); }

  @Roles(...EDITORS) @Post('events')
  create(@Body() b: CreateEventDto) { return this.events.create(b); }

  @Roles(...EDITORS) @Patch('events/:id')
  update(@Param('id') id: string, @Body() b: UpdateEventDto) { return this.events.update(id, b); }

  @Roles(Role.ADMIN) @Delete('events/:id')
  remove(@Param('id') id: string) { return this.events.remove(id); }

  @Roles(...EDITORS) @Post('events/:id/tiers')
  addTier(@Param('id') id: string, @Body() b: CreateTierDto) { return this.events.addTier(id, b); }

  @Roles(...EDITORS) @Patch('tiers/:id')
  updateTier(@Param('id') id: string, @Body() b: UpdateTierDto) { return this.events.updateTier(id, b); }

  @Roles(...EDITORS) @Delete('tiers/:id')
  removeTier(@Param('id') id: string) { return this.events.removeTier(id); }

  @Roles(...STAFF_ROLES) @Get('events/:id/tickets')
  listTickets(@Param('id') id: string, @Query() f: TicketFilterDto) { return this.tickets.list(id, f); }

  @Roles(...STAFF_ROLES) @Post('events/:id/tickets')
  sell(@Param('id') id: string, @Body() b: SellTicketsDto, @CurrentUser() me: Me) { return this.tickets.sell(id, b, me?.id); }

  @Roles(...EDITORS) @Post('tickets/:id/void')
  voidTicket(@Param('id') id: string) { return this.tickets.void(id); }

  @Roles(...STAFF_ROLES) @Get('events/:id/checkin')
  checkinStats(@Param('id') id: string) { return this.tickets.checkinStats(id); }

  @Roles(...STAFF_ROLES) @Post('events/:id/checkin')
  checkin(@Param('id') id: string, @Body() b: CheckinDto, @CurrentUser() me: Me) { return this.tickets.checkin(id, b, me?.id); }
}
