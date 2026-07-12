import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, PoStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePoDto } from './dto/create-po.dto';
import { UpdatePoDto } from './dto/update-po.dto';
import { PoFilterDto } from './dto/po-filter.dto';
import { ReceiveLinesDto } from './dto/receive-lines.dto';

type LineInput = { qtyOrdered: number; unitCostIdr: number };

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  private async nextPoNumber(): Promise<string> {
    const last = await this.prisma.purchaseOrder.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { poNumber: true },
    });
    const matched = last?.poNumber?.match(/PO-(\d+)/)?.[1];
    const next = matched ? parseInt(matched, 10) + 1 : 100;
    return `PO-${next}`;
  }

  private totals(lines: readonly LineInput[]) {
    const subtotalIdr = lines.reduce((s, l) => s + l.qtyOrdered * l.unitCostIdr, 0);
    return { subtotalIdr, taxIdr: 0, totalIdr: subtotalIdr };
  }

  async create(body: CreatePoDto) {
    const poNumber = await this.nextPoNumber();
    const linesInput = body.lines.map(l => ({
      description: l.description,
      releaseId: l.releaseId ?? null,
      qtyOrdered: l.qtyOrdered,
      qtyReceived: 0,
      unitCostIdr: l.unitCostIdr,
      totalIdr: l.qtyOrdered * l.unitCostIdr,
    }));
    const { subtotalIdr, taxIdr, totalIdr } = this.totals(body.lines);
    return this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: body.supplierId,
        supplierName: body.supplierName,
        etaAt: body.etaAt ? new Date(body.etaAt) : null,
        orderedAt: body.orderedAt ? new Date(body.orderedAt) : null,
        notes: body.notes,
        subtotalIdr,
        taxIdr,
        totalIdr,
        lines: { create: linesInput },
      },
      include: { lines: true },
    });
  }

  async findAll(f: PoFilterDto) {
    const page = Math.max(1, Number(f.page ?? 1));
    const limit = Math.min(100, Number(f.limit ?? 25));
    const where: Prisma.PurchaseOrderWhereInput = {};
    if (f.status) where.status = f.status as PoStatus;
    if (f.q) {
      where.OR = [
        { poNumber:     { contains: f.q, mode: 'insensitive' } },
        { supplierName: { contains: f.q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { lines: true },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async update(id: string, body: UpdatePoDto) {
    await this.findOne(id);
    const data: Prisma.PurchaseOrderUpdateInput = {};
    if (body.supplierId !== undefined) data.supplierId = body.supplierId;
    if (body.supplierName !== undefined) data.supplierName = body.supplierName;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.status !== undefined) data.status = body.status as PoStatus;
    if (body.etaAt !== undefined) data.etaAt = body.etaAt ? new Date(body.etaAt) : null;
    if (body.orderedAt !== undefined) data.orderedAt = body.orderedAt ? new Date(body.orderedAt) : null;

    if (body.lines) {
      const linesInput = body.lines.map(l => ({
        description: l.description,
        releaseId: l.releaseId ?? null,
        qtyOrdered: l.qtyOrdered,
        qtyReceived: 0,
        unitCostIdr: l.unitCostIdr,
        totalIdr: l.qtyOrdered * l.unitCostIdr,
      }));
      const { subtotalIdr, taxIdr, totalIdr } = this.totals(body.lines);
      data.subtotalIdr = subtotalIdr;
      data.taxIdr = taxIdr;
      data.totalIdr = totalIdr;
      // Replace lines atomically with the update.
      await this.prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });
      data.lines = { create: linesInput };
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data,
      include: { lines: true },
    });
  }

  /** Update per-line qtyReceived and roll the header status forward:
   *  none → SENT (or DRAFT untouched), some → PARTIAL, all full → RECEIVED. */
  async receive(id: string, body: ReceiveLinesDto) {
    const po = await this.findOne(id);
    if (po.status === PoStatus.CANCELLED) {
      throw new BadRequestException('Purchase order is cancelled');
    }
    // Validate every referenced line belongs to this PO before touching data.
    const lineIds = new Set(po.lines.map(l => l.id));
    for (const l of body.lines) {
      if (!lineIds.has(l.id)) {
        throw new BadRequestException(`Line ${l.id} does not belong to this PO`);
      }
    }
    if (body.lines.length > 0) {
      await this.prisma.$transaction(
        body.lines.map(l =>
          this.prisma.purchaseOrderLine.update({
            where: { id: l.id },
            data: { qtyReceived: l.qtyReceived },
          }),
        ),
      );
    }
    const fresh = await this.findOne(id);
    const anyReceived = fresh.lines.some(l => l.qtyReceived > 0);
    const allFull = fresh.lines.length > 0 && fresh.lines.every(l => l.qtyReceived >= l.qtyOrdered);
    const status: PoStatus = allFull
      ? PoStatus.RECEIVED
      : anyReceived
        ? PoStatus.PARTIAL
        : PoStatus.SENT;
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status,
        receivedAt: status === PoStatus.RECEIVED ? new Date() : null,
      },
      include: { lines: true },
    });
  }

  async cancel(id: string) {
    await this.findOne(id);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PoStatus.CANCELLED },
      include: { lines: true },
    });
  }

  /** Seed DRAFT purchase orders from any DealPOS bill that doesn't yet have
   *  a mirror row (matched by sourceBillId). Returns count of new POs. */
  async syncFromDealpos() {
    const bills = await this.prisma.dpBill.findMany({ include: { lines: true } });
    let created = 0;
    for (const b of bills) {
      const already = await this.prisma.purchaseOrder.findUnique({ where: { sourceBillId: b.id } });
      if (already) continue;
      const linesInput = b.lines.map(l => {
        const qty = Number(l.quantity);
        const price = Number(l.price);
        return {
          description: l.name,
          releaseId: null,
          qtyOrdered: Math.round(qty),
          qtyReceived: 0,
          unitCostIdr: Math.round(price),
          totalIdr: Math.round(qty * price),
        };
      });
      const subtotalIdr = Math.round(Number(b.gross ?? b.amount ?? 0));
      const taxIdr = Math.round(Number(b.tax ?? 0));
      const totalIdr = Math.round(Number(b.amount ?? 0));
      await this.prisma.purchaseOrder.create({
        data: {
          poNumber: await this.nextPoNumber(),
          supplierName: b.supplierName ?? 'Unknown supplier',
          sourceBillId: b.id,
          orderedAt: b.date ?? null,
          subtotalIdr,
          taxIdr,
          totalIdr,
          lines: { create: linesInput },
        },
      });
      created++;
    }
    return { created };
  }
}
