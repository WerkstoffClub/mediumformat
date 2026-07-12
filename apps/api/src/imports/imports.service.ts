import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import {
  ImportAttachmentKind, ImportLineMatchStatus, ImportOrigin, ImportStatus, PaymentMethod, Prisma,
  RecordCondition, ReimbursementStatus, SalesChannel,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateImportDto } from './dto/create-import.dto';
import { ImportFilterDto } from './dto/import-filter.dto';
import { UpdateChannelPricingDto } from './dto/update-channel-pricing.dto';
import { FxService } from './pricing/fx.service';
import {
  DEFAULT_TARGET_MARKUP, allocateByWeight, channelPrice, landedCostPerUnitIdr,
} from './pricing/pricing';
import { MatchService } from './matching/match.service';
import { DiscogsService } from './matching/discogs.service';

/** Fallback markup applied to landed cost when a line has no WEBSITE channel
 *  price to draw from (channel prices should normally exist post-price()). */
const NO_CHANNEL_PRICE_MARKUP = 2.2;

/** Duck-types a Prisma unique-constraint violation (P2002), mirroring the
 *  check used in storefront.service.ts rather than importing the Prisma
 *  error class directly. */
function isUniqueConstraintError(e: unknown): e is { code: 'P2002'; meta?: { target?: string[] } } {
  return typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 'P2002';
}

@Injectable()
export class ImportsService {
  constructor(
    private prisma: PrismaService,
    private fx: FxService,
    private matcher: MatchService,
    private discogs: DiscogsService,
  ) {}

  private uploadsRoot(): string {
    return process.env.UPLOADS_DIR ?? '.uploads';
  }

  private async nextImportNumber(): Promise<string> {
    const count = await this.prisma.importOrder.count();
    return `MF-I${String(count + 1).padStart(3, '0')}`;
  }

  async create(body: CreateImportDto) {
    const number = await this.nextImportNumber();
    const subtotalNative = body.lines.reduce((s, l) => s + l.extendedNative, 0);
    const reimbursementStatus: ReimbursementStatus =
      body.paymentMethod === PaymentMethod.CREDIT_CARD
        ? ReimbursementStatus.PENDING
        : ReimbursementStatus.NOT_REQUIRED;

    const linesInput = body.lines.map((l, idx) => ({
      lineNo: idx + 1,
      artist: l.artist,
      title: l.title,
      label: l.label,
      catNumber: l.catNumber,
      barcode: l.barcode,
      formatRaw: l.formatRaw,
      format: l.format,
      edition: l.edition,
      qty: l.qty,
      qtyBackorder: l.qtyBackorder ?? 0,
      unitPriceNative: l.unitPriceNative,
      extendedNative: l.extendedNative,
      weightKg: l.weightKg ?? 0,
    }));

    return this.prisma.importOrder.create({
      data: {
        number,
        vendorName: body.vendorName,
        origin: body.origin,
        currency: body.currency,
        orderDate: new Date(body.orderDate),
        ...(body.fxRate !== undefined ? { fxRate: body.fxRate } : {}),
        fxRateSource: body.fxRateSource,
        vendorShippingNative: body.vendorShippingNative ?? 0,
        paymentMethod: body.paymentMethod,
        paidBy: body.paidBy,
        reimbursementStatus,
        status: ImportStatus.SUBMITTED,
        subtotalNative,
        notes: body.notes,
        lines: { create: linesInput },
      },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    });
  }

  async findAll(f: ImportFilterDto) {
    const page = Math.max(1, Number(f.page ?? 1));
    const limit = Math.min(100, Number(f.limit ?? 25));
    const where: Prisma.ImportOrderWhereInput = {};
    if (f.status) where.status = f.status as ImportStatus;
    if (f.origin) where.origin = f.origin as ImportOrigin;
    if (f.q) {
      where.OR = [
        { number:     { contains: f.q, mode: 'insensitive' } },
        { vendorName: { contains: f.q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.importOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          number: true,
          vendorName: true,
          origin: true,
          currency: true,
          orderDate: true,
          status: true,
          paymentMethod: true,
          reimbursementStatus: true,
          subtotalNative: true,
          createdAt: true,
          _count: { select: { lines: true } },
        },
      }),
      this.prisma.importOrder.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const order = await this.prisma.importOrder.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { lineNo: 'asc' },
          include: { channelPrices: { orderBy: { channel: 'asc' } } },
        },
        attachments: true,
        consolidation: true,
      },
    });
    if (!order) throw new NotFoundException('Import order not found');
    return order;
  }

  private async ensureImportExists(id: string): Promise<void> {
    const exists = await this.prisma.importOrder.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Import order not found');
  }

  /** Persist an uploaded attachment file to disk (outside the public /uploads
   *  static dir, since invoices/payment proofs are not public) and record it. */
  async addAttachment(importId: string, kind: ImportAttachmentKind, file: Express.Multer.File) {
    await this.ensureImportExists(importId);
    const dir = path.join(this.uploadsRoot(), 'imports', importId);
    await fs.mkdir(dir, { recursive: true });
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${crypto.randomUUID()}${ext}`;
    await fs.writeFile(path.join(dir, filename), file.buffer);
    const fileUrl = path.join('imports', importId, filename);
    return this.prisma.importAttachment.create({
      data: {
        importOrderId: importId,
        kind,
        fileUrl,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
  }

  async getAttachmentFile(importId: string, attachmentId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const attachment = await this.prisma.importAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.importOrderId !== importId) {
      throw new NotFoundException('Attachment not found');
    }
    const absPath = path.join(this.uploadsRoot(), attachment.fileUrl);
    const buffer = await fs.readFile(absPath);
    return { buffer, mimeType: attachment.mimeType ?? 'application/octet-stream' };
  }

  /** Runs the pricing engine for an import: resolves FX, allocates vendor
   *  shipping across lines by weight, computes per-unit landed cost, and
   *  (re)computes channel list prices — preserving any manually overridden
   *  channel prices. Marks the order PRICED. */
  async price(id: string) {
    const order = await this.prisma.importOrder.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: 'asc' } }, consolidation: true },
    });
    if (!order) throw new NotFoundException('Import order not found');

    const orderDateStr = order.orderDate.toISOString().slice(0, 10);

    let fxRate = Number(order.fxRate);
    let fxRateSource = order.fxRateSource;
    let fxWasResolved = false;
    if (!order.fxRateManual && fxRate <= 1) {
      const resolved = await this.fx.getRate(order.currency, orderDateStr);
      fxRate = resolved.rate;
      fxRateSource = resolved.source;
      fxWasResolved = true;
    }
    const usdIdrRate = await this.fx.getUsdIdr(orderDateStr);

    const vendorShippingIdr = Number(order.vendorShippingNative) * fxRate;
    const weights = order.lines.map(l => Number(l.weightKg) * l.qty);
    const allocatedShip = allocateByWeight(weights, vendorShippingIdr);

    const channelConfigs = await this.prisma.channelPricingConfig.findMany({ where: { active: true } });

    const existingPrices = await this.prisma.importLineChannelPrice.findMany({
      where: { lineItemId: { in: order.lines.map(l => l.id) }, overridden: true },
      select: { lineItemId: true, channel: true },
    });
    const overriddenKeys = new Set(existingPrices.map(p => `${p.lineItemId}:${p.channel}`));

    await this.prisma.$transaction(async (tx) => {
      if (fxWasResolved) {
        await tx.importOrder.update({
          where: { id },
          data: { fxRate, fxRateSource },
        });
      }

      for (let i = 0; i < order.lines.length; i++) {
        const line = order.lines[i];
        const allocatedVendorShipIdr = allocatedShip[i];
        const allocatedForwarderIdr = Number(line.allocatedForwarderIdr);
        const landedCostIdr = landedCostPerUnitIdr(
          Number(line.unitPriceNative), fxRate, allocatedVendorShipIdr, allocatedForwarderIdr, line.qty,
        );

        await tx.importOrderLine.update({
          where: { id: line.id },
          data: { allocatedVendorShipIdr, landedCostIdr },
        });

        for (const cfg of channelConfigs) {
          if (overriddenKeys.has(`${line.id}:${cfg.channel}`)) continue;
          const feePct = Number(cfg.feePct);
          const price = channelPrice(
            landedCostIdr,
            { feePct, rounding: cfg.rounding, currency: cfg.currency },
            DEFAULT_TARGET_MARKUP,
            usdIdrRate,
          );
          await tx.importLineChannelPrice.upsert({
            where: { lineItemId_channel: { lineItemId: line.id, channel: cfg.channel } },
            create: {
              lineItemId: line.id,
              channel: cfg.channel,
              currency: cfg.currency,
              price,
              feePctApplied: feePct,
            },
            update: {
              currency: cfg.currency,
              price,
              feePctApplied: feePct,
            },
          });
        }
      }

      await tx.importOrder.update({ where: { id }, data: { status: ImportStatus.PRICED } });
    });

    return this.findOne(id);
  }

  /** Preview matching: resolves every line against the catalog and persists
   *  the result, but makes no inventory writes. Safe to re-run any number of
   *  times before committing. */
  async match(id: string) {
    const order = await this.prisma.importOrder.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Import order not found');

    for (const line of order.lines) {
      const result = await this.matcher.matchLine(line);
      await this.prisma.importOrderLine.update({
        where: { id: line.id },
        data: { releaseId: result.releaseId, matchStatus: result.matchStatus },
      });
    }

    return this.findOne(id);
  }

  /** Commits a PRICED import: matches any not-yet-matched line, then in a
   *  single transaction updates stock/cost/price on matched Releases,
   *  creates draft Releases (optionally Discogs-enriched) for new/ambiguous
   *  lines, and upserts per-channel prices from the priced import lines. */
  async commit(id: string) {
    const order = await this.prisma.importOrder.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { lineNo: 'asc' },
          include: { channelPrices: true },
        },
      },
    });
    if (!order) throw new NotFoundException('Import order not found');
    if (order.status !== ImportStatus.PRICED) {
      throw new BadRequestException('Import must be priced before committing');
    }

    // Resolve matches for any line that isn't already MATCHED before opening
    // the transaction — matchLine only reads, so this is safe up front.
    const resolved = new Map<string, { releaseId: string | null; matchStatus: ImportLineMatchStatus }>();
    for (const line of order.lines) {
      if (line.matchStatus === ImportLineMatchStatus.MATCHED && line.releaseId) {
        resolved.set(line.id, { releaseId: line.releaseId, matchStatus: line.matchStatus });
      } else {
        resolved.set(line.id, await this.matcher.matchLine(line));
      }
    }

    let created = 0;
    let updated = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const line of order.lines) {
        const match = resolved.get(line.id)!;
        let releaseId = match.releaseId;
        let matchStatus = match.matchStatus;
        let createdRelease = false;

        const landedCostIdr = Math.round(Number(line.landedCostIdr));
        const websitePrice = line.channelPrices.find(p => p.channel === SalesChannel.WEBSITE);
        const websitePriceIdr = websitePrice ? Math.round(Number(websitePrice.price)) : undefined;

        if (matchStatus === ImportLineMatchStatus.MATCHED && releaseId) {
          await tx.release.update({
            where: { id: releaseId },
            data: {
              stock: { increment: line.qty },
              costIdr: landedCostIdr,
              ...(websitePriceIdr !== undefined ? { priceIdr: websitePriceIdr } : {}),
            },
          });
          updated++;
        } else {
          const enrich = await this.discogs.lookup({
            barcode: line.barcode,
            catNumber: line.catNumber,
            artist: line.artist,
            title: line.title,
            format: line.format,
          });

          const priceIdr = websitePriceIdr ?? Math.round(landedCostIdr * NO_CHANNEL_PRICE_MARKUP);
          const releaseData = {
            artist: line.artist,
            title: line.title,
            label: line.label ?? undefined,
            catNumber: line.catNumber ?? undefined,
            barcode: (enrich?.barcode ?? line.barcode) || undefined,
            format: line.format,
            condition: RecordCondition.M,
            priceIdr,
            stock: line.qty,
            costIdr: landedCostIdr,
            discogsId: enrich?.discogsId,
            genre: enrich?.genre,
            year: enrich?.year,
            imageUrl: enrich?.imageUrl,
          };

          try {
            const release = await tx.release.create({ data: releaseData });
            releaseId = release.id;
            createdRelease = true;
            created++;
          } catch (e: unknown) {
            if (!isUniqueConstraintError(e)) throw e;
            const target = e.meta?.target ?? [];
            const conflictField = target.includes('barcode')
              ? 'barcode'
              : target.includes('discogsId') ? 'discogsId' : null;
            const conflictValue = conflictField
              ? (releaseData as Record<string, unknown>)[conflictField] as string | undefined
              : undefined;
            if (!conflictField || !conflictValue) throw e;

            const existing = await tx.release.findFirst({ where: { [conflictField]: conflictValue } });
            if (!existing) throw e;

            await tx.release.update({
              where: { id: existing.id },
              data: {
                stock: { increment: line.qty },
                costIdr: landedCostIdr,
                ...(websitePriceIdr !== undefined ? { priceIdr: websitePriceIdr } : {}),
              },
            });
            releaseId = existing.id;
            matchStatus = ImportLineMatchStatus.MATCHED;
            updated++;
          }
        }

        for (const cp of line.channelPrices) {
          await tx.releaseChannelPrice.upsert({
            where: { releaseId_channel: { releaseId: releaseId!, channel: cp.channel } },
            create: {
              releaseId: releaseId!,
              channel: cp.channel,
              currency: cp.currency,
              price: cp.price,
            },
            update: {
              currency: cp.currency,
              price: cp.price,
            },
          });
        }

        await tx.importOrderLine.update({
          where: { id: line.id },
          data: { releaseId, matchStatus, createdRelease },
        });
      }

      await tx.importOrder.update({ where: { id }, data: { status: ImportStatus.INVENTORY_UPDATED } });
    });

    return { created, updated, importOrder: await this.findOne(id) };
  }

  async listChannelPricing() {
    return this.prisma.channelPricingConfig.findMany({ orderBy: { channel: 'asc' } });
  }

  async updateChannelPricing(channel: SalesChannel, body: UpdateChannelPricingDto) {
    return this.prisma.channelPricingConfig.upsert({
      where: { channel },
      create: {
        channel,
        feePct: body.feePct ?? 0,
        rounding: body.rounding ?? 'NEAREST_1000',
        currency: body.currency ?? 'IDR',
        active: body.active ?? true,
      },
      update: {
        ...(body.feePct !== undefined ? { feePct: body.feePct } : {}),
        ...(body.rounding !== undefined ? { rounding: body.rounding } : {}),
        ...(body.currency !== undefined ? { currency: body.currency } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });
  }
}
