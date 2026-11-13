import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { daysAgo, uniqueSlug } from '../common/slug';
import { CreateEventDto, CreateTierDto, EventFilterDto, UpdateEventDto, UpdateTierDto } from './dto';

const toDate = (v: string | null | undefined) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid date: ${v}`);
  return d;
};

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll(f: EventFilterDto) {
    const page = f.page ?? 1;
    const limit = f.limit ?? 50;
    const now = new Date();
    const where: Prisma.EventWhereInput = {};
    if (f.q) where.title = { contains: f.q, mode: 'insensitive' };
    if (f.venueId) where.venueId = f.venueId;
    if (f.status && f.status !== 'all') where.status = f.status as EventStatus;
    if (f.scope === 'upcoming') where.OR = [{ endsAt: { gte: now } }, { endsAt: null, startsAt: { gte: daysAgo(1) } }];
    if (f.scope === 'past') where.startsAt = { lt: now };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: { startsAt: f.scope === 'past' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          venue: { select: { id: true, name: true, area: true } },
          tiers: { select: { id: true, priceIdr: true, quota: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);
    const sold = await this.soldByEvent(items.map(e => e.id));
    return {
      items: items.map(({ tiers, ...e }) => ({
        ...e,
        tierCount: tiers.length,
        priceFrom: tiers.length ? Math.min(...tiers.map(t => t.priceIdr)) : null,
        quota: tiers.reduce((s, t) => s + t.quota, 0),
        sold: sold.get(e.id)?.sold ?? 0,
        revenue: sold.get(e.id)?.revenue ?? 0,
      })),
      total, page, limit,
    };
  }

  /** Event with per-tier sold / checked-in / revenue. */
  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { venue: true, tiers: { orderBy: [{ sortOrder: 'asc' }, { priceIdr: 'asc' }] } },
    });
    if (!event) throw new NotFoundException('Event not found');
    const [byTier, byTierIn, byChannel] = await Promise.all([
      this.prisma.ticket.groupBy({ by: ['tierId'], where: { eventId: id, status: 'VALID' }, _count: { _all: true }, _sum: { priceIdr: true } }),
      this.prisma.ticket.groupBy({ by: ['tierId'], where: { eventId: id, status: 'VALID', checkedInAt: { not: null } }, _count: { _all: true } }),
      this.prisma.ticket.groupBy({ by: ['channel', 'payment'], where: { eventId: id, status: 'VALID' }, _count: { _all: true }, _sum: { priceIdr: true } }),
    ]);
    const tiers = event.tiers.map(t => {
      const s = byTier.find(r => r.tierId === t.id);
      return {
        ...t,
        sold: s?._count._all ?? 0,
        revenue: s?._sum.priceIdr ?? 0,
        checkedIn: byTierIn.find(r => r.tierId === t.id)?._count._all ?? 0,
      };
    });
    return {
      ...event,
      tiers,
      sold: tiers.reduce((s, t) => s + t.sold, 0),
      quota: tiers.reduce((s, t) => s + t.quota, 0),
      revenue: tiers.reduce((s, t) => s + t.revenue, 0),
      checkedIn: tiers.reduce((s, t) => s + t.checkedIn, 0),
      byChannel: byChannel.map(r => ({ channel: r.channel, payment: r.payment, tickets: r._count._all, revenue: r._sum.priceIdr ?? 0 })),
    };
  }

  async create(b: CreateEventDto) {
    await this.assertVenue(b.venueId);
    const slug = await uniqueSlug(b.title, async s => !!(await this.prisma.event.findUnique({ where: { slug: s } })));
    return this.prisma.event.create({
      data: {
        slug,
        title: b.title.trim(),
        venueId: b.venueId,
        startsAt: toDate(b.startsAt)!,
        doorsAt: toDate(b.doorsAt),
        endsAt: toDate(b.endsAt),
        lineup: b.lineup || null,
        status: (b.status as EventStatus) ?? 'DRAFT',
        notes: b.notes || null,
      },
    });
  }

  async update(id: string, b: UpdateEventDto) {
    await this.exists(id);
    if (b.venueId) await this.assertVenue(b.venueId);
    const d: Prisma.EventUncheckedUpdateInput = {};
    if (b.title !== undefined) d.title = b.title.trim();
    if (b.venueId !== undefined) d.venueId = b.venueId;
    if (b.startsAt !== undefined) d.startsAt = toDate(b.startsAt)!;
    if (b.doorsAt !== undefined) d.doorsAt = toDate(b.doorsAt);
    if (b.endsAt !== undefined) d.endsAt = toDate(b.endsAt);
    if (b.lineup !== undefined) d.lineup = b.lineup || null;
    if (b.status !== undefined) d.status = b.status as EventStatus;
    if (b.notes !== undefined) d.notes = b.notes || null;
    return this.prisma.event.update({ where: { id }, data: d });
  }

  async remove(id: string) {
    await this.exists(id);
    if (await this.prisma.ticket.count({ where: { eventId: id } })) {
      throw new BadRequestException('Tickets already issued — cancel the show instead of deleting.');
    }
    await this.prisma.event.delete({ where: { id } });
    return { deleted: true, id };
  }

  async addTier(eventId: string, b: CreateTierDto) {
    await this.exists(eventId);
    return this.prisma.ticketTier.create({
      data: {
        eventId, name: b.name.trim(), priceIdr: b.priceIdr, quota: b.quota,
        salesStart: toDate(b.salesStart), salesEnd: toDate(b.salesEnd), sortOrder: b.sortOrder ?? 0,
      },
    });
  }

  async updateTier(id: string, b: UpdateTierDto) {
    const tier = await this.prisma.ticketTier.findUnique({ where: { id } });
    if (!tier) throw new NotFoundException('Tier not found');
    if (b.quota !== undefined) {
      const sold = await this.prisma.ticket.count({ where: { tierId: id, status: 'VALID' } });
      if (b.quota < sold) throw new BadRequestException(`Quota can't go below ${sold} tickets already sold.`);
    }
    const d: Prisma.TicketTierUpdateInput = {};
    if (b.name !== undefined) d.name = b.name.trim();
    if (b.priceIdr !== undefined) d.priceIdr = b.priceIdr;
    if (b.quota !== undefined) d.quota = b.quota;
    if (b.salesStart !== undefined) d.salesStart = toDate(b.salesStart);
    if (b.salesEnd !== undefined) d.salesEnd = toDate(b.salesEnd);
    if (b.sortOrder !== undefined) d.sortOrder = b.sortOrder;
    return this.prisma.ticketTier.update({ where: { id }, data: d });
  }

  async removeTier(id: string) {
    if (await this.prisma.ticket.count({ where: { tierId: id } })) {
      throw new BadRequestException('Tier has tickets — lower its quota instead.');
    }
    await this.prisma.ticketTier.delete({ where: { id } }).catch(() => { throw new NotFoundException('Tier not found'); });
    return { deleted: true, id };
  }

  /** Peers stream for Analytics: tickets, revenue, check-in rate, daily series. */
  async summary(days: number) {
    const since = daysAgo(days);
    const tickets = await this.prisma.ticket.findMany({
      where: { status: 'VALID', createdAt: { gte: since } },
      select: { createdAt: true, priceIdr: true, channel: true, checkedInAt: true, event: { select: { startsAt: true, venue: { select: { name: true } } } } },
    });
    const byDay = new Map<string, { tickets: number; revenue: number }>();
    const byVenue = new Map<string, { tickets: number; revenue: number }>();
    let attendedBase = 0;
    let attended = 0;
    const now = Date.now();
    for (const t of tickets) {
      const day = t.createdAt.toISOString().slice(0, 10);
      const d = byDay.get(day) ?? { tickets: 0, revenue: 0 };
      byDay.set(day, { tickets: d.tickets + 1, revenue: d.revenue + t.priceIdr });
      const v = byVenue.get(t.event.venue.name) ?? { tickets: 0, revenue: 0 };
      byVenue.set(t.event.venue.name, { tickets: v.tickets + 1, revenue: v.revenue + t.priceIdr });
      if (t.event.startsAt.getTime() < now) { attendedBase++; if (t.checkedInAt) attended++; }
    }
    const upcoming = await this.prisma.event.count({ where: { startsAt: { gte: new Date() }, status: { notIn: ['CANCELLED', 'DRAFT'] } } });
    return {
      days,
      tickets: tickets.length,
      revenue: tickets.reduce((s, t) => s + t.priceIdr, 0),
      checkinRate: attendedBase ? attended / attendedBase : null,
      upcoming,
      series: [...byDay.entries()].sort().map(([date, v]) => ({ date, ...v })),
      byVenue: [...byVenue.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue),
    };
  }

  private async soldByEvent(ids: string[]) {
    if (!ids.length) return new Map<string, { sold: number; revenue: number }>();
    const rows = await this.prisma.ticket.groupBy({
      by: ['eventId'], where: { eventId: { in: ids }, status: 'VALID' }, _count: { _all: true }, _sum: { priceIdr: true },
    });
    return new Map(rows.map(r => [r.eventId, { sold: r._count._all, revenue: r._sum.priceIdr ?? 0 }]));
  }

  private async exists(id: string) {
    if (!(await this.prisma.event.findUnique({ where: { id }, select: { id: true } }))) {
      throw new NotFoundException('Event not found');
    }
  }

  private async assertVenue(id: string) {
    if (!(await this.prisma.venue.findUnique({ where: { id }, select: { id: true } }))) {
      throw new BadRequestException('Venue not found');
    }
  }
}
