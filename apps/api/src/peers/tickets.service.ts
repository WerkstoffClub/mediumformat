import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CheckinDto, SellTicketsDto, TicketFilterDto } from './dto';
import { classifyScan, newTicketCode, normaliseCode } from './scan';

const SELLABLE = ['SCHEDULED', 'ON_SALE'];
const RECENT_SCANS = 25;

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  list(eventId: string, f: TicketFilterDto) {
    const page = f.page ?? 1;
    const limit = f.limit ?? 50;
    const where: Prisma.TicketWhereInput = { eventId };
    if (f.q) {
      where.OR = [
        { code: { contains: f.q, mode: 'insensitive' } },
        { holderName: { contains: f.q, mode: 'insensitive' } },
        { holderEmail: { contains: f.q, mode: 'insensitive' } },
      ];
    }
    return this.prisma
      .$transaction([
        this.prisma.ticket.findMany({
          where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
          include: { tier: { select: { name: true } } },
        }),
        this.prisma.ticket.count({ where }),
      ])
      .then(([items, total]) => ({ items, total, page, limit }));
  }

  /** Box-office sale. Locks the tier row so two cashiers can't oversell its quota. */
  async sell(eventId: string, b: SellTicketsDto, userId?: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { status: true } });
    if (!event) throw new NotFoundException('Event not found');
    if (!SELLABLE.includes(event.status)) throw new BadRequestException('Show is not on sale.');
    const comp = b.channel === 'COMP';
    if (!comp && b.payment === 'NONE') throw new BadRequestException('Pick a payment method.');

    return this.prisma.$transaction(async tx => {
      const [tier] = await tx.$queryRaw<{ id: string; eventId: string; priceIdr: number; quota: number }[]>`
        SELECT id, "eventId", "priceIdr", quota FROM "TicketTier" WHERE id = ${b.tierId} FOR UPDATE`;
      if (!tier || tier.eventId !== eventId) throw new BadRequestException('Tier not found for this show.');
      const sold = await tx.ticket.count({ where: { tierId: tier.id, status: 'VALID' } });
      const left = tier.quota - sold;
      if (b.qty > left) throw new BadRequestException(left > 0 ? `Only ${left} left in this tier.` : 'Tier sold out.');
      const data = Array.from({ length: b.qty }, () => ({
        code: newTicketCode(),
        eventId,
        tierId: tier.id,
        holderName: b.holderName?.trim() || null,
        holderEmail: b.holderEmail?.trim() || null,
        channel: b.channel,
        payment: comp ? ('NONE' as const) : b.payment,
        priceIdr: comp ? 0 : tier.priceIdr,
        soldById: userId ?? null,
      }));
      await tx.ticket.createMany({ data });
      return tx.ticket.findMany({ where: { code: { in: data.map(d => d.code) } }, include: { tier: { select: { name: true } } } });
    });
  }

  async void(id: string) {
    const t = await this.prisma.ticket.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Ticket not found');
    if (t.checkedInAt) throw new BadRequestException('Ticket already used at the door.');
    return this.prisma.ticket.update({ where: { id }, data: { status: 'VOID' } });
  }

  /** Door scan. The conditional update makes double-scans at two gates safe. */
  async checkin(eventId: string, b: CheckinDto, userId?: string) {
    const code = normaliseCode(b.code);
    const include = { tier: { select: { name: true } }, event: { select: { title: true } } };
    const ticket = await this.prisma.ticket.findUnique({ where: { code }, include });
    let result = classifyScan(ticket, eventId);
    if (result === 'VALID' && ticket) {
      const { count } = await this.prisma.ticket.updateMany({
        where: { id: ticket.id, status: 'VALID', checkedInAt: null },
        data: { checkedInAt: new Date(), checkedInById: userId ?? null, gate: b.gate?.trim() || null },
      });
      if (count === 0) result = 'ALREADY';
    }
    const fresh = ticket ? await this.prisma.ticket.findUnique({ where: { id: ticket.id }, include }) : null;
    return { result, code, ticket: fresh };
  }

  /** Live door count per tier + most recent check-ins. */
  async checkinStats(eventId: string) {
    const [tiers, sold, inside, recent] = await Promise.all([
      this.prisma.ticketTier.findMany({ where: { eventId }, orderBy: [{ sortOrder: 'asc' }, { priceIdr: 'asc' }], select: { id: true, name: true, priceIdr: true } }),
      this.prisma.ticket.groupBy({ by: ['tierId'], where: { eventId, status: 'VALID' }, _count: { _all: true } }),
      this.prisma.ticket.groupBy({ by: ['tierId', 'gate'], where: { eventId, status: 'VALID', checkedInAt: { not: null } }, _count: { _all: true } }),
      this.prisma.ticket.findMany({
        where: { eventId, checkedInAt: { not: null } }, orderBy: { checkedInAt: 'desc' }, take: RECENT_SCANS,
        include: { tier: { select: { name: true } } },
      }),
    ]);
    const perTier = tiers.map(t => ({
      ...t,
      sold: sold.find(s => s.tierId === t.id)?._count._all ?? 0,
      checkedIn: inside.filter(s => s.tierId === t.id).reduce((n, s) => n + s._count._all, 0),
    }));
    const gates = new Map<string, number>();
    for (const g of inside) gates.set(g.gate ?? '—', (gates.get(g.gate ?? '—') ?? 0) + g._count._all);
    return {
      sold: perTier.reduce((n, t) => n + t.sold, 0),
      checkedIn: perTier.reduce((n, t) => n + t.checkedIn, 0),
      tiers: perTier,
      gates: [...gates.entries()].map(([gate, count]) => ({ gate, count })),
      recent,
      syncedAt: new Date(),
    };
  }
}
