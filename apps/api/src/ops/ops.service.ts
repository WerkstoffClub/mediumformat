import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TrackingStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChannelsQueryDto, CreateCustomerDto, CustomersQueryDto, OrdersQueryDto, UpdateCustomerDto, UpdateTrackingDto,
} from './dto/ops-query.dto';
import { fillMonths } from './customer-analytics';
import { invoiceChannelSql, placeholderChannel, realCustomer, tagChannelSql } from './dealpos-channels';
import { ORDER_STATUSES, type OrderStatus, type Segment, customerSegment, trackingTimes } from './order-status';

const num = (v: unknown): number => (v == null ? 0 : Number(v));

/** Customer segmentation thresholds. */
const VIP_LIFETIME_IDR = 5_000_000; // high-value customer cutoff
const REPEAT_MIN_ORDERS = 2; // bought more than once

type CustomerAggRow = {
  id: string;
  name: string;
  code: string | null;
  mobile: string | null;
  email: string | null;
  joinDate: Date | null;
  wholesale: boolean;
  source: 'dealpos' | 'mf';
  orders: unknown;
  lifetime: unknown;
  lastOrderAt: Date | null;
  channel: string | null;
  isNew: boolean;
};

type InboxRow = {
  id: string; number: string; source: 'dealpos' | 'mf'; outlet: string | null; customerName: string | null;
  tag: string | null; date: Date; amount: unknown; paymentStatus: string | null; fulfillment: string | null;
  channel: string; status: OrderStatus; lines: number; customerEmail: string | null; customerMobile: string | null;
  courier: string | null; trackingNo: string | null;
};

/** Operations views: the read-only DealPOS mirror plus MF-owned customers,
 *  back-office orders (WebOrder) and fulfilment tracking (OrderTracking). */
@Injectable()
export class OpsService {
  constructor(private prisma: PrismaService) {}

  /* ── Sources ─────────────────────────────────────────────────────────── */

  /** Every customer: DealPOS people (marketplace placeholders removed, with
   *  their MF wholesale flag) plus customers added in the back-office. */
  private readonly custCte = Prisma.sql`
    cust AS (
      SELECT d."id", d."name", d."code", d."mobile", d."email", d."joinDate",
             COALESCE(p."segment" = 'WHOLESALE', false) AS wholesale,
             'dealpos'::text AS source, NULL::text AS "baseChannel"
      FROM "DpCustomer" d
      LEFT JOIN "CustomerProfile" p ON p."dpCustomerId" = d."id"
      WHERE ${realCustomer('d')}
      UNION ALL
      SELECT p."id", p."name", NULL, p."phone", p."email", p."createdAt",
             p."segment" = 'WHOLESALE', 'mf', p."channel"
      FROM "CustomerProfile" p
      WHERE p."dpCustomerId" IS NULL
    )`;

  /** Every sale, for customer aggregates. DealPOS invoices and MF orders carry
   *  a free-text customer name, not a FK — the name is the join key. */
  private readonly ordCte = Prisma.sql`
    ord AS (
      SELECT i."customerName" AS cname, i."date", i."amount"::numeric AS amount,
             ${tagChannelSql(Prisma.sql`i."tag"`)} AS channel
      FROM "DpInvoice" i
      WHERE i."isVoid" = false
      UNION ALL
      SELECT w."customerName", w."createdAt", w."totalIdr"::numeric, w."channel"
      FROM "WebOrder" w
      WHERE w."status" <> 'CANCELLED'
    )`;

  private readonly custJoin = Prisma.sql`
    LEFT JOIN ord o ON lower(btrim(o.cname)) = lower(btrim(c."name"))`;

  /** Orders inbox source: DealPOS invoices + MF orders, each with one
   *  back-office status. Tracking (packed/shipped/delivered) is MF data and
   *  wins over what DealPOS can say; see order-status.ts for the rules. */
  private readonly inboxCte = Prisma.sql`
    inbox AS (
      SELECT i."id", i."number", 'dealpos'::text AS source, i."outlet", i."customerName", i."tag",
             i."date", i."amount"::numeric AS amount, i."paymentStatus", i."fulfillment",
             ${invoiceChannelSql('i')} AS channel,
             (SELECT COUNT(*) FROM "DpInvoiceLine" l WHERE l."invoiceId" = i."id")::int AS lines,
             CASE
               WHEN i."fulfillment" = 'Returned'               THEN 'returned'
               WHEN t."stage" IS NOT NULL                      THEN lower(t."stage"::text)
               WHEN i."paymentStatus" IN ('Unpaid', 'Partial') THEN 'pending'
               WHEN i."fulfillment" = 'Unsent'                 THEN 'processing'
               ELSE 'completed' END AS status,
             NULL::text AS "orderEmail", NULL::text AS "orderPhone",
             t."courier", t."trackingNo"
      FROM "DpInvoice" i
      LEFT JOIN "OrderTracking" t ON t."orderId" = i."id"
      WHERE i."isVoid" = false
      UNION ALL
      SELECT w."id", w."number", 'mf', NULL, w."customerName", NULL,
             w."createdAt", w."totalIdr"::numeric, NULL, NULL,
             w."channel",
             (SELECT COUNT(*) FROM "WebOrderLine" l WHERE l."orderId" = w."id")::int,
             CASE
               WHEN w."status" = 'CANCELLED'  THEN 'cancelled'
               WHEN w."status" = 'COMPLETED'  THEN 'completed'
               WHEN t."stage" IS NOT NULL     THEN lower(t."stage"::text)
               WHEN w."status" = 'PENDING'    THEN 'pending'
               WHEN w."status" = 'SHIPPED'    THEN 'shipped'
               ELSE 'processing' END,
             w."email", w."phone",
             t."courier", t."trackingNo"
      FROM "WebOrder" w
      LEFT JOIN "OrderTracking" t ON t."orderId" = w."id"
    )`;

  private shapeCustomer(r: CustomerAggRow) {
    const lifetime = num(r.lifetime);
    return {
      id: r.id,
      name: r.name,
      code: r.code,
      mobile: r.mobile,
      email: r.email,
      joinDate: r.joinDate,
      source: r.source,
      wholesale: r.wholesale,
      orders: Number(r.orders),
      lifetime,
      lastOrderAt: r.lastOrderAt,
      channel: r.channel,
      segment: customerSegment({ wholesale: r.wholesale, lifetime, isNew: r.isNew }, VIP_LIFETIME_IDR) as Segment,
    };
  }

  /* ── Orders ──────────────────────────────────────────────────────────── */

  private orderFilter(query: OrdersQueryDto, opts: { status?: boolean; channel?: boolean } = {}) {
    const { status = true, channel = true } = opts;
    const c: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (query.from) c.push(Prisma.sql`o."date" >= ${new Date(query.from)}`);
    if (query.to) c.push(Prisma.sql`o."date" <= ${new Date(new Date(query.to).getTime() + 86_399_999)}`);
    if (query.tag) c.push(Prisma.sql`o."tag" = ${query.tag}`);
    if (query.payment) c.push(Prisma.sql`o."paymentStatus" = ${query.payment}`);
    if (query.fulfillment) c.push(Prisma.sql`o."fulfillment" = ${query.fulfillment}`);
    if (query.source) c.push(Prisma.sql`o."source" = ${query.source}`);
    if (channel && query.channel) c.push(Prisma.sql`o."channel" = ${query.channel}`);
    if (status && query.status) c.push(Prisma.sql`o."status" = ${query.status}`);
    if (query.q) {
      const like = `%${query.q}%`;
      c.push(Prisma.sql`(o."number" ILIKE ${like} OR o."customerName" ILIKE ${like})`);
    }
    return Prisma.join(c, ' AND ');
  }

  /** Orders inbox: DealPOS invoices and back-office/web orders in one queue.
   *  Marketplace placeholder customers ("TikTok", "Shopee") are remapped to
   *  their channel — such orders carry the channel and no customer. */
  async orders(query: OrdersQueryDto) {
    const { page = 1, limit = 50 } = query;
    const where = this.orderFilter(query);
    const rows = await this.prisma.$queryRaw<InboxRow[]>`
      WITH ${this.inboxCte}
      SELECT o."id", o."number", o."source", o."outlet", o."customerName", o."tag", o."date", o."amount",
             o."paymentStatus", o."fulfillment", o."channel", o."status", o."lines",
             COALESCE(o."orderEmail", cu."email")  AS "customerEmail",
             COALESCE(o."orderPhone", cu."mobile") AS "customerMobile",
             o."courier", o."trackingNo"
      FROM inbox o
      LEFT JOIN LATERAL (
        SELECT c."email", c."mobile" FROM "DpCustomer" c
        WHERE o."source" = 'dealpos'
          AND lower(btrim(c."name")) = lower(btrim(o."customerName")) AND ${realCustomer('c')}
        LIMIT 1
      ) cu ON TRUE
      WHERE ${where}
      ORDER BY o."date" DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
    const [{ count }] = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      WITH ${this.inboxCte}
      SELECT COUNT(*) AS count FROM inbox o WHERE ${where}`;

    return {
      data: rows.map(r => {
        const marketplace = r.source === 'dealpos' && Boolean(placeholderChannel(r.customerName));
        return {
          id: r.id,
          number: r.number,
          source: r.source,
          outlet: r.outlet,
          customerName: marketplace ? null : r.customerName,
          customerEmail: marketplace ? null : r.customerEmail,
          customerMobile: marketplace ? null : r.customerMobile,
          marketplace,
          tag: r.tag,
          channel: r.channel,
          status: r.status,
          courier: r.courier,
          trackingNo: r.trackingNo,
          date: r.date,
          created: r.date,
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

  /** Counters for the Orders inbox: per status (with value), per channel, and
   *  today's orders. Status counts follow the channel filter and vice versa. */
  async ordersSummary(query: OrdersQueryDto) {
    const byStatusWhere = this.orderFilter(query, { status: false });
    const byChannelWhere = this.orderFilter(query, { channel: false, status: false });
    const statuses = await this.prisma.$queryRaw<Array<{ status: string; orders: bigint; amount: unknown }>>`
      WITH ${this.inboxCte}
      SELECT o."status", COUNT(*) AS orders, COALESCE(SUM(o."amount"), 0) AS amount
      FROM inbox o WHERE ${byStatusWhere} GROUP BY 1`;
    const channels = await this.prisma.$queryRaw<Array<{ channel: string; orders: bigint }>>`
      WITH ${this.inboxCte}
      SELECT o."channel", COUNT(*) AS orders
      FROM inbox o WHERE ${byChannelWhere} GROUP BY 1 ORDER BY 2 DESC`;
    const [today] = await this.prisma.$queryRaw<Array<{ orders: bigint; amount: unknown }>>`
      WITH ${this.inboxCte}
      SELECT COUNT(*) AS orders, COALESCE(SUM(o."amount"), 0) AS amount
      FROM inbox o
      WHERE ${byStatusWhere}
        AND o."date" >= date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta'`;
    const [couriers] = await this.prisma.$queryRaw<Array<{ n: bigint }>>`
      WITH ${this.inboxCte}
      SELECT COUNT(DISTINCT o."courier") AS n FROM inbox o WHERE ${byStatusWhere} AND o."status" = 'shipped'`;

    const st = (k: string) => statuses.find(s => s.status === k);
    const byStatus = Object.fromEntries(
      ORDER_STATUSES.map(k => [k, { orders: Number(st(k)?.orders ?? 0), amount: num(st(k)?.amount) }]),
    ) as Record<OrderStatus, { orders: number; amount: number }>;
    return {
      total: Object.values(byStatus).reduce((t, s) => t + s.orders, 0),
      byStatus,
      channels: channels.map(c => ({ channel: c.channel, orders: Number(c.orders) })),
      today: { orders: Number(today?.orders ?? 0), amount: num(today?.amount) },
      activeCouriers: Number(couriers?.n ?? 0),
    };
  }

  private async tracking(orderId: string) {
    return this.prisma.orderTracking.findUnique({ where: { orderId } });
  }

  /** One order — a DealPOS invoice or an MF order — in one shape. */
  async order(id: string) {
    const invoice = await this.prisma.dpInvoice.findUnique({
      where: { id },
      include: { lines: true, payments: true },
    });
    if (!invoice) return this.mfOrder(id);
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
    const row = (await this.orders({ q: invoice.number, page: 1, limit: 5 })).data.find(r => r.id === id);
    return {
      ...invoice,
      lines,
      source: 'dealpos' as const,
      channel: row?.channel ?? null,
      status: row?.status ?? null,
      tracking: await this.tracking(id),
    };
  }

  private async mfOrder(id: string) {
    const w = await this.prisma.webOrder.findUnique({ where: { id }, include: { lines: true } });
    if (!w) throw new NotFoundException('Order not found');
    const releases = await this.prisma.release.findMany({
      where: { id: { in: w.lines.map(l => l.releaseId) } },
      select: { id: true, artist: true, title: true, imageUrl: true, format: true },
    });
    const row = (await this.orders({ q: w.number, page: 1, limit: 5 })).data.find(r => r.id === id);
    const paid = w.status !== 'PENDING' && w.status !== 'CANCELLED';
    return {
      id: w.id,
      number: w.number,
      source: 'mf' as const,
      outlet: null,
      customerName: w.customerName,
      email: w.email,
      phone: w.phone,
      tag: null,
      channel: w.channel,
      status: row?.status ?? null,
      webStatus: w.status,
      date: w.createdAt,
      created: w.createdAt,
      amount: w.totalIdr,
      gross: w.subtotalIdr,
      discountTotal: w.discountIdr,
      tax: null,
      sales: w.totalIdr,
      surcharge: null,
      paymentStatus: paid ? 'Paid' : 'Unpaid',
      fulfillment: w.status === 'SHIPPED' || w.status === 'COMPLETED' ? 'Sent' : 'Unsent',
      fulfilment: w.fulfilment,
      address: [w.address, w.city, w.postalCode].filter(Boolean).join(', ') || null,
      notes: w.notes,
      isVoid: w.status === 'CANCELLED',
      lines: w.lines.map(l => ({
        id: l.id,
        name: `${l.artist} — ${l.title}`,
        code: null,
        variantId: null,
        quantity: l.qty,
        cost: null,
        price: l.unitPriceIdr,
        discountAmount: null,
        sales: l.unitPriceIdr * l.qty,
        release: releases.find(r => r.id === l.releaseId) ?? null,
      })),
      payments: paid ? [{ id: `${w.id}-pay`, date: w.createdAt, amount: w.totalIdr, method: w.channel, note: null }] : [],
      tracking: await this.tracking(id),
    };
  }

  /** Record packing/shipping progress on any order. Stamps the time of the
   *  stage (and of earlier stages not stamped yet). On an MF order, shipping
   *  also moves a paid order to SHIPPED so the Web orders page agrees. */
  async setTracking(id: string, dto: UpdateTrackingDto) {
    const [invoice, web] = await Promise.all([
      this.prisma.dpInvoice.findUnique({ where: { id }, select: { id: true, isVoid: true, fulfillment: true } }),
      this.prisma.webOrder.findUnique({ where: { id }, select: { id: true, status: true } }),
    ]);
    if (!invoice && !web) throw new NotFoundException('Order not found');
    if (invoice && (invoice.isVoid || invoice.fulfillment === 'Returned')) {
      throw new BadRequestException('A void or returned order cannot be shipped.');
    }
    if (web && (web.status === 'CANCELLED' || web.status === 'PENDING')) {
      throw new BadRequestException(web.status === 'PENDING' ? 'Mark the order paid before packing it.' : 'A cancelled order cannot be shipped.');
    }
    if (!dto.stage) {
      await this.prisma.orderTracking.deleteMany({ where: { orderId: id } });
      return null;
    }
    const prev = await this.tracking(id);
    const stage = dto.stage as TrackingStage;
    const data = {
      stage,
      courier: dto.courier === undefined ? prev?.courier ?? null : dto.courier.trim() || null,
      trackingNo: dto.trackingNo === undefined ? prev?.trackingNo ?? null : dto.trackingNo.trim() || null,
      ...trackingTimes(stage, prev, new Date()),
    };
    const saved = await this.prisma.orderTracking.upsert({ where: { orderId: id }, create: { orderId: id, ...data }, update: data });
    if (web && web.status === 'PAID' && stage !== 'PACKED') {
      await this.prisma.webOrder.update({ where: { id }, data: { status: 'SHIPPED' } });
    }
    return saved;
  }

  /* ── Customers ───────────────────────────────────────────────────────── */

  private customerWhere(query: CustomersQueryDto) {
    const c: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (query.q) {
      const like = `%${query.q}%`;
      c.push(Prisma.sql`(c."name" ILIKE ${like} OR c."email" ILIKE ${like} OR c."mobile" ILIKE ${like} OR c."code" ILIKE ${like})`);
    }
    if (query.segment === 'new') c.push(Prisma.sql`c."joinDate" >= date_trunc('month', now())`);
    if (query.segment === 'wholesale') c.push(Prisma.sql`c."wholesale"`);
    return Prisma.join(c, ' AND ');
  }

  private readonly custAgg = Prisma.sql`
    c."id", c."name", c."code", c."mobile", c."email", c."joinDate", c."wholesale", c."source",
    COUNT(o."date")                                                        AS orders,
    COALESCE(SUM(o."amount"), 0)                                           AS lifetime,
    MAX(o."date")                                                          AS "lastOrderAt",
    COALESCE(MAX(c."baseChannel"), (array_agg(o."channel" ORDER BY o."date" ASC)
               FILTER (WHERE o."channel" IS NOT NULL))[1]) AS channel,
    (c."joinDate" >= date_trunc('month', now()))                           AS "isNew"`;

  private readonly custGroup = Prisma.sql`GROUP BY 1, 2, 3, 4, 5, 6, 7, 8`;

  /** Paginated customer list enriched with lifetime value, order count,
      last order, acquisition channel and segment. */
  async customers(query: CustomersQueryDto) {
    const { page = 1, limit = 50 } = query;
    const where = this.customerWhere(query);
    const having =
      query.segment === 'vip'
        ? Prisma.sql`HAVING COALESCE(SUM(o."amount"), 0) >= ${VIP_LIFETIME_IDR}`
        : query.segment === 'repeat'
          ? Prisma.sql`HAVING COUNT(o."date") >= ${REPEAT_MIN_ORDERS}`
          : Prisma.empty;

    const rows = await this.prisma.$queryRaw<CustomerAggRow[]>`
      WITH ${this.custCte}, ${this.ordCte}
      SELECT ${this.custAgg}
      FROM cust c ${this.custJoin}
      WHERE ${where}
      ${this.custGroup}
      ${having}
      ORDER BY lifetime DESC NULLS LAST, c."name" ASC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
    const [{ count }] = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      WITH ${this.custCte}, ${this.ordCte}
      SELECT COUNT(*) AS count FROM (
        SELECT c."id" FROM cust c ${this.custJoin}
        WHERE ${where}
        GROUP BY c."id", c."name"
        ${having}
      ) s`;

    return { data: rows.map(r => this.shapeCustomer(r)), total: Number(count), page, limit };
  }

  /** Headline customer metrics, top customers and acquisition mix. */
  async customersSummary() {
    const [agg] = await this.prisma.$queryRaw<
      Array<{
        total: bigint; newThisMonth: bigint; vip: bigint; wholesale: bigint; repeat: bigint; withOrders: bigint;
        avgLifetime: unknown; avgOrders: unknown; totalRevenue: unknown; vipRevenue: unknown;
      }>
    >`
      WITH ${this.custCte}, ${this.ordCte},
      per AS (
        SELECT c."id", c."name", c."joinDate", c."wholesale",
               COUNT(o."date")              AS orders,
               COALESCE(SUM(o."amount"), 0) AS lifetime
        FROM cust c ${this.custJoin}
        GROUP BY 1, 2, 3, 4
      )
      SELECT COUNT(*)                                                          AS total,
             COUNT(*) FILTER (WHERE "joinDate" >= date_trunc('month', now()))  AS "newThisMonth",
             COUNT(*) FILTER (WHERE lifetime >= ${VIP_LIFETIME_IDR})           AS vip,
             COUNT(*) FILTER (WHERE wholesale)                                 AS wholesale,
             COUNT(*) FILTER (WHERE orders >= ${REPEAT_MIN_ORDERS})            AS repeat,
             COUNT(*) FILTER (WHERE orders > 0)                                AS "withOrders",
             COALESCE(AVG(lifetime) FILTER (WHERE orders > 0), 0)              AS "avgLifetime",
             COALESCE(AVG(orders) FILTER (WHERE orders > 0), 0)                AS "avgOrders",
             COALESCE(SUM(lifetime), 0)                                        AS "totalRevenue",
             COALESCE(SUM(lifetime) FILTER (WHERE lifetime >= ${VIP_LIFETIME_IDR}), 0) AS "vipRevenue"
      FROM per`;

    const topRows = await this.prisma.$queryRaw<CustomerAggRow[]>`
      WITH ${this.custCte}, ${this.ordCte}
      SELECT ${this.custAgg}
      FROM cust c ${this.custJoin}
      ${this.custGroup}
      HAVING COALESCE(SUM(o."amount"), 0) > 0
      ORDER BY lifetime DESC
      LIMIT 5`;

    const acquisition = await this.prisma.$queryRaw<Array<{ channel: string | null; count: bigint }>>`
      WITH ${this.custCte}, ${this.ordCte},
      firsttag AS (
        SELECT c."id",
               COALESCE(MAX(c."baseChannel"), (array_agg(o."channel" ORDER BY o."date" ASC)
                          FILTER (WHERE o."channel" IS NOT NULL))[1]) AS channel
        FROM cust c ${this.custJoin}
        GROUP BY c."id", c."name"
        HAVING COUNT(o."date") > 0 OR MAX(c."baseChannel") IS NOT NULL
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
      wholesaleCount: Number(agg?.wholesale ?? 0),
      avgLifetime: num(agg?.avgLifetime),
      avgOrders: num(agg?.avgOrders),
      repeatRate: withOrders > 0 ? Math.round((Number(agg?.repeat ?? 0) / withOrders) * 100) : 0,
      vipRevenueShare: totalRevenue > 0 ? Math.round((num(agg?.vipRevenue) / totalRevenue) * 100) : 0,
      topCustomers: topRows.map(r => this.shapeCustomer(r)),
      acquisition: acquisition.map(a => ({ channel: a.channel ?? 'Direct', count: Number(a.count) })),
    };
  }

  /** Customer analytics: 12-month new/active/returning trend plus order-frequency
   *  and recency distributions, over every customer and every sale. */
  async customersAnalytics(months = 12) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

    const trend = await this.prisma.$queryRaw<
      Array<{ month: string; active: bigint; fresh: bigint; returning: bigint; revenue: unknown }>
    >`
      WITH ${this.custCte}, ${this.ordCte},
           inv AS (SELECT c."id" AS cid, o."date", o."amount" FROM cust c JOIN ord o ON lower(btrim(o.cname)) = lower(btrim(c."name"))),
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
      WITH ${this.custCte}, ${this.ordCte},
           per AS (
             SELECT c."id", COUNT(*) AS orders, MAX(o."date") AS last
             FROM cust c JOIN ord o ON lower(btrim(o.cname)) = lower(btrim(c."name"))
             GROUP BY c."id"
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

  /** One customer's profile (DealPOS or back-office): lifetime aggregates,
   *  channel mix and recent orders across DealPOS and MF orders. */
  async customerDetail(id: string) {
    const [c] = await this.prisma.$queryRaw<CustomerAggRow[]>`
      WITH ${this.custCte}, ${this.ordCte}
      SELECT ${this.custAgg}
      FROM cust c ${this.custJoin}
      WHERE c."id" = ${id}
      ${this.custGroup}`;
    if (!c) throw new NotFoundException('Customer not found');

    const [agg] = await this.prisma.$queryRaw<Array<{ firstOrderAt: Date | null }>>`
      WITH ${this.ordCte}
      SELECT MIN(o."date") AS "firstOrderAt" FROM ord o WHERE lower(btrim(o.cname)) = lower(btrim(${c.name}))`;

    const channels = await this.prisma.$queryRaw<Array<{ tag: string; orders: bigint; revenue: unknown }>>`
      WITH ${this.ordCte}
      SELECT COALESCE(o."channel", 'Untagged') AS tag, COUNT(*) AS orders, COALESCE(SUM(o."amount"), 0) AS revenue
      FROM ord o WHERE lower(btrim(o.cname)) = lower(btrim(${c.name}))
      GROUP BY 1 ORDER BY 3 DESC`;

    const recent = await this.prisma.$queryRaw<InboxRow[]>`
      WITH ${this.inboxCte}
      SELECT * FROM inbox o
      WHERE lower(btrim(o."customerName")) = lower(btrim(${c.name}))
      ORDER BY o."date" DESC LIMIT 10`;

    const profile = await this.prisma.customerProfile.findFirst({
      where: c.source === 'mf' ? { id } : { dpCustomerId: id },
      select: { notes: true },
    });
    const shaped = this.shapeCustomer(c);
    return {
      ...shaped,
      notes: profile?.notes ?? null,
      avgOrder: shaped.orders > 0 ? Math.round(shaped.lifetime / shaped.orders) : 0,
      firstOrderAt: agg?.firstOrderAt ?? null,
      channels: channels.map(ch => ({ tag: ch.tag, orders: Number(ch.orders), revenue: num(ch.revenue) })),
      recentOrders: recent.map(o => ({
        id: o.id,
        number: o.number,
        date: o.date,
        tag: o.channel,
        amount: num(o.amount),
        paymentStatus: o.paymentStatus,
        fulfillment: o.fulfillment,
        status: o.status,
        lines: Number(o.lines),
      })),
    };
  }

  /** Add a customer in the back-office (DealPOS is not written to). */
  async createCustomer(dto: CreateCustomerDto) {
    const p = await this.prisma.customerProfile.create({
      data: {
        name: dto.name.trim(),
        email: dto.email?.trim().toLowerCase() || null,
        phone: dto.phone?.trim() || null,
        channel: dto.channel?.trim() || null,
        notes: dto.notes?.trim() || null,
        segment: dto.wholesale ? 'WHOLESALE' : 'RETAIL',
      },
    });
    return this.customerDetail(p.id);
  }

  /** Update MF-side facts: wholesale flag and notes on any customer; contact
   *  details only on back-office customers (DealPOS ones come from DealPOS). */
  async updateCustomer(id: string, dto: UpdateCustomerDto) {
    const own = await this.prisma.customerProfile.findFirst({ where: { id, dpCustomerId: null } });
    const segment = dto.wholesale === undefined ? undefined : dto.wholesale ? 'WHOLESALE' : 'RETAIL';
    if (own) {
      await this.prisma.customerProfile.update({
        where: { id },
        data: {
          segment,
          notes: dto.notes === undefined ? undefined : dto.notes.trim() || null,
          name: dto.name?.trim() || undefined,
          email: dto.email === undefined ? undefined : dto.email.trim().toLowerCase() || null,
          phone: dto.phone === undefined ? undefined : dto.phone.trim() || null,
          channel: dto.channel === undefined ? undefined : dto.channel.trim() || null,
        },
      });
      return this.customerDetail(id);
    }
    const dp = await this.prisma.dpCustomer.findUnique({ where: { id } });
    if (!dp || placeholderChannel(dp.name)) throw new NotFoundException('Customer not found');
    if (dto.name !== undefined || dto.email !== undefined || dto.phone !== undefined) {
      throw new BadRequestException('Contact details of a DealPOS customer are edited in DealPOS.');
    }
    const notes = dto.notes === undefined ? undefined : dto.notes.trim() || null;
    await this.prisma.customerProfile.upsert({
      where: { dpCustomerId: id },
      create: { dpCustomerId: id, name: dp.name, segment: segment ?? 'RETAIL', notes: notes ?? null },
      update: { segment, notes },
    });
    return this.customerDetail(id);
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
