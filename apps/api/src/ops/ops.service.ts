import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelsQueryDto, CustomersQueryDto, OrdersQueryDto, PagedQueryDto } from './dto/ops-query.dto';

const num = (v: unknown): number => (v == null ? 0 : Number(v));

/** Customer segmentation thresholds, applied over the DealPOS sales mirror. */
const VIP_LIFETIME_IDR = 5_000_000; // high-value customer cutoff
const REPEAT_MIN_ORDERS = 2; // bought more than once

type CustomerAggRow = {
  id: string;
  name: string;
  code: string | null;
  mobile: string | null;
  email: string | null;
  joinDate: Date | null;
  orders: unknown;
  lifetime: unknown;
  lastOrderAt: Date | null;
  channel: string | null;
  isNew: boolean;
};

/** Read-only operations views over the DealPOS mirror tables. */
@Injectable()
export class OpsService {
  constructor(private prisma: PrismaService) {}

  /** Join key between the customer directory and the invoice stream.
      DealPOS invoices carry a free-text customer name, not a FK. */
  private readonly custJoin = Prisma.sql`
    LEFT JOIN "DpInvoice" i
      ON i."isVoid" = false
     AND lower(btrim(i."customerName")) = lower(btrim(c."name"))`;

  private segment(lifetime: number, isNew: boolean): 'vip' | 'new' | null {
    if (lifetime >= VIP_LIFETIME_IDR) return 'vip';
    if (isNew) return 'new';
    return null;
  }

  private shapeCustomer(r: CustomerAggRow) {
    const lifetime = num(r.lifetime);
    return {
      id: r.id,
      name: r.name,
      code: r.code,
      mobile: r.mobile,
      email: r.email,
      joinDate: r.joinDate,
      orders: Number(r.orders),
      lifetime,
      lastOrderAt: r.lastOrderAt,
      channel: r.channel,
      segment: this.segment(lifetime, r.isNew),
    };
  }

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
      ...(query.fulfillment ? { fulfillment: query.fulfillment } : {}),
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
    // Enrich lines with the matching catalogue release (cover, link)
    const variantIds = invoice.lines.map(l => l.variantId).filter((v): v is string => Boolean(v));
    const codes = invoice.lines.map(l => l.code).filter((c): c is string => Boolean(c));
    const releases = await this.prisma.release.findMany({
      where: { OR: [{ dealposVariantId: { in: variantIds } }, { catNumber: { in: codes } }] },
      select: { id: true, artist: true, title: true, imageUrl: true, format: true, dealposVariantId: true, catNumber: true },
    });
    const lines = invoice.lines.map(line => ({
      ...line,
      release:
        releases.find(r => r.dealposVariantId && r.dealposVariantId === line.variantId) ??
        releases.find(r => r.catNumber && r.catNumber === line.code) ??
        null,
    }));
    return { ...invoice, lines };
  }

  /** Paginated customer list enriched with lifetime value, order count,
      last order, acquisition channel and derived segment. */
  async customers(query: CustomersQueryDto) {
    const { page = 1, limit = 50 } = query;
    const offset = (page - 1) * limit;

    const search = query.q
      ? Prisma.sql`(c."name" ILIKE ${'%' + query.q + '%'} OR c."email" ILIKE ${'%' + query.q + '%'}
                    OR c."mobile" ILIKE ${'%' + query.q + '%'} OR c."code" ILIKE ${'%' + query.q + '%'})`
      : Prisma.sql`TRUE`;

    // Segment filter is applied after aggregation (VIP = lifetime cutoff),
    // except "new" which is a cheap join-date predicate on the customer row.
    const having =
      query.segment === 'vip'
        ? Prisma.sql`HAVING COALESCE(SUM(i."amount"), 0) >= ${VIP_LIFETIME_IDR}`
        : query.segment === 'repeat'
          ? Prisma.sql`HAVING COUNT(i."id") >= ${REPEAT_MIN_ORDERS}`
          : Prisma.empty;
    const newOnly =
      query.segment === 'new'
        ? Prisma.sql`AND c."joinDate" >= date_trunc('month', now())`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<CustomerAggRow[]>`
      SELECT c."id", c."name", c."code", c."mobile", c."email", c."joinDate",
             COUNT(i."id")                                                        AS orders,
             COALESCE(SUM(i."amount"), 0)                                         AS lifetime,
             MAX(i."date")                                                        AS "lastOrderAt",
             (array_agg(i."tag" ORDER BY i."date" ASC)
                FILTER (WHERE i."tag" IS NOT NULL))[1]                            AS channel,
             (c."joinDate" >= date_trunc('month', now()))                         AS "isNew"
      FROM "DpCustomer" c
      ${this.custJoin}
      WHERE ${search} ${newOnly}
      GROUP BY c."id"
      ${having}
      ORDER BY lifetime DESC NULLS LAST, c."name" ASC
      LIMIT ${limit} OFFSET ${offset}`;

    // Total respects the segment filter so the paginator stays honest.
    const totalRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM (
        SELECT c."id"
        FROM "DpCustomer" c
        ${this.custJoin}
        WHERE ${search} ${newOnly}
        GROUP BY c."id"
        ${having}
      ) s`;

    return {
      data: rows.map(r => this.shapeCustomer(r)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      limit,
    };
  }

  /** Headline customer metrics, top customers and acquisition mix for the
      Customers overview strip and side panels. */
  async customersSummary() {
    const [agg] = await this.prisma.$queryRaw<
      Array<{
        total: bigint;
        newThisMonth: bigint;
        vip: bigint;
        repeat: bigint;
        withOrders: bigint;
        avgLifetime: unknown;
        avgOrders: unknown;
        totalRevenue: unknown;
        vipRevenue: unknown;
      }>
    >`
      WITH per AS (
        SELECT c."id", c."joinDate",
               COUNT(i."id")                 AS orders,
               COALESCE(SUM(i."amount"), 0)  AS lifetime
        FROM "DpCustomer" c
        ${this.custJoin}
        GROUP BY c."id"
      )
      SELECT COUNT(*)                                                          AS total,
             COUNT(*) FILTER (WHERE "joinDate" >= date_trunc('month', now()))  AS "newThisMonth",
             COUNT(*) FILTER (WHERE lifetime >= ${VIP_LIFETIME_IDR})           AS vip,
             COUNT(*) FILTER (WHERE orders >= ${REPEAT_MIN_ORDERS})            AS repeat,
             COUNT(*) FILTER (WHERE orders > 0)                                AS "withOrders",
             COALESCE(AVG(lifetime) FILTER (WHERE orders > 0), 0)              AS "avgLifetime",
             COALESCE(AVG(orders) FILTER (WHERE orders > 0), 0)                AS "avgOrders",
             COALESCE(SUM(lifetime), 0)                                        AS "totalRevenue",
             COALESCE(SUM(lifetime) FILTER (WHERE lifetime >= ${VIP_LIFETIME_IDR}), 0) AS "vipRevenue"
      FROM per`;

    const topRows = await this.prisma.$queryRaw<CustomerAggRow[]>`
      SELECT c."id", c."name", c."code", c."mobile", c."email", c."joinDate",
             COUNT(i."id")                                            AS orders,
             COALESCE(SUM(i."amount"), 0)                             AS lifetime,
             MAX(i."date")                                            AS "lastOrderAt",
             (array_agg(i."tag" ORDER BY i."date" ASC)
                FILTER (WHERE i."tag" IS NOT NULL))[1]                AS channel,
             (c."joinDate" >= date_trunc('month', now()))            AS "isNew"
      FROM "DpCustomer" c
      ${this.custJoin}
      GROUP BY c."id"
      HAVING COALESCE(SUM(i."amount"), 0) > 0
      ORDER BY lifetime DESC
      LIMIT 5`;

    const acquisition = await this.prisma.$queryRaw<Array<{ channel: string | null; count: bigint }>>`
      WITH firsttag AS (
        SELECT c."id",
               (array_agg(i."tag" ORDER BY i."date" ASC)
                  FILTER (WHERE i."tag" IS NOT NULL))[1] AS channel
        FROM "DpCustomer" c
        ${this.custJoin}
        GROUP BY c."id"
        HAVING COUNT(i."id") > 0
      )
      SELECT COALESCE(channel, 'Direct') AS channel, COUNT(*) AS count
      FROM firsttag
      GROUP BY 1
      ORDER BY 2 DESC`;

    const total = Number(agg?.total ?? 0);
    const totalRevenue = num(agg?.totalRevenue);
    const withOrders = Number(agg?.withOrders ?? 0);
    return {
      totalCustomers: total,
      newThisMonth: Number(agg?.newThisMonth ?? 0),
      vipCount: Number(agg?.vip ?? 0),
      avgLifetime: num(agg?.avgLifetime),
      avgOrders: num(agg?.avgOrders),
      repeatRate: withOrders > 0 ? Math.round((Number(agg?.repeat ?? 0) / withOrders) * 100) : 0,
      vipRevenueShare: totalRevenue > 0 ? Math.round((num(agg?.vipRevenue) / totalRevenue) * 100) : 0,
      topCustomers: topRows.map(r => this.shapeCustomer(r)),
      acquisition: acquisition.map(a => ({ channel: a.channel ?? 'Direct', count: Number(a.count) })),
    };
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

  /** Catalogue shape: releases grouped by format, genre and store location. */
  async catalogSummary() {
    const [formats, genres, locations] = await Promise.all([
      this.prisma.release.groupBy({ by: ['format'], _count: { _all: true }, _sum: { stock: true } }),
      this.prisma.release.groupBy({ by: ['genre'], _count: { _all: true }, _sum: { stock: true } }),
      this.prisma.release.groupBy({ by: ['storeLocation'], _count: { _all: true }, _sum: { stock: true } }),
    ]);
    const shape = (rows: Array<{ _count: { _all: number }; _sum: { stock: number | null } }>, key: (r: never) => string | null) =>
      rows
        .map(r => ({ name: key(r as never) ?? 'Uncategorised', releases: r._count._all, units: r._sum.stock ?? 0 }))
        .sort((a, b) => b.releases - a.releases);
    return {
      formats: shape(formats, (r: { format: string }) => r.format),
      genres: shape(genres, (r: { genre: string | null }) => r.genre),
      locations: shape(locations, (r: { storeLocation: string }) => r.storeLocation),
    };
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
