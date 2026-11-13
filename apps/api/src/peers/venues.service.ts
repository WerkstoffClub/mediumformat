import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VenueStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { daysAgo, uniqueSlug } from '../common/slug';
import { CreateVenueDto, UpdateVenueDto } from './dto';

const STATS_DAYS = 30;

@Injectable()
export class VenuesService {
  constructor(private prisma: PrismaService) {}

  /** Venue list with upcoming-show count, next show and 30-day ticket sales. */
  async findAll() {
    const now = new Date();
    const [venues, upcoming, sales] = await Promise.all([
      this.prisma.venue.findMany({ orderBy: [{ status: 'asc' }, { name: 'asc' }] }),
      this.prisma.event.findMany({
        where: { startsAt: { gte: now }, status: { notIn: ['CANCELLED', 'DRAFT'] } },
        orderBy: { startsAt: 'asc' },
        select: { id: true, venueId: true, title: true, startsAt: true },
      }),
      this.ticketSalesByVenue(daysAgo(STATS_DAYS)),
    ]);
    return venues.map(v => {
      const shows = upcoming.filter(e => e.venueId === v.id);
      const s = sales.get(v.id);
      return {
        ...v,
        upcomingCount: shows.length,
        nextShow: shows[0] ?? null,
        sold30d: s?.sold ?? 0,
        revenue30d: s?.revenue ?? 0,
      };
    });
  }

  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundException('Venue not found');
    const sales = await this.ticketSalesByVenue(daysAgo(STATS_DAYS), id);
    const s = sales.get(id);
    return { ...venue, sold30d: s?.sold ?? 0, revenue30d: s?.revenue ?? 0 };
  }

  async create(body: CreateVenueDto) {
    const slug = await uniqueSlug(body.name, async s => !!(await this.prisma.venue.findUnique({ where: { slug: s } })));
    return this.prisma.venue.create({ data: { ...this.toData(body), name: body.name.trim(), slug } });
  }

  async update(id: string, body: UpdateVenueDto) {
    await this.findOne(id);
    return this.prisma.venue.update({ where: { id }, data: this.toData(body) });
  }

  async remove(id: string) {
    await this.findOne(id);
    const events = await this.prisma.event.count({ where: { venueId: id } });
    if (events > 0) throw new BadRequestException('Venue has shows — pause it instead of deleting.');
    await this.prisma.venue.delete({ where: { id } });
    return { deleted: true, id };
  }

  private toData(b: UpdateVenueDto): Partial<Prisma.VenueCreateInput> {
    const d: Partial<Prisma.VenueCreateInput> = {};
    if (b.name !== undefined) d.name = b.name.trim();
    if (b.kind !== undefined) d.kind = b.kind || null;
    if (b.area !== undefined) d.area = b.area || null;
    if (b.city !== undefined) d.city = b.city || 'Jakarta';
    if (b.capacity !== undefined) d.capacity = b.capacity ?? null;
    if (b.status !== undefined) d.status = b.status as VenueStatus;
    if (b.feePct !== undefined) d.feePct = b.feePct;
    if (b.contact !== undefined) d.contact = b.contact || null;
    if (b.notes !== undefined) d.notes = b.notes || null;
    return d;
  }

  /** Valid tickets sold since `since`, rolled up per venue. */
  private async ticketSalesByVenue(since: Date, venueId?: string) {
    const rows = await this.prisma.ticket.groupBy({
      by: ['eventId'],
      where: { status: 'VALID', createdAt: { gte: since }, ...(venueId ? { event: { venueId } } : {}) },
      _count: { _all: true },
      _sum: { priceIdr: true },
    });
    const events = await this.prisma.event.findMany({
      where: { id: { in: rows.map(r => r.eventId) } },
      select: { id: true, venueId: true },
    });
    const venueOf = new Map(events.map(e => [e.id, e.venueId]));
    const out = new Map<string, { sold: number; revenue: number }>();
    for (const r of rows) {
      const v = venueOf.get(r.eventId);
      if (!v) continue;
      const cur = out.get(v) ?? { sold: 0, revenue: 0 };
      out.set(v, { sold: cur.sold + r._count._all, revenue: cur.revenue + (r._sum.priceIdr ?? 0) });
    }
    return out;
  }
}
