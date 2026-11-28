import {
  BadGatewayException, BadRequestException, ConflictException, Injectable, Logger,
  NotFoundException, NotImplementedException,
} from '@nestjs/common';
import { Prisma, PosSaleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { validateVoucher } from '../vouchers/vouchers.validator';
import { priceLines } from '../web-orders/web-order.pricing';
import { ConsignmentReportDto, CreatePosSaleDto, PosSaleFilterDto } from './dto/create-pos-sale.dto';
import { posSaleNumber, saleTotals } from './pos-sale.pricing';
import { LocationStockService } from '../locations/location-stock.service';
import { XenditClient, XenditInvoiceEvent } from './xendit.client';

const SALE_INCLUDE = { lines: true, payments: { orderBy: { createdAt: 'asc' } } } satisfies Prisma.PosSaleInclude;

@Injectable()
export class PosSalesService {
  private readonly logger = new Logger(PosSalesService.name);

  constructor(private prisma: PrismaService, private xendit: XenditClient, private stock: LocationStockService) {}

  /**
   * Record a till sale in the MF database. Prices, voucher, discount and PPN are
   * resolved server-side; stock is taken at once (for Xendit it is held until the
   * invoice is paid or expires). Cash, EDC and DealPOS methods are PAID on create;
   * Xendit starts PENDING and is settled by the invoice webhook.
   */
  async create(dto: CreatePosSaleDto, cashierId: string | null, opts: { noTax?: boolean; soldAt?: Date } = {}) {
    const p = dto.payment;
    const locationId = dto.locationId ?? null;
    if (locationId && !(await this.prisma.location.findUnique({ where: { id: locationId } }))) {
      throw new BadRequestException('Unknown sale location.');
    }
    if (p.method === 'XENDIT' && !this.xendit.configured) {
      throw new NotImplementedException('Xendit is not configured yet (XENDIT_SECRET_KEY, XENDIT_CALLBACK_TOKEN).');
    }

    const sale = await this.prisma.$transaction(async tx => {
      const ids = [...new Set(dto.lines.map(l => l.releaseId))];
      const releases = await tx.release.findMany({
        where: { id: { in: ids } },
        select: { id: true, artist: true, title: true, format: true, priceIdr: true, stock: true },
      });
      const priced = priceLines(dto.lines, releases);
      if (!priced.ok) throw new ConflictException(priced.error);

      let voucherCode: string | null = null;
      let voucherDiscount: number | null = null;
      const code = dto.voucherCode?.trim().toUpperCase();
      if (code) {
        const v = await tx.voucher.findUnique({ where: { code } });
        const res = v ? validateVoucher(v, priced.subtotalIdr) : null;
        if (!v || !res?.valid) throw new BadRequestException('Voucher code is not valid for this sale.');
        voucherCode = code;
        voucherDiscount = res.discountIdr;
        await tx.voucher.update({ where: { code }, data: { usageCount: { increment: 1 } } });
      }
      const base = saleTotals(priced.subtotalIdr, voucherCode ? null : dto.discount, voucherDiscount);
      // A consignment report records the partner's retail sales: no PPN is added on top.
      const totals = opts.noTax ? { ...base, taxIdr: 0, totalIdr: base.subtotalIdr - base.discountIdr } : base;

      if (p.method === 'CASH' && (p.tenderedIdr ?? 0) < totals.totalIdr) {
        throw new BadRequestException('Cash tendered is less than the total.');
      }

      // Take the units from the sale's location (null = each item's home); this
      // locks the releases and refuses more than that location holds.
      await this.stock.take(tx, locationId, priced.lines.map(l => ({ releaseId: l.id, qty: l.qty })));
      for (const l of priced.lines) {
        const { count } = await tx.release.updateMany({
          where: { id: l.id, stock: { gte: l.qty } },
          data: { stock: { decrement: l.qty } },
        });
        if (count !== 1) throw new ConflictException(`${l.artist} — ${l.title} just sold out.`);
      }

      const now = opts.soldAt ?? new Date();
      const paidNow = p.method !== 'XENDIT';
      const number = posSaleNumber(now);
      return tx.posSale.create({
        data: {
          number,
          status: paidNow ? 'PAID' : 'PENDING',
          cashierId,
          locationId,
          customerName: dto.customer?.name?.trim() || null,
          customerPhone: dto.customer?.phone?.trim() || null,
          customerEmail: dto.customer?.email?.trim().toLowerCase() || null,
          discountKind: voucherCode ? null : dto.discount?.kind ?? null,
          discountValue: voucherCode ? null : dto.discount?.value ?? null,
          voucherCode,
          ...totals,
          paidAt: paidNow ? now : null,
          lines: {
            create: priced.lines.map(l => ({
              releaseId: l.id, artist: l.artist, title: l.title,
              format: l.format as Prisma.PosSaleLineCreateWithoutSaleInput['format'],
              unitPriceIdr: l.priceIdr, qty: l.qty,
            })),
          },
          payments: {
            create: {
              method: p.method,
              status: paidNow ? 'PAID' : 'PENDING',
              amountIdr: totals.totalIdr,
              paidAt: paidNow ? now : null,
              ...(p.method === 'CASH' ? { tenderedIdr: p.tenderedIdr, changeIdr: (p.tenderedIdr ?? 0) - totals.totalIdr } : {}),
              ...(p.method === 'EDC' ? {
                edcBank: p.edcBank, edcApprovalCode: p.approvalCode, edcRrn: p.rrn || null,
                cardLast4: p.cardLast4 || null, cardScheme: p.cardScheme || null,
              } : {}),
              ...(p.method === 'XENDIT' ? { xenditExternalId: number, xenditChannel: p.channel } : {}),
              ...(p.method === 'OTHER' ? { otherMethodName: p.otherMethodName } : {}),
            },
          },
        },
        include: SALE_INCLUDE,
      });
    });

    if (p.method !== 'XENDIT') return sale;

    // Outside the transaction: never hold DB locks across an HTTP call.
    const payment = sale.payments[0];
    try {
      const inv = await this.xendit.createInvoice({
        externalId: sale.number,
        amountIdr: sale.totalIdr,
        description: `Medium Format ${sale.number}`,
        channel: p.channel!,
        ewallet: p.ewallet,
        customer: { name: sale.customerName, email: sale.customerEmail, phone: sale.customerPhone },
      });
      await this.prisma.posPayment.update({
        where: { id: payment.id },
        data: { xenditInvoiceId: inv.id, xenditInvoiceUrl: inv.invoiceUrl, expiresAt: inv.expiresAt },
      });
    } catch (err) {
      this.logger.error(`Xendit invoice for ${sale.number} failed: ${err instanceof Error ? err.message : err}`);
      await this.release(sale.id, 'VOIDED');
      throw new BadGatewayException('Xendit did not create the payment. The sale was cancelled; try again or use another method.');
    }
    return this.findOne(sale.id);
  }

  async findOne(id: string) {
    const sale = await this.prisma.posSale.findUnique({ where: { id }, include: SALE_INCLUDE });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async findAll(f: PosSaleFilterDto) {
    const page = f.page ?? 1;
    const limit = f.limit ?? 25;
    const where: Prisma.PosSaleWhereInput = {};
    if (f.status) where.status = f.status as PosSaleStatus;
    if (f.q?.trim()) {
      const q = f.q.trim();
      where.OR = [
        { number: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.posSale.findMany({ where, include: SALE_INCLUDE, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.posSale.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  /**
   * Record what a consignment partner (or an event without a till) sold: a PAID
   * sale at that location, at retail price, without PPN on top. Stock comes off
   * that location.
   */
  async consignmentReport(dto: ConsignmentReportDto, cashierId: string | null) {
    const loc = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
    if (!loc) throw new NotFoundException('Location not found');
    const soldAt = dto.soldAt ? new Date(dto.soldAt) : undefined;
    if (soldAt && soldAt.getTime() > Date.now() + 60_000) throw new BadRequestException('The sale date is in the future.');
    return this.create({
      lines: dto.lines,
      locationId: loc.id,
      payment: { method: 'OTHER', otherMethodName: `Sales report · ${loc.name}` },
    } as CreatePosSaleDto, cashierId, { noTax: true, soldAt });
  }

  /** Staff: cancel a sale and return its stock. A Xendit payment already received must be refunded in Xendit first. */
  async void(id: string) {
    const sale = await this.findOne(id);
    if (sale.status === 'VOIDED' || sale.status === 'EXPIRED') return sale;
    const paidOnline = sale.payments.some(p => p.method === 'XENDIT' && p.status === 'PAID');
    if (paidOnline) throw new BadRequestException('This sale was paid through Xendit. Refund it in the Xendit dashboard first.');
    const pendingInvoice = sale.payments.find(p => p.method === 'XENDIT' && p.status === 'PENDING' && p.xenditInvoiceId);
    const voided = await this.release(id, 'VOIDED');
    if (pendingInvoice?.xenditInvoiceId) await this.xendit.expireInvoice(pendingInvoice.xenditInvoiceId);
    return voided;
  }

  /** Xendit invoice webhook. Idempotent; unknown invoices are ignored. */
  async handleInvoiceEvent(ev: XenditInvoiceEvent) {
    const payment = await this.prisma.posPayment.findFirst({
      where: { OR: [{ xenditExternalId: ev.externalId }, { xenditInvoiceId: ev.invoiceId }] },
      include: { sale: true },
    });
    if (!payment) return { handled: false };

    if (ev.status === 'PAID' && payment.status !== 'PAID') {
      const paidAt = ev.paidAt ?? new Date();
      await this.prisma.$transaction(async tx => {
        await tx.posPayment.update({
          where: { id: payment.id },
          data: { status: 'PAID', paidAt, xenditInvoiceId: ev.invoiceId, xenditPaidMethod: ev.paidMethod },
        });
        if (payment.sale.status === 'PENDING') {
          await tx.posSale.update({ where: { id: payment.saleId }, data: { status: 'PAID', paidAt } });
        }
      });
      if (payment.sale.status !== 'PENDING') {
        // Paid after the sale was voided/expired: money arrived but stock was returned.
        this.logger.warn(`Xendit paid ${payment.sale.number} after it was ${payment.sale.status}; refund or re-sell manually.`);
      }
    } else if (ev.status === 'EXPIRED' && payment.status === 'PENDING' && payment.sale.status === 'PENDING') {
      await this.release(payment.saleId, 'EXPIRED');
    }
    return { handled: true };
  }

  /** End a sale (VOIDED / EXPIRED): return stock and close its open payments, once. */
  private async release(id: string, status: 'VOIDED' | 'EXPIRED') {
    return this.prisma.$transaction(async tx => {
      const { count } = await tx.posSale.updateMany({
        where: { id, status: { in: ['PENDING', 'PAID'] } },
        data: { status },
      });
      if (count === 1) {
        const lines = await tx.posSaleLine.findMany({ where: { saleId: id } });
        const sale = await tx.posSale.findUniqueOrThrow({ where: { id }, select: { locationId: true } });
        await this.stock.put(tx, sale.locationId, lines.map(l => ({ releaseId: l.releaseId, qty: l.qty })));
        for (const l of lines) {
          await tx.release.updateMany({ where: { id: l.releaseId }, data: { stock: { increment: l.qty } } });
        }
        await tx.posPayment.updateMany({
          where: { saleId: id, status: { in: ['PENDING', 'PAID'] } },
          data: { status: status === 'EXPIRED' ? 'EXPIRED' : 'VOIDED' },
        });
      }
      return tx.posSale.findUniqueOrThrow({ where: { id }, include: SALE_INCLUDE });
    });
  }
}
