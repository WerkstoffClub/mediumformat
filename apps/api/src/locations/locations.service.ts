import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationKind, StoreLocation, Prisma, type Location } from '@prisma/client';
import {
  availableAt, commissionSplit, dayKeys, homeLocationId, pctChange, sellThrough,
} from './location-stock';

export interface LocationStats { items: number; units: number; shelves: number; lowStock: number; valueIdr: number; }
export interface LocationSales { revenue: number; orders: number; avgOrder: number; units: number; windowDays: number; }
export type LocationWithStats = Location & { stats: LocationStats; sales: LocationSales };

const DAY = 86_400_000;

/** Arbitrary, stable key for the seed advisory lock (any app-unique bigint). */
const SEED_LOCK = 4823001;

/** First-run defaults so the page is populated from the physical stores the
 *  inventory already uses. Only created when the table is empty. */
const SEED: Array<Pick<CreateLocationDto, 'name' | 'kind' | 'storeLocation'> & { sortOrder: number }> = [
  { name: 'Main Store', kind: LocationKind.RETAIL, storeLocation: StoreLocation.MAIN_STORE, sortOrder: 0 },
  { name: 'Warehouse', kind: LocationKind.STORAGE, storeLocation: StoreLocation.WAREHOUSE, sortOrder: 1 },
  { name: 'Consignment', kind: LocationKind.CONSIGNMENT, storeLocation: StoreLocation.CONSIGNMENT, sortOrder: 2 },
];

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  /** Seed the physical stores once, idempotently. Fast-path skips the lock
   *  after the table is populated; concurrent first-runs serialise on a
   *  transaction-scoped advisory lock so the seed can't be double-inserted. */
  private async ensureSeeded() {
    if (await this.prisma.location.count() > 0) return;
    await this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SEED_LOCK})`;
      if (await tx.location.count() === 0) {
        await tx.location.createMany({ data: SEED });
      }
    });
  }

  /**
   * Stock per location from the by-location model: a home location holds
   * Release.stock minus what is away; any other location holds its away rows.
   */
  private async stockStats(locations: Location[]): Promise<Map<string, LocationStats>> {
    const [releases, rows] = await Promise.all([
      this.prisma.release.findMany({ select: { id: true, storeLocation: true, stock: true, lowStockThreshold: true, shelfLocation: true, priceIdr: true } }),
      this.prisma.locationStock.findMany({ where: { qty: { not: 0 } }, select: { locationId: true, releaseId: true, qty: true } }),
    ]);
    const out = new Map<string, LocationStats & { shelfSet: Set<string> }>();
    const get = (id: string) => {
      let s = out.get(id);
      if (!s) { s = { items: 0, units: 0, shelves: 0, lowStock: 0, valueIdr: 0, shelfSet: new Set() }; out.set(id, s); }
      return s;
    };
    const homes = new Map<StoreLocation, string | null>();
    for (const k of Object.values(StoreLocation)) homes.set(k, homeLocationId(k, locations));
    const rowsByRelease = new Map<string, Array<{ locationId: string; qty: number }>>();
    for (const r of rows) {
      const list = rowsByRelease.get(r.releaseId) ?? [];
      list.push(r);
      rowsByRelease.set(r.releaseId, list);
    }
    for (const r of releases) {
      const homeId = homes.get(r.storeLocation) ?? null;
      const away = (rowsByRelease.get(r.id) ?? []).filter(x => x.locationId !== homeId);
      if (homeId) {
        const qty = availableAt(homeId, homeId, r.stock, away);
        const s = get(homeId);
        s.items += 1;
        s.units += qty;
        s.valueIdr += qty * r.priceIdr;
        if (qty > 0 && qty <= r.lowStockThreshold) s.lowStock += 1;
        if (r.shelfLocation) s.shelfSet.add(r.shelfLocation);
      }
      for (const a of away) {
        if (a.qty <= 0) continue;
        const s = get(a.locationId);
        s.items += 1;
        s.units += a.qty;
        s.valueIdr += a.qty * r.priceIdr;
      }
    }
    const res = new Map<string, LocationStats>();
    for (const [k, v] of out) res.set(k, { items: v.items, units: v.units, shelves: v.shelfSet.size, lowStock: v.lowStock, valueIdr: v.valueIdr });
    return res;
  }

  /** The window a location's figures cover: an event's run, else the last `days` days. */
  private windowOf(l: Location, days = 30): { from: Date; to: Date } {
    if (l.kind === LocationKind.TEMPORARY && (l.startDate || l.endDate)) {
      const from = l.startDate ?? new Date((l.endDate as Date).getTime() - days * DAY);
      const to = l.endDate ? new Date(l.endDate.getTime() + DAY - 1) : new Date();
      return { from, to };
    }
    const to = new Date();
    return { from: new Date(to.getTime() - days * DAY), to };
  }

  /** Home location for sales recorded before POS sales carried a location. */
  private legacyHomeId(locations: Location[]): string | null {
    return homeLocationId(StoreLocation.MAIN_STORE, locations);
  }

  /** MF POS sales (PAID, excl. PPN) per location in each location's window — one query. */
  private async posSalesBatch(locations: Location[]): Promise<Map<string, { revenue: number; orders: number; units: number }>> {
    const out = new Map<string, { revenue: number; orders: number; units: number }>();
    if (locations.length === 0) return out;
    const legacy = this.legacyHomeId(locations);
    const rows = locations.map(l => {
      const w = this.windowOf(l);
      return Prisma.sql`(${l.id}::text, ${w.from}::timestamptz, ${w.to}::timestamptz, ${l.id === legacy}::boolean)`;
    });
    const agg = await this.prisma.$queryRaw<Array<{ id: string; revenue: unknown; orders: bigint; units: unknown }>>`
      SELECT w.id,
             COALESCE(SUM(s."subtotalIdr" - s."discountIdr"), 0) AS revenue,
             COUNT(s.id) AS orders,
             COALESCE(SUM((SELECT SUM(l.qty) FROM "PosSaleLine" l WHERE l."saleId" = s.id)), 0) AS units
      FROM (VALUES ${Prisma.join(rows)}) AS w(id, start_at, end_at, legacy)
      LEFT JOIN "PosSale" s
        ON s.status = 'PAID'
       AND COALESCE(s."paidAt", s."createdAt") >= w.start_at
       AND COALESCE(s."paidAt", s."createdAt") <= w.end_at
       AND (s."locationId" = w.id OR (w.legacy AND s."locationId" IS NULL))
      GROUP BY w.id`;
    for (const r of agg) out.set(r.id, { revenue: Number(r.revenue), orders: Number(r.orders), units: Number(r.units) });
    return out;
  }

  /** DealPOS sales matched to a location by its matchKey (tag / outlet substring,
   *  or exact customer name), in its window — one query. Locations without a
   *  matchKey get DealPOS sales only when they are an event with dates. */
  private async dealposSalesBatch(locations: Location[]): Promise<Map<string, { revenue: number; orders: number; units: number }>> {
    const out = new Map<string, { revenue: number; orders: number; units: number }>();
    const usable = locations.filter(l => l.matchKey || (l.kind === LocationKind.TEMPORARY && (l.startDate || l.endDate)));
    if (usable.length === 0) return out;
    const rows = usable.map(l => {
      const w = this.windowOf(l);
      return Prisma.sql`(${l.id}::text, ${w.from}::timestamptz, ${w.to}::timestamptz, ${l.matchKey}::text)`;
    });
    const agg = await this.prisma.$queryRaw<Array<{ id: string; revenue: unknown; orders: bigint; units: unknown }>>`
      SELECT e.id,
             COALESCE(SUM(i."amount"), 0) AS revenue,
             COUNT(i."id") AS orders,
             COALESCE(SUM((SELECT SUM(l.quantity) FROM "DpInvoiceLine" l WHERE l."invoiceId" = i.id)), 0) AS units
      FROM (VALUES ${Prisma.join(rows)}) AS e(id, start_at, end_at, match_key)
      LEFT JOIN "DpInvoice" i
        ON i."isVoid" = false
       AND i."date" >= e.start_at
       AND i."date" <= e.end_at
       AND (
         e.match_key IS NULL
         OR i."tag"    ILIKE '%' || e.match_key || '%'
         OR i."outlet" ILIKE '%' || e.match_key || '%'
         OR lower(btrim(i."customerName")) = lower(btrim(e.match_key))
       )
      GROUP BY e.id`;
    for (const r of agg) out.set(r.id, { revenue: Number(r.revenue), orders: Number(r.orders), units: Number(r.units) });
    return out;
  }

  async findAll(): Promise<LocationWithStats[]> {
    await this.ensureSeeded();
    const locations = await this.prisma.location.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    const [stats, pos, dp] = await Promise.all([
      this.stockStats(locations),
      this.posSalesBatch(locations),
      this.dealposSalesBatch(locations),
    ]);
    return locations.map(l => {
      const p = pos.get(l.id) ?? { revenue: 0, orders: 0, units: 0 };
      const d = dp.get(l.id) ?? { revenue: 0, orders: 0, units: 0 };
      const revenue = p.revenue + d.revenue;
      const orders = p.orders + d.orders;
      const w = this.windowOf(l);
      return {
        ...l,
        stats: stats.get(l.id) ?? { items: 0, units: 0, shelves: l.shelves.length, lowStock: 0, valueIdr: 0 },
        sales: {
          revenue, orders, units: p.units + d.units,
          avgOrder: orders > 0 ? Math.round(revenue / orders) : 0,
          windowDays: Math.max(1, Math.round((w.to.getTime() - w.from.getTime()) / DAY)),
        },
      };
    });
  }

  /**
   * Everything the location page needs for one period: sales (MF POS + matched
   * DealPOS), commission and net, the previous equal period for the trend, a
   * daily series, sell-through, top sellers, stock on hand and recent transfers.
   */
  async report(id: string, fromIso?: string, toIso?: string) {
    const loc = await this.findOne(id);
    const locations = await this.prisma.location.findMany();
    const def = this.windowOf(loc);
    const from = fromIso ? new Date(fromIso) : def.from;
    const to = toIso ? new Date(new Date(toIso).getTime() + (toIso.length <= 10 ? DAY - 1 : 0)) : def.to;
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new ConflictException('Invalid date range.');
    }
    const span = to.getTime() - from.getTime() + 1;
    const prevFrom = new Date(from.getTime() - span);
    const prevTo = new Date(from.getTime() - 1);
    const legacy = this.legacyHomeId(locations) === id;

    const posWhere = (a: Date, b: Date): Prisma.PosSaleWhereInput => ({
      status: 'PAID',
      OR: [{ paidAt: { gte: a, lte: b } }, { paidAt: null, createdAt: { gte: a, lte: b } }],
      AND: [{ OR: legacy ? [{ locationId: id }, { locationId: null }] : [{ locationId: id }] }],
    });
    const [sales, prevSales] = await Promise.all([
      this.prisma.posSale.findMany({ where: posWhere(from, to), include: { lines: true } }),
      this.prisma.posSale.findMany({ where: posWhere(prevFrom, prevTo), select: { subtotalIdr: true, discountIdr: true } }),
    ]);

    const dealpos = async (a: Date, b: Date) => {
      if (!loc.matchKey && !(loc.kind === LocationKind.TEMPORARY && (loc.startDate || loc.endDate))) return [] as Array<{ day: string; revenue: number; orders: number }>;
      const mk = loc.matchKey;
      const rows = await this.prisma.$queryRaw<Array<{ day: string; revenue: unknown; orders: bigint }>>`
        SELECT to_char(i."date" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS day,
               COALESCE(SUM(i."amount"), 0) AS revenue, COUNT(i.id) AS orders
        FROM "DpInvoice" i
        WHERE i."isVoid" = false AND i."date" >= ${a} AND i."date" <= ${b}
          AND (${mk}::text IS NULL
               OR i."tag" ILIKE '%' || ${mk}::text || '%'
               OR i."outlet" ILIKE '%' || ${mk}::text || '%'
               OR lower(btrim(i."customerName")) = lower(btrim(${mk}::text)))
        GROUP BY 1`;
      return rows.map(r => ({ day: r.day, revenue: Number(r.revenue), orders: Number(r.orders) }));
    };
    const [dp, prevDp] = await Promise.all([dealpos(from, to), dealpos(prevFrom, prevTo)]);

    const wib = (d: Date) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
    const days = dayKeys(from, to);
    const series = new Map(days.map(d => [d, { date: d, posRevenue: 0, dealposRevenue: 0, units: 0, orders: 0 }]));
    const top = new Map<string, { releaseId: string; artist: string; title: string; units: number; revenue: number }>();
    let posRevenue = 0, posUnits = 0;
    for (const s of sales) {
      const net = s.subtotalIdr - s.discountIdr;
      posRevenue += net;
      const day = series.get(wib(s.paidAt ?? s.createdAt));
      const units = s.lines.reduce((n, l) => n + l.qty, 0);
      posUnits += units;
      if (day) { day.posRevenue += net; day.units += units; day.orders += 1; }
      for (const l of s.lines) {
        const t = top.get(l.releaseId) ?? { releaseId: l.releaseId, artist: l.artist, title: l.title, units: 0, revenue: 0 };
        t.units += l.qty;
        t.revenue += l.unitPriceIdr * l.qty;
        top.set(l.releaseId, t);
      }
    }
    let dpRevenue = 0, dpOrders = 0;
    for (const r of dp) {
      dpRevenue += r.revenue;
      dpOrders += r.orders;
      const day = series.get(r.day);
      if (day) { day.dealposRevenue += r.revenue; day.orders += r.orders; }
    }

    const revenue = posRevenue + dpRevenue;
    const orders = sales.length + dpOrders;
    const prevRevenue = prevSales.reduce((n, s) => n + s.subtotalIdr - s.discountIdr, 0) + prevDp.reduce((n, r) => n + r.revenue, 0);
    const stats = (await this.stockStats(locations)).get(id) ?? { items: 0, units: 0, shelves: 0, lowStock: 0, valueIdr: 0 };
    const transfers = await this.prisma.stockTransfer.findMany({
      where: { OR: [{ fromLocationId: id }, { toLocationId: id }] },
      include: { lines: true, from: { select: { id: true, name: true } }, to: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }, take: 20,
    });
    const transferred = await this.prisma.stockTransferLine.groupBy({
      by: ['transferId'], _sum: { qty: true },
      where: { transfer: { createdAt: { gte: from, lte: to }, OR: [{ fromLocationId: id }, { toLocationId: id }] } },
    });
    const inOut = await this.prisma.stockTransfer.findMany({
      where: { id: { in: transferred.map(t => t.transferId) } }, select: { id: true, toLocationId: true },
    });
    const qtyOf = new Map(transferred.map(t => [t.transferId, t._sum.qty ?? 0]));
    const unitsIn = inOut.filter(t => t.toLocationId === id).reduce((n, t) => n + (qtyOf.get(t.id) ?? 0), 0);
    const unitsOut = inOut.filter(t => t.toLocationId !== id).reduce((n, t) => n + (qtyOf.get(t.id) ?? 0), 0);

    return {
      location: loc,
      range: { from: from.toISOString(), to: to.toISOString(), previousFrom: prevFrom.toISOString(), previousTo: prevTo.toISOString() },
      sales: {
        revenue, orders, units: posUnits,
        avgOrder: orders > 0 ? Math.round(revenue / orders) : 0,
        pos: { revenue: posRevenue, orders: sales.length, units: posUnits },
        dealpos: { revenue: dpRevenue, orders: dpOrders },
        previousRevenue: prevRevenue,
        changePct: pctChange(revenue, prevRevenue),
        ...commissionSplit(revenue, loc.kind === LocationKind.CONSIGNMENT ? loc.commissionPct : 0),
      },
      sellThroughPct: sellThrough(posUnits, stats.units),
      stock: stats,
      movement: { unitsIn, unitsOut },
      daily: [...series.values()],
      topSellers: [...top.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 10),
      transfers,
    };
  }

  async create(dto: CreateLocationDto) {
    return this.prisma.location.create({ data: dto });
  }

  async update(id: string, dto: UpdateLocationDto) {
    await this.findOne(id);
    return this.prisma.location.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    const [held, moved, sold] = await Promise.all([
      this.prisma.locationStock.aggregate({ where: { locationId: id }, _sum: { qty: true } }),
      this.prisma.stockTransfer.count({ where: { OR: [{ fromLocationId: id }, { toLocationId: id }] } }),
      this.prisma.posSale.count({ where: { locationId: id } }),
    ]);
    if ((held._sum.qty ?? 0) > 0) throw new ConflictException('This location still holds stock. Move it back first.');
    if (moved > 0 || sold > 0) throw new ConflictException('This location has stock moves or sales on record. Set it inactive instead of removing it.');
    await this.prisma.locationStock.deleteMany({ where: { locationId: id } });
    return this.prisma.location.delete({ where: { id } });
  }

  async findOne(id: string) {
    const loc = await this.prisma.location.findUnique({ where: { id } });
    if (!loc) throw new NotFoundException('Location not found');
    return loc;
  }
}
