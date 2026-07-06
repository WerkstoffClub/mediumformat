import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationKind, StoreLocation, Prisma, type Location } from '@prisma/client';

interface LocationStats { items: number; units: number; shelves: number; lowStock: number; }
interface EventSales { revenue: number; orders: number; avgOrder: number; }
export type LocationWithStats = Location & { stats: LocationStats; sales?: EventSales };

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

  /** Inventory rollups per StoreLocation enum, computed once and attached to
   *  locations that link to a physical store. Events/consignment without an
   *  enum link report zeroes until sales attribution is wired. */
  private async statsByStore(): Promise<Map<StoreLocation, LocationStats>> {
    const rows = await this.prisma.release.findMany({
      select: { storeLocation: true, stock: true, lowStockThreshold: true, shelfLocation: true },
    });
    const map = new Map<StoreLocation, LocationStats & { shelfSet: Set<string> }>();
    for (const r of rows) {
      const s = map.get(r.storeLocation) ?? { items: 0, units: 0, shelves: 0, lowStock: 0, shelfSet: new Set<string>() };
      s.items += 1;
      s.units += r.stock;
      if (r.stock > 0 && r.stock <= r.lowStockThreshold) s.lowStock += 1;
      if (r.shelfLocation) s.shelfSet.add(r.shelfLocation);
      map.set(r.storeLocation, s);
    }
    const out = new Map<StoreLocation, LocationStats>();
    for (const [k, v] of map) out.set(k, { items: v.items, units: v.units, shelves: v.shelfSet.size, lowStock: v.lowStock });
    return out;
  }

  /** Sales each event took, from the DealPOS mirror, in a SINGLE query (no
   *  N+1). Each event is scoped to its run window (start–end, end-of-day
   *  inclusive) and, when set, its matchKey — matched as a substring on the
   *  channel tag / outlet, but as an EXACT case-insensitive name on
   *  customerName so a short/common key can't sweep up unrelated customers.
   *  Events with neither a date nor a matchKey report zero (never all-invoices). */
  private async eventSalesBatch(events: Location[]): Promise<Map<string, EventSales>> {
    const zero: EventSales = { revenue: 0, orders: 0, avgOrder: 0 };
    const out = new Map<string, EventSales>();
    for (const e of events) out.set(e.id, zero);

    const usable = events.filter(e => e.startDate || e.endDate || e.matchKey);
    if (usable.length === 0) return out;

    const rows = usable.map(e => {
      const endExcl = e.endDate ? new Date(e.endDate.getTime() + 86_400_000) : null; // end-of-day inclusive
      return Prisma.sql`(${e.id}::text, ${e.startDate}::timestamptz, ${endExcl}::timestamptz, ${e.matchKey}::text)`;
    });

    const agg = await this.prisma.$queryRaw<Array<{ id: string; revenue: unknown; orders: bigint }>>`
      SELECT e.id,
             COALESCE(SUM(i."amount"), 0) AS revenue,
             COUNT(i."id")                AS orders
      FROM (VALUES ${Prisma.join(rows)}) AS e(id, start_at, end_at, match_key)
      LEFT JOIN "DpInvoice" i
        ON i."isVoid" = false
       AND (e.start_at IS NULL OR i."date" >= e.start_at)
       AND (e.end_at   IS NULL OR i."date" <  e.end_at)
       AND (
         e.match_key IS NULL
         OR i."tag"    ILIKE '%' || e.match_key || '%'
         OR i."outlet" ILIKE '%' || e.match_key || '%'
         OR lower(btrim(i."customerName")) = lower(btrim(e.match_key))
       )
      GROUP BY e.id`;

    for (const r of agg) {
      const revenue = Number(r.revenue);
      const orders = Number(r.orders);
      out.set(r.id, { revenue, orders, avgOrder: orders > 0 ? Math.round(revenue / orders) : 0 });
    }
    return out;
  }

  async findAll(): Promise<LocationWithStats[]> {
    await this.ensureSeeded();
    const [locations, stats] = await Promise.all([
      this.prisma.location.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      this.statsByStore(),
    ]);

    const events = locations.filter(l => l.kind === LocationKind.TEMPORARY);
    const salesById = events.length ? await this.eventSalesBatch(events) : new Map<string, EventSales>();

    return locations.map(l => {
      const s = l.storeLocation ? stats.get(l.storeLocation) : undefined;
      return {
        ...l,
        stats: s ?? { items: 0, units: 0, shelves: l.shelves.length, lowStock: 0 },
        ...(l.kind === LocationKind.TEMPORARY ? { sales: salesById.get(l.id) } : {}),
      };
    });
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
    return this.prisma.location.delete({ where: { id } });
  }

  private async findOne(id: string) {
    const loc = await this.prisma.location.findUnique({ where: { id } });
    if (!loc) throw new NotFoundException('Location not found');
    return loc;
  }
}
