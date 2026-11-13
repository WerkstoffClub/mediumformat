import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelsQueryDto, CustomersQueryDto, OrdersQueryDto } from './dto/ops-query.dto';
import { fillMonths } from './customer-analytics';
import { invoiceChannelSql, placeholderChannel, realCustomer, tagChannelSql } from './dealpos-channels';

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

  /** Status shown in the back-office, derived from the two DealPOS fields:
   *  returned → returned; unpaid/partial → pending (awaiting payment or
   *  marketplace settlement); paid but unsent → processing; else completed. */
  private readonly statusSql = Prisma.sql`CASE
      WHEN i."fulfillment" = 'Returned'                  THEN 'returned'
      WHEN i."paymentStatus" IN ('Unpaid', 'Partial')    THEN 'pending'
      WHEN i."fulfillment" = 'Unsent'                    THEN 'processing'
      ELSE 'completed' END`;

  private orderFilter(query: OrdersQueryDto, opts: { status?: boolean; channel?: boolean } = {}) {
    const { status = true, channel = true } = opts;
    const c: Prisma.Sql[] = [Prisma.sql`i."isVoid" = false`];
    if (query.from) c.push(Prisma.sql`i."date" >= ${new Date(query.from)}`);
    if (query.to) c.push(Prisma.sql`i."date" <= ${new Date(new Date(query.to).getTime() + 86_399_999)}`);
    if (query.tag) c.push(Prisma.sql`i."tag" = ${query.tag}`);
    if (query.payment) c.push(Prisma.sql`i."paymentStatus" = ${query.payment}`);
    if (query.fulfillment) c.push(Prisma.sql`i."fulfillment" = ${query.fulfillment}`);
    if (channel && query.channel) c.push(Prisma.sql`${invoiceChannelSql('i')} = ${query.channel}`);
    if (status && query.status) c.push(Prisma.sql`${this.statusSql} = ${query.status}`);
    if (query.q) {
      const like = `%${query.q}%`;
      c.push(Prisma.sql`(i."number" ILIKE ${like} OR i."customerName" ILIKE ${like})`);
    }
    return Prisma.join(c, ' AND ');
  }

  /** Orders inbox over the DealPOS mirror. Marketplace placeholder customers
   *  ("TikTok", "Shopee") are remapped to their channel — the order carries
   *  the channel and no customer, since the real buyer is not in DealPOS. */
  async orders(query: OrdersQueryDto) {
    const { page = 1, limit = 50 } = query;
    const where = this.orderFilter(query);
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string; number: string; outlet: string | null; customerName: string | null; tag: string | null;
        date: Date; created: Date; amount: unknown; paymentStatus: string | null; fulfillment: string | null;
        channel: string; status: string; customerEmail: string | null; customerMobile: string | null; lines: bigint;
      }>
    >`
      SELECT i."id", i."number", i."outlet", i."customerName", i."tag", i."date", i."created", i."amount",
             i."paymentStatus", i."fulfillment",
             ${invoiceChannelSql('i')} AS channel,
             ${this.statusSql}         AS status,
             cu."email"                AS "customerEmail",
             cu."mobile"               AS "customerMobile",
             (SELECT COUNT(*) FROM "DpInvoiceLine" l WHERE l."invoiceId" = i."id") AS lines
      FROM "DpInvoice" i
      LEFT JOIN LATERAL (
        SELECT c."email", c."mobile" FROM "DpCustomer" c
        WHERE lower(btrim(c."name")) = lower(btrim(i."customerName")) AND ${realCustomer('c')}
        LIMIT 1
      ) cu ON TRUE
      WHERE ${where}
      ORDER BY i."date" DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
    const [{ count }] = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM "DpInvoice" i WHERE ${where}`;

    return {
      data: rows.map(r => {
        const marketplace = placeholderChannel(r.customerName);
        return {
          id: r.id,
          number: r.number,
          outlet: r.outlet,
          customerName: marketplace ? null : r.customerName,
          customerEmail: marketplace ? null : r.customerEmail,
          customerMobile: marketplace ? null : r.customerMobile,
          marketplace: Boolean(marketplace),
          tag: r.tag,
          channel: r.channel,
          status: r.status,
          date: r.date,
          created: r.created,
          amount: num(r.amount),
          paymentStatus: r.paymentStatus,
          fulfillment: r.fulfillment,
          _count: { lines: Number(r.lines) },
        };
      }),
      total: Number(count),
      page,
      limit,
    };
  }

  /** Counters for the Orders inbox: per derived status (with value), per
   *  resolved channel, and today's orders. Respects q/from/to and, for the
   *  status counts, the selected channel (and vice versa). */
  async ordersSummary(query: OrdersQueryDto) {
    const byStatusWhere = this.orderFilter(query, { status: false });
    const byChannelWhere = this.orderFilter(query, { channel: false, status: false });
    const statuses = await this.prisma.$queryRaw<Array<{ status: string; orders: bigint; amount: unknown }>>`
      SELECT ${this.statusSql} AS status, COUNT(*) AS orders, COALESCE(SUM(i."amount"), 0) AS amount
      FROM "DpInvoice" i WHERE ${byStatusWhere} GROUP BY 1`;
    const channels = await this.prisma.$queryRaw<Array<{ channel: string; orders: bigint }>>`
      SELECT ${invoiceChannelSql('i')} AS channel, COUNT(*) AS orders
      FROM "DpInvoice" i WHERE ${byChannelWhere} GROUP BY 1 ORDER BY 2 DESC`;
    const [today] = await this.prisma.$queryRaw<Array<{ orders: bigint; amount: unknown }>>`
      SELECT COUNT(*) AS orders, COALESCE(SUM(i."amount"), 0) AS amount
      FROM "DpInvoice" i
      WHERE ${byStatusWhere} AND i."date" >= date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta'`;

    const st = (k: string) => statuses.find(s => s.status === k);
    const pack = (k: string) => ({ orders: Number(st(k)?.orders ?? 0), amount: num(st(k)?.amount) });
    const byStatus = {
      pending: pack('pending'),
      processing: pack('processing'),
      completed: pack('completed'),
      returned: pack('returned'),
    };
    return {
      total: Object.values(byStatus).reduce((t, s) => t + s.orders, 0),
      byStatus,
      channels: channels.map(c => ({ channel: c.channel, orders: Number(c.orders) })),
      today: { orders: Number(today?.orders ?? 0), amount: num(today?.amount) },
    };
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
             (array_agg(${tagChannelSql(Prisma.sql`i."tag"`)} ORDER BY i."date" ASC)
                FILTER (WHERE i."tag" IS NOT NULL))[1]                            AS channel,
             (c."joinDate" >= date_trunc('month', now()))                         AS "isNew"
      FROM "DpCustomer" c
      ${this.custJoin}
      WHERE ${realCustomer('c')} AND ${search} ${newOnly}
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
        WHERE ${realCustomer('c')} AND ${search} ${newOnly}
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
        WHERE ${realCustomer('c')}
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
             (array_agg(${tagChannelSql(Prisma.sql`i."tag"`)} ORDER BY i."date" ASC)
                FILTER (WHERE i."tag" IS NOT NULL))[1]                AS channel,
             (c."joinDate" >= date_trunc('month', now()))            AS "isNew"
      FROM "DpCustomer" c
      ${this.custJoin}
      WHERE ${realCustomer('c')}
      GROUP BY c."id"
      HAVING COALESCE(SUM(i."amount"), 0) > 0
      ORDER BY lifetime DESC
      LIMIT 5`;

    const acquisition = await this.prisma.$queryRaw<Array<{ channel: string | null; count: bigint }>>`
      WITH firsttag AS (
        SELECT c."id",
               (array_agg(${tagChannelSql(Prisma.sql`i."tag"`)} ORDER BY i."date" ASC)
                  FILTER (WHERE i."tag" IS NOT NULL))[1] AS channel
        FROM "DpCustomer" c
        ${this.custJoin}
        WHERE ${realCustomer('c')}
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

  /** Customer analytics: 12-month new/active/returning trend plus order-frequency
   *  and recency distributions. Same name-match join as the rest of this view. */
  async customersAnalytics(months = 12) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
    const inv = Prisma.sql`
      SELECT c."id" AS cid, i."date", i."amount"
      FROM "DpCustomer" c
      JOIN "DpInvoice" i
        ON i."isVoid" = false
       AND lower(btrim(i."customerName")) = lower(btrim(c."name"))
      WHERE ${realCustomer('c')}`;

    const trend = await this.prisma.$queryRaw<
      Array<{ month: string; active: bigint; fresh: bigint; returning: bigint; revenue: unknown }>
    >`
      WITH inv AS (${inv}),
           firsts AS (SELECT cid, MIN("date") AS f FROM inv GROUP BY cid)
      SELECT to_char(date_trunc('month', inv."date"), 'YYYY-MM')                    AS month,
             COUNT(DISTINCT inv.cid)                                               AS active,
             COUNT(DISTINCT inv.cid) FILTER (WHERE date_trunc('month', f.f) =  date_trunc('month', inv."date")) AS fresh,
             COUNT(DISTINCT inv.cid) FILTER (WHERE date_trunc('month', f.f) <  date_trunc('month', inv."date")) AS returning,
             COALESCE(SUM(inv."amount"), 0)                                        AS revenue
      FROM inv JOIN firsts f USING (cid)
      WHERE inv."date" >= ${start}
      GROUP BY 1`;

    const [dist] = await this.prisma.$queryRaw<
      Array<Record<'o1' | 'o2_3' | 'o4_9' | 'o10' | 'r30' | 'r90' | 'r180' | 'lapsed', bigint>>
    >`
      WITH per AS (
        SELECT cid, COUNT(*) AS orders, MAX("date") AS last FROM (${inv}) x GROUP BY cid
      )
      SELECT COUNT(*) FILTER (WHERE orders = 1)                            AS o1,
             COUNT(*) FILTER (WHERE orders BETWEEN 2 AND 3)                AS o2_3,
             COUNT(*) FILTER (WHERE orders BETWEEN 4 AND 9)                AS o4_9,
             COUNT(*) FILTER (WHERE orders >= 10)                          AS o10,
             COUNT(*) FILTER (WHERE last >= now() - interval '30 days')    AS r30,
             COUNT(*) FILTER (WHERE last <  now() - interval '30 days'  AND last >= now() - interval '90 days')  AS r90,
             COUNT(*) FILTER (WHERE last <  now() - interval '90 days'  AND last >= now() - interval '180 days') AS r180,
             COUNT(*) FILTER (WHERE last <  now() - interval '180 days')   AS lapsed
      FROM per`;

    const n = (k: keyof NonNullable<typeof dist>) => Number(dist?.[k] ?? 0);
    return {
      months: fillMonths(
        trend.map(t => ({
          month: t.month,
          activeCustomers: Number(t.active),
          newCustomers: Number(t.fresh),
          returningCustomers: Number(t.returning),
          revenue: num(t.revenue),
        })),
        months,
        now,
      ),
      frequency: [
        { label: '1 order', count: n('o1') },
        { label: '2–3 orders', count: n('o2_3') },
        { label: '4–9 orders', count: n('o4_9') },
        { label: '10+ orders', count: n('o10') },
      ],
      recency: [
        { label: 'Active · ≤30 days', count: n('r30') },
        { label: 'Cooling · 31–90 days', count: n('r90') },
        { label: 'At risk · 91–180 days', count: n('r180') },
        { label: 'Lapsed · 180+ days', count: n('lapsed') },
      ],
    };
  }

  /** One customer's full profile: lifetime aggregates, channel mix and recent
   *  orders — all matched to the DealPOS invoice stream by name, read-only. */
  async customerDetail(id: string) {
    const c = await this.prisma.dpCustomer.findUnique({ where: { id } });
    if (!c || placeholderChannel(c.name)) throw new NotFoundException('Customer not found');

    const match = Prisma.sql`i."isVoid" = false AND lower(btrim(i."customerName")) = lower(btrim(${c.name}))`;

    const [agg] = await this.prisma.$queryRaw<
      Array<{ orders: bigint; lifetime: unknown; firstOrderAt: Date | null; lastOrderAt: Date | null }>
    >`
      SELECT COUNT(i."id")                AS orders,
             COALESCE(SUM(i."amount"), 0) AS lifetime,
             MIN(i."date")                AS "firstOrderAt",
             MAX(i."date")                AS "lastOrderAt"
      FROM "DpInvoice" i
      WHERE ${match}`;

    const channels = await this.prisma.$queryRaw<Array<{ tag: string; orders: bigint; revenue: unknown }>>`
      SELECT COALESCE(${tagChannelSql(Prisma.sql`i."tag"`)}, 'Untagged') AS tag,
             COUNT(*)                      AS orders,
             COALESCE(SUM(i."amount"), 0)  AS revenue
      FROM "DpInvoice" i
      WHERE ${match}
      GROUP BY 1
      ORDER BY 3 DESC`;

    const recentOrders = await this.prisma.$queryRaw<
      Array<{
        id: string; number: string; date: Date; tag: string | null; amount: unknown;
        paymentStatus: string | null; fulfillment: string | null; lines: bigint;
      }>
    >`
      SELECT i."id", i."number", i."date", i."tag", i."amount",
             i."paymentStatus", i."fulfillment",
             (SELECT COUNT(*) FROM "DpInvoiceLine" l WHERE l."invoiceId" = i."id") AS lines
      FROM "DpInvoice" i
      WHERE ${match}
      ORDER BY i."date" DESC
      LIMIT 10`;

    const orders = Number(agg?.orders ?? 0);
    const lifetime = num(agg?.lifetime);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const isNew = c.joinDate ? c.joinDate >= startOfMonth : false;

    return {
      id: c.id,
      name: c.name,
      code: c.code,
      mobile: c.mobile,
      email: c.email,
      joinDate: c.joinDate,
      orders,
      lifetime,
      avgOrder: orders > 0 ? Math.round(lifetime / orders) : 0,
      firstOrderAt: agg?.firstOrderAt ?? null,
      lastOrderAt: agg?.lastOrderAt ?? null,
      segment: this.segment(lifetime, isNew),
      channels: channels.map(ch => ({ tag: ch.tag, orders: Number(ch.orders), revenue: num(ch.revenue) })),
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        number: o.number,
        date: o.date,
        tag: o.tag,
        amount: num(o.amount),
        paymentStatus: o.paymentStatus,
        fulfillment: o.fulfillment,
        lines: Number(o.lines),
      })),
    };
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
