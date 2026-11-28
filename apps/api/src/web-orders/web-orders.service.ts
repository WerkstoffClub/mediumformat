import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WebOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { validateVoucher } from '../vouchers/vouchers.validator';
import { CreateBackofficeOrderDto, CreateWebOrderDto, WebOrderFilterDto } from './dto/create-web-order.dto';
import { orderNumber, priceLines } from './web-order.pricing';

const PUBLIC_FIELDS = {
  number: true, status: true, customerName: true, fulfilment: true,
  subtotalIdr: true, discountIdr: true, totalIdr: true, voucherCode: true, createdAt: true,
  lines: { select: { releaseId: true, artist: true, title: true, format: true, unitPriceIdr: true, qty: true } },
} satisfies Prisma.WebOrderSelect;

@Injectable()
export class WebOrdersService {
  constructor(private prisma: PrismaService) {}

  /** Public: place an order. Prices, stock and voucher are all resolved server-side. */
  async create(dto: CreateWebOrderDto) {
    return this.place({ ...dto, channel: 'Website', status: 'PENDING' });
  }

  /** Staff: enter an order taken elsewhere (WhatsApp, Instagram, phone, walk-in…).
   *  Same pricing, voucher and stock rules as checkout. Recorded in MF only —
   *  DealPOS is not written to. Paid orders start as PAID. */
  async createBackoffice(dto: CreateBackofficeOrderDto) {
    const order = await this.place({
      ...dto,
      email: dto.email || undefined,
      phone: dto.phone || undefined,
      status: dto.paid ? 'PAID' : 'PENDING',
    });
    return this.prisma.webOrder.findUniqueOrThrow({ where: { number: order.number }, include: { lines: true } });
  }

  private async place(dto: Omit<CreateWebOrderDto, 'email' | 'phone'> & {
    email?: string; phone?: string; channel: string; status: WebOrderStatus;
  }) {
    const ids = [...new Set(dto.lines.map(l => l.releaseId))];
    return this.prisma.$transaction(async tx => {
      const releases = await tx.release.findMany({
        where: { id: { in: ids } },
        select: { id: true, artist: true, title: true, format: true, priceIdr: true, stock: true },
      });
      const priced = priceLines(dto.lines, releases);
      if (!priced.ok) throw new ConflictException(priced.error);

      let discountIdr = 0;
      let voucherCode: string | null = null;
      const code = dto.voucherCode?.trim().toUpperCase();
      if (code) {
        const v = await tx.voucher.findUnique({ where: { code } });
        const res = v ? validateVoucher(v, priced.subtotalIdr) : null;
        if (!v || !res?.valid) throw new BadRequestException('Voucher code is not valid for this order.');
        discountIdr = res.discountIdr;
        voucherCode = code;
        await tx.voucher.update({ where: { code }, data: { usageCount: { increment: 1 } } });
      }

      // Reserve stock. The conditional update guards against a concurrent order.
      for (const l of priced.lines) {
        const { count } = await tx.release.updateMany({
          where: { id: l.id, stock: { gte: l.qty } },
          data: { stock: { decrement: l.qty } },
        });
        if (count !== 1) throw new ConflictException(`${l.artist} — ${l.title} just sold out.`);
      }

      const delivery = dto.fulfilment === 'DELIVERY';
      return tx.webOrder.create({
        data: {
          number: orderNumber(new Date()),
          status: dto.status,
          channel: dto.channel.trim(),
          customerName: dto.customerName.trim(),
          email: dto.email?.trim().toLowerCase() || null,
          phone: dto.phone?.trim() || null,
          fulfilment: dto.fulfilment,
          address: delivery ? dto.address?.trim() : null,
          city: delivery ? dto.city?.trim() : null,
          postalCode: delivery ? dto.postalCode?.trim() || null : null,
          notes: dto.notes?.trim() || null,
          voucherCode,
          subtotalIdr: priced.subtotalIdr,
          discountIdr,
          totalIdr: priced.subtotalIdr - discountIdr,
          lines: {
            create: priced.lines.map(l => ({
              releaseId: l.id, artist: l.artist, title: l.title,
              format: l.format as Prisma.WebOrderLineCreateWithoutOrderInput['format'],
              unitPriceIdr: l.priceIdr, qty: l.qty,
            })),
          },
        },
        select: PUBLIC_FIELDS,
      });
    });
  }

  async findAll(f: WebOrderFilterDto) {
    const page = f.page ?? 1;
    const limit = f.limit ?? 25;
    const where: Prisma.WebOrderWhereInput = {};
    if (f.status) where.status = f.status as WebOrderStatus;
    if (f.q?.trim()) {
      const q = f.q.trim();
      where.OR = [
        { number: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }
    const [data, total, pending] = await Promise.all([
      this.prisma.webOrder.findMany({
        where, include: { lines: true }, orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.webOrder.count({ where }),
      this.prisma.webOrder.count({ where: { status: 'PENDING' } }),
    ]);
    return { data, total, page, limit, pending };
  }

  /** Staff: move an order along. Cancelling returns the reserved stock; it cannot be undone. */
  async setStatus(id: string, status: WebOrderStatus) {
    return this.prisma.$transaction(async tx => {
      const order = await tx.webOrder.findUnique({ where: { id }, include: { lines: true } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === status) return order;
      if (order.status === 'CANCELLED') throw new BadRequestException('A cancelled order cannot be reopened.');
      if (status === 'CANCELLED') {
        for (const l of order.lines) {
          await tx.release.updateMany({ where: { id: l.releaseId }, data: { stock: { increment: l.qty } } });
        }
      }
      return tx.webOrder.update({ where: { id }, data: { status }, include: { lines: true } });
    });
  }
}
