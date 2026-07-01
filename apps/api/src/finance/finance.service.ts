import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Granularity, MarginGroup } from './dto/finance-query.dto';

const MAX_RANGE_DAYS = 400;

export interface FinanceFilters {
  from: string;
  to: string;
  outlet?: string;
  tag?: string;
}

export interface SummaryReport {
  from: string;
  to: string;
  revenue: number;
  orders: number;
  unitsSold: number;
  avgOrderValue: number;
  cogs: number;
  grossMargin: number;
  grossMarginPct: number | null;
}

export interface TimeseriesRow {
  period: string;
  revenue: number;
  orders: number;
  cogs: number;
  margin: number;
}

export interface PaymentRow {
  method: string;
  amount: number;
  count: number;
  share: number | null;
}

export interface MarginRow {
  group: string;
  revenue: number;
  cogs: number;
  margin: number;
  marginPct: number | null;
  unitsSold: number;
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const round2 = (v: number): number => Math.round(v * 100) / 100;

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  private range(filters: FinanceFilters): { from: Date; to: Date } {
    const from = new Date(filters.from);
    const to = new Date(filters.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException('Invalid date range');
    }
    // `to` is inclusive: extend to end of day
    const toEnd = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1);
    if ((toEnd.getTime() - from.getTime()) / 86_400_000 > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Date range too large (max ${MAX_RANGE_DAYS} days)`);
    }
    return { from, to: toEnd };
  }

  private invoiceWhere(filters: FinanceFilters, range: { from: Date; to: Date }): Prisma.DpInvoiceWhereInput {
    return {
      isVoid: false,
      date: { gte: range.from, lte: range.to },
      ...(filters.outlet ? { outlet: filters.outlet } : {}),
      ...(filters.tag ? { tag: filters.tag } : {}),
    };
  }

  /** SQL fragment shared by the raw queries; keep in sync with invoiceWhere. */
  private rawInvoiceFilter(filters: FinanceFilters, range: { from: Date; to: Date }): Prisma.Sql {
    const clauses = [
      Prisma.sql`i."isVoid" = false`,
      Prisma.sql`i."date" >= ${range.from}`,
      Prisma.sql`i."date" <= ${range.to}`,
    ];
    if (filters.outlet) clauses.push(Prisma.sql`i."outlet" = ${filters.outlet}`);
    if (filters.tag) clauses.push(Prisma.sql`i."tag" = ${filters.tag}`);
    return Prisma.join(clauses, ' AND ');
  }

  async summary(filters: FinanceFilters): Promise<SummaryReport> {
    const range = this.range(filters);
    const where = this.invoiceWhere(filters, range);
    const [agg, lineAgg] = await Promise.all([
      this.prisma.dpInvoice.aggregate({ where, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.$queryRaw<Array<{ cogs: unknown; units: unknown }>>`
        SELECT COALESCE(SUM(l."cost" * l."quantity"), 0) AS cogs,
               COALESCE(SUM(l."quantity"), 0)            AS units
        FROM "DpInvoiceLine" l
        JOIN "DpInvoice" i ON i."id" = l."invoiceId"
        WHERE ${this.rawInvoiceFilter(filters, range)}`,
    ]);
    const revenue = num(agg._sum.amount);
    const orders = agg._count._all;
    const cogs = num(lineAgg[0]?.cogs);
    const margin = revenue - cogs;
    return {
      from: filters.from,
      to: filters.to,
      revenue: round2(revenue),
      orders,
      unitsSold: Math.round(num(lineAgg[0]?.units)),
      avgOrderValue: orders > 0 ? round2(revenue / orders) : 0,
      cogs: round2(cogs),
      grossMargin: round2(margin),
      grossMarginPct: revenue > 0 ? round2((margin / revenue) * 100) : null,
    };
  }

  async timeseries(filters: FinanceFilters, granularity: Granularity = 'day'): Promise<TimeseriesRow[]> {
    const range = this.range(filters);
    const rows = await this.prisma.$queryRaw<Array<{ period: Date; revenue: unknown; orders: unknown; cogs: unknown }>>`
      SELECT date_trunc(${granularity}, i."date")            AS period,
             COALESCE(SUM(i."amount"), 0)                    AS revenue,
             COUNT(DISTINCT i."id")                          AS orders,
             COALESCE(SUM(l."cost" * l."quantity"), 0)       AS cogs
      FROM "DpInvoice" i
      LEFT JOIN "DpInvoiceLine" l ON l."invoiceId" = i."id"
      WHERE ${this.rawInvoiceFilter(filters, range)}
      GROUP BY 1
      ORDER BY 1`;
    return rows.map(r => {
      const revenue = num(r.revenue);
      const cogs = num(r.cogs);
      return {
        period: r.period.toISOString().slice(0, 10),
        revenue: round2(revenue),
        orders: Number(r.orders),
        cogs: round2(cogs),
        margin: round2(revenue - cogs),
      };
    });
  }

  async payments(filters: FinanceFilters): Promise<PaymentRow[]> {
    const range = this.range(filters);
    const rows = await this.prisma.$queryRaw<Array<{ method: string; amount: unknown; count: unknown }>>`
      SELECT p."method" AS method,
             COALESCE(SUM(p."amount"), 0) AS amount,
             COUNT(*)                     AS count
      FROM "DpInvoicePayment" p
      JOIN "DpInvoice" i ON i."id" = p."invoiceId"
      WHERE ${this.rawInvoiceFilter(filters, range)}
      GROUP BY 1
      ORDER BY 2 DESC`;
    const total = rows.reduce((sum, r) => sum + num(r.amount), 0);
    return rows.map(r => ({
      method: r.method,
      amount: round2(num(r.amount)),
      count: Number(r.count),
      share: total > 0 ? round2((num(r.amount) / total) * 100) : null,
    }));
  }

  async margins(filters: FinanceFilters, groupBy: MarginGroup = 'release', limit = 50): Promise<MarginRow[]> {
    const range = this.range(filters);
    const groupExpr =
      groupBy === 'tag'
        ? Prisma.sql`COALESCE(i."tag", 'Untagged')`
        : groupBy === 'category'
          ? Prisma.sql`COALESCE(r."genre", 'Uncategorised')`
          : Prisma.sql`l."name"`;
    const joinRelease =
      groupBy === 'category'
        ? Prisma.sql`LEFT JOIN "Release" r ON r."dealposVariantId" = l."variantId" OR (r."barcode" IS NOT NULL AND r."barcode" = l."code")`
        : Prisma.empty;
    const rows = await this.prisma.$queryRaw<Array<{ grp: string; revenue: unknown; cogs: unknown; units: unknown }>>`
      SELECT ${groupExpr}                                                        AS grp,
             COALESCE(SUM(COALESCE(l."sales", l."price" * l."quantity")), 0)     AS revenue,
             COALESCE(SUM(l."cost" * l."quantity"), 0)                           AS cogs,
             COALESCE(SUM(l."quantity"), 0)                                      AS units
      FROM "DpInvoiceLine" l
      JOIN "DpInvoice" i ON i."id" = l."invoiceId"
      ${joinRelease}
      WHERE ${this.rawInvoiceFilter(filters, range)}
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT ${limit}`;
    return rows.map(r => {
      const revenue = num(r.revenue);
      const cogs = num(r.cogs);
      return {
        group: r.grp,
        revenue: round2(revenue),
        cogs: round2(cogs),
        margin: round2(revenue - cogs),
        marginPct: revenue > 0 ? round2(((revenue - cogs) / revenue) * 100) : null,
        unitsSold: Math.round(num(r.units)),
      };
    });
  }

  /** Distinct filter values for the UI selects. */
  async filterOptions(): Promise<{ outlets: string[]; tags: string[] }> {
    const [outlets, tags] = await Promise.all([
      this.prisma.dpInvoice.findMany({
        where: { outlet: { not: null } }, distinct: ['outlet'], select: { outlet: true }, orderBy: { outlet: 'asc' },
      }),
      this.prisma.dpInvoice.findMany({
        where: { tag: { not: null } }, distinct: ['tag'], select: { tag: true }, orderBy: { tag: 'asc' },
      }),
    ]);
    return {
      outlets: outlets.map(o => o.outlet as string),
      tags: tags.map(t => t.tag as string),
    };
  }
}

/** Serialise rows to CSV with a stable header order. */
export function toCsv(rows: ReadonlyArray<object>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape((row as Record<string, unknown>)[h])).join(',')),
  ].join('\n') + '\n';
}
