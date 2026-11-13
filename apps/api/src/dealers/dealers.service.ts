import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DealerStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { daysAgo, uniqueSlug } from '../common/slug';
import { CreateDealerDto, IngestTxnsDto, TxnFilterDto, UpdateDealerDto } from './dto';

const STATS_DAYS = 30;
const PAID = { status: 'PAID' as const };

@Injectable()
export class DealersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const since = daysAgo(STATS_DAYS);
    const [dealers, sales] = await Promise.all([
      this.prisma.dealer.findMany({ orderBy: [{ status: 'asc' }, { name: 'asc' }] }),
      this.prisma.dealerTransaction.groupBy({
        by: ['dealerId'], where: { ...PAID, occurredAt: { gte: since } }, _count: { _all: true }, _sum: { amountIdr: true },
      }),
    ]);
    return dealers.map(d => {
      const s = sales.find(r => r.dealerId === d.id);
      return { ...d, sales30d: s?._sum.amountIdr ?? 0, txns30d: s?._count._all ?? 0 };
    });
  }

  /** Dealer + 30-day KPIs + payment mix. */
  async findOne(id: string) {
    const dealer = await this.prisma.dealer.findUnique({ where: { id } });
    if (!dealer) throw new NotFoundException('Dealer not found');
    const since = daysAgo(STATS_DAYS);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const where = { dealerId: id, ...PAID };
    const [period, day, mix] = await Promise.all([
      this.prisma.dealerTransaction.aggregate({ where: { ...where, occurredAt: { gte: since } }, _count: { _all: true }, _sum: { amountIdr: true, itemCount: true } }),
      this.prisma.dealerTransaction.aggregate({ where: { ...where, occurredAt: { gte: today } }, _count: { _all: true }, _sum: { amountIdr: true } }),
      this.prisma.dealerTransaction.groupBy({ by: ['payment'], where: { ...where, occurredAt: { gte: since } }, _count: { _all: true }, _sum: { amountIdr: true } }),
    ]);
    const sales30d = period._sum.amountIdr ?? 0;
    const txns30d = period._count._all;
    return {
      ...dealer,
      sales30d,
      txns30d,
      items30d: period._sum.itemCount ?? 0,
      avgBasket: txns30d ? Math.round(sales30d / txns30d) : 0,
      salesToday: day._sum.amountIdr ?? 0,
      txnsToday: day._count._all,
      paymentMix: mix
        .map(m => ({ payment: m.payment, txns: m._count._all, amount: m._sum.amountIdr ?? 0 }))
        .sort((a, b) => b.amount - a.amount),
    };
  }

  async transactions(id: string, f: TxnFilterDto) {
    const page = f.page ?? 1;
    const limit = f.limit ?? 50;
    const where: Prisma.DealerTransactionWhereInput = { dealerId: id };
    if (f.q) where.OR = [{ txnNo: { contains: f.q, mode: 'insensitive' } }, { cashier: { contains: f.q, mode: 'insensitive' } }];
    const [items, total] = await this.prisma.$transaction([
      this.prisma.dealerTransaction.findMany({ where, orderBy: { occurredAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.dealerTransaction.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async create(b: CreateDealerDto) {
    const slug = await uniqueSlug(b.name, async s => !!(await this.prisma.dealer.findUnique({ where: { slug: s } })));
    return this.prisma.dealer.create({ data: { ...this.toData(b), name: b.name.trim(), slug } });
  }

  async update(id: string, b: UpdateDealerDto) {
    await this.exists(id);
    return this.prisma.dealer.update({ where: { id }, data: this.toData(b) });
  }

  async remove(id: string) {
    await this.exists(id);
    if (await this.prisma.dealerTransaction.count({ where: { dealerId: id } })) {
      throw new BadRequestException('Dealer has POS transactions — pause it instead of deleting.');
    }
    await this.prisma.dealer.delete({ where: { id } });
    return { deleted: true, id };
  }

  /** Upsert a batch of POS transactions; re-sending the same txnNo updates it. */
  async ingest(id: string, b: IngestTxnsDto) {
    await this.exists(id);
    const ops = b.transactions.map(t => {
      const occurredAt = new Date(t.occurredAt);
      if (Number.isNaN(occurredAt.getTime())) throw new BadRequestException(`Invalid occurredAt on ${t.txnNo}`);
      const data = {
        occurredAt,
        items: t.items.map(i => ({ title: i.title, qty: i.qty, priceIdr: i.priceIdr })),
        itemCount: t.items.reduce((n, i) => n + i.qty, 0),
        amountIdr: t.items.reduce((n, i) => n + i.qty * i.priceIdr, 0),
        payment: t.payment,
        cashier: t.cashier ?? null,
        status: t.status ?? 'PAID',
      };
      return this.prisma.dealerTransaction.upsert({
        where: { dealerId_txnNo: { dealerId: id, txnNo: t.txnNo } },
        create: { dealerId: id, txnNo: t.txnNo, ...data },
        update: data,
      });
    });
    await this.prisma.$transaction([...ops, this.prisma.dealer.update({ where: { id }, data: { lastSyncAt: new Date() } })]);
    return { upserted: ops.length };
  }

  /** Dealers stream for Analytics. */
  async summary(days: number) {
    const since = daysAgo(days);
    const txns = await this.prisma.dealerTransaction.findMany({
      where: { ...PAID, occurredAt: { gte: since } },
      select: { occurredAt: true, amountIdr: true, payment: true, dealer: { select: { name: true } } },
    });
    const byDay = new Map<string, { txns: number; amount: number }>();
    const byDealer = new Map<string, { txns: number; amount: number }>();
    for (const t of txns) {
      const k = t.occurredAt.toISOString().slice(0, 10);
      const d = byDay.get(k) ?? { txns: 0, amount: 0 };
      byDay.set(k, { txns: d.txns + 1, amount: d.amount + t.amountIdr });
      const s = byDealer.get(t.dealer.name) ?? { txns: 0, amount: 0 };
      byDealer.set(t.dealer.name, { txns: s.txns + 1, amount: s.amount + t.amountIdr });
    }
    const live = await this.prisma.dealer.count({ where: { status: 'LIVE' } });
    const amount = txns.reduce((n, t) => n + t.amountIdr, 0);
    return {
      days,
      live,
      txns: txns.length,
      amount,
      avgBasket: txns.length ? Math.round(amount / txns.length) : 0,
      series: [...byDay.entries()].sort().map(([date, v]) => ({ date, ...v })),
      byDealer: [...byDealer.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.amount - a.amount),
    };
  }

  private toData(b: UpdateDealerDto): Partial<Prisma.DealerCreateInput> {
    const d: Partial<Prisma.DealerCreateInput> = {};
    if (b.name !== undefined) d.name = b.name.trim();
    if (b.kind !== undefined) d.kind = b.kind || null;
    if (b.area !== undefined) d.area = b.area || null;
    if (b.city !== undefined) d.city = b.city || 'Jakarta';
    if (b.status !== undefined) d.status = b.status as DealerStatus;
    if (b.feePct !== undefined) d.feePct = b.feePct;
    if (b.contact !== undefined) d.contact = b.contact || null;
    if (b.notes !== undefined) d.notes = b.notes || null;
    return d;
  }

  private async exists(id: string) {
    if (!(await this.prisma.dealer.findUnique({ where: { id }, select: { id: true } }))) {
      throw new NotFoundException('Dealer not found');
    }
  }
}
