import { Module } from '@nestjs/common';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { TicketsService } from './tickets.service';

/** Peers = venues that host shows and sell tickets through MF (TMS + door check-in). */
@Module({
  controllers: [VenuesController, EventsController],
  providers: [VenuesService, EventsService, TicketsService],
})
export class PeersModule {}
