import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelsQueryDto, OrdersQueryDto, PagedQueryDto } from './dto/ops-query.dto';

const num = (v: unknown): number => (v == null ? 0 : Number(v));

/** Read-only operations views over the DealPOS mirror tables. */
@Injectable()
export class OpsService {
  constructor(private prisma: PrismaService) {}

  async orders(query: OrdersQueryDto) {
    const { page = 1, limit = 50 } = query;
    const where: Prisma.DpInvoiceWhereInput = {
      isVoid: false,
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(new Date(query.to).getTime() + 86_399_999) } : {}),
            },
          }
        : {}),
      ...(query.tag ? { tag: query.tag } : {}),
      ...(query.payment ? { paymentStatus: query.payment } : {}),
      ...(query.q
        ? {
            OR: [
              { number: { contains: query.q, mode: 'insensitive' } },
              { customerName: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.dpInvoice.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { lines: true } } },
      }),
      this.prisma.dpInvoice.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async order(id: string) {
    const invoice = await this.prisma.dpInvoice.findUnique({
      where: { id },
      include: { lines: true, payments: true },
    });
    if (!invoice) throw new NotFoundException('Order not found');
    return invoice;
  }

  async customers(query: PagedQueryDto) {
    const { page = 1, limit = 50 } = query;
    const where: Prisma.DpCustomerWhereInput = query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { email: { contains: query.q, mode: 'insensitive' } },
            { mobile: { contains: query.q } },
            { code: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.dpCustomer.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.dpCustomer.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async purchaseOrders(query: PagedQueryDto) {
    const { page = 1, limit = 50 } = query;
    const where: Prisma.DpBillWhereInput = query.q
      ? {
          OR: [
            { number: { contains: query.q, mode: 'insensitive' } },
            { supplierName: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [data, total, suppliers] = await this.prisma.$transaction([
      this.prisma.dpBill.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { lines: true } } },
      }),
      this.prisma.dpBill.count({ where }),
      this.prisma.dpSupplier.count(),
    ]);
    return { data, total, page, limit, suppliers };
  }

  /** Per-channel (invoice Tag) totals + configured payment methods. */
  async channels(query: ChannelsQueryDto) {
    const clauses = [Prisma.sql`i."isVoid" = false`];
    if (query.from) clauses.push(Prisma.sql`i."date" >= ${new Date(query.from)}`);
    if (query.to) clauses.push(Prisma.sql`i."date" <= ${new Date(new Date(query.to).getTime() + 86_399_999)}`);
    const filter = Prisma.join(clauses, ' AND ');
    const rows = await this.prisma.$queryRaw<Array<{ tag: string; orders: unknown; revenue: unknown; last: Date }>>`
      SELECT COALESCE(i."tag", 'Untagged') AS tag,
             COUNT(*)                      AS orders,
             COALESCE(SUM(i."amount"), 0)  AS revenue,
             MAX(i."date")                 AS last
      FROM "DpInvoice" i
      WHERE ${filter}
      GROUP BY 1
      ORDER BY 3 DESC`;
    const paymentMethods = await this.prisma.dpPaymentMethod.findMany({ orderBy: { name: 'asc' } });
    return {
      channels: rows.map(r => ({
        tag: r.tag,
        orders: Number(r.orders),
        revenue: num(r.revenue),
        lastOrderAt: r.last,
      })),
      paymentMethods,
    };
  }
}
