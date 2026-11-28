import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { availableAt, homeLocationId, mergeLines, transferNumber, type HomeCandidate } from './location-stock';

type Tx = Prisma.TransactionClient;
export interface StockLine { releaseId: string; qty: number }

@Injectable()
export class LocationStockService {
  constructor(private prisma: PrismaService) {}

  private async candidates(tx: Tx): Promise<HomeCandidate[]> {
    return tx.location.findMany({ select: { id: true, kind: true, storeLocation: true, sortOrder: true, active: true } });
  }

  /**
   * Lock the releases, then check every line is available at `locationId`
   * (null = each release's home). Returns per-release info for the caller.
   */
  private async lockAndCheck(tx: Tx, locationId: string | null, lines: Map<string, number>) {
    const ids = [...lines.keys()];
    if (ids.length === 0) return new Map<string, { homeId: string | null; artist: string; title: string }>();
    await tx.$queryRaw`SELECT id FROM "Release" WHERE id IN (${Prisma.join(ids)}) FOR UPDATE`;
    const [releases, rows, locs] = await Promise.all([
      tx.release.findMany({ where: { id: { in: ids } }, select: { id: true, artist: true, title: true, stock: true, storeLocation: true } }),
      tx.locationStock.findMany({ where: { releaseId: { in: ids }, qty: { not: 0 } }, select: { releaseId: true, locationId: true, qty: true } }),
      this.candidates(tx),
    ]);
    const byId = new Map(releases.map(r => [r.id, r]));
    const info = new Map<string, { homeId: string | null; artist: string; title: string }>();
    for (const [id, qty] of lines) {
      const r = byId.get(id);
      if (!r) throw new NotFoundException('An item is no longer in the catalogue.');
      const homeId = homeLocationId(r.storeLocation, locs);
      const away = rows.filter(x => x.releaseId === id && x.locationId !== homeId);
      // No location given = the item's home; with no locations set up at all, home is
      // simply "not away", so the sale draws on the total minus what is elsewhere.
      const avail = locationId
        ? availableAt(locationId, homeId, r.stock, away)
        : Math.max(0, r.stock - away.reduce((n, x) => n + Math.max(0, x.qty), 0));
      if (qty > avail) {
        throw new ConflictException(`Only ${avail} of ${r.artist} — ${r.title} at this location.`);
      }
      info.set(id, { homeId, artist: r.artist, title: r.title });
    }
    return info;
  }

  /** Remove units from a location (null = home). Home stock is implicit, so only away rows change. */
  async take(tx: Tx, locationId: string | null, lines: StockLine[]) {
    const merged = mergeLines(lines);
    const info = await this.lockAndCheck(tx, locationId, merged);
    for (const [releaseId, qty] of merged) {
      const at = locationId ?? info.get(releaseId)!.homeId;
      if (at && at !== info.get(releaseId)!.homeId) {
        await tx.locationStock.update({
          where: { locationId_releaseId: { locationId: at, releaseId } },
          data: { qty: { decrement: qty } },
        });
      }
    }
    return info;
  }

  /** Add units to a location (null = home). */
  async put(tx: Tx, locationId: string | null, lines: StockLine[]) {
    const merged = mergeLines(lines);
    const ids = [...merged.keys()];
    if (!locationId || ids.length === 0) return;
    const [releases, locs] = await Promise.all([
      tx.release.findMany({ where: { id: { in: ids } }, select: { id: true, storeLocation: true } }),
      this.candidates(tx),
    ]);
    for (const r of releases) {
      if (homeLocationId(r.storeLocation, locs) === locationId) continue; // home is implicit
      const qty = merged.get(r.id)!;
      await tx.locationStock.upsert({
        where: { locationId_releaseId: { locationId, releaseId: r.id } },
        create: { locationId, releaseId: r.id, qty },
        update: { qty: { increment: qty } },
      });
    }
  }

  /** Move stock directly between two locations and record the transfer. */
  async transfer(input: { fromLocationId: string; toLocationId: string; lines: StockLine[]; note?: string }, userId: string | null) {
    if (input.fromLocationId === input.toLocationId) throw new BadRequestException('Pick two different locations.');
    return this.prisma.$transaction(async tx => {
      const [from, to] = await Promise.all([
        tx.location.findUnique({ where: { id: input.fromLocationId } }),
        tx.location.findUnique({ where: { id: input.toLocationId } }),
      ]);
      if (!from || !to) throw new NotFoundException('Location not found');
      if (!to.active) throw new BadRequestException(`${to.name} is inactive. Activate it before moving stock there.`);
      const info = await this.take(tx, from.id, input.lines);
      await this.put(tx, to.id, input.lines);
      const merged = mergeLines(input.lines);
      return tx.stockTransfer.create({
        data: {
          number: transferNumber(new Date()),
          fromLocationId: from.id,
          toLocationId: to.id,
          note: input.note?.trim() || null,
          createdById: userId,
          lines: {
            create: [...merged].map(([releaseId, qty]) => ({ releaseId, qty, artist: info.get(releaseId)!.artist, title: info.get(releaseId)!.title })),
          },
        },
        include: { lines: true, from: { select: { id: true, name: true } }, to: { select: { id: true, name: true } } },
      });
    });
  }

  async transfers(locationId?: string, limit = 50) {
    return this.prisma.stockTransfer.findMany({
      where: locationId ? { OR: [{ fromLocationId: locationId }, { toLocationId: locationId }] } : {},
      include: { lines: true, from: { select: { id: true, name: true } }, to: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, limit),
    });
  }

  /**
   * Releases with their quantity at a location. For a home location the quantity
   * is derived; elsewhere it is the away row. `inStock` keeps only qty > 0.
   */
  async stockAt(locationId: string, opts: { q?: string; limit?: number; inStock?: boolean } = {}) {
    const loc = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!loc) throw new NotFoundException('Location not found');
    const locs = await this.candidates(this.prisma);
    const homeFor = new Set(
      (['MAIN_STORE', 'WAREHOUSE', 'CONSIGNMENT'] as const).filter(s => homeLocationId(s, locs) === locationId),
    );
    const limit = Math.min(200, opts.limit ?? 60);
    const q = opts.q?.trim();
    const search: Prisma.ReleaseWhereInput = q ? {
      OR: [
        { artist: { contains: q, mode: 'insensitive' } }, { title: { contains: q, mode: 'insensitive' } },
        { catNumber: { contains: q, mode: 'insensitive' } }, { barcode: { contains: q } },
      ],
    } : {};
    const where: Prisma.ReleaseWhereInput = homeFor.size
      ? { AND: [search, { OR: [{ storeLocation: { in: [...homeFor] } }, { locationStock: { some: { locationId, qty: { gt: 0 } } } }] }] }
      : { AND: [search, { locationStock: { some: { locationId, qty: { gt: 0 } } } }] };
    const releases = await this.prisma.release.findMany({
      where, orderBy: [{ artist: 'asc' }, { title: 'asc' }], take: opts.inStock ? limit * 3 : limit,
      include: { locationStock: { where: { qty: { not: 0 } }, select: { locationId: true, qty: true } } },
    });
    const rows = releases.map(({ locationStock, ...r }) => {
      const homeId = homeLocationId(r.storeLocation, locs);
      const away = locationStock.filter(x => x.locationId !== homeId);
      return { ...r, locationQty: availableAt(locationId, homeId, r.stock, away) };
    });
    return (opts.inStock ? rows.filter(r => r.locationQty > 0) : rows).slice(0, limit);
  }
}
