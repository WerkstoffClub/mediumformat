import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ImportOrigin, ImportStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportsService } from '../imports.service';
import { allocateByWeight } from '../pricing/pricing';
import { CreateConsolidationDto } from './dto/create-consolidation.dto';
import { UpdateConsolidationDto } from './dto/update-consolidation.dto';

/** Statuses that precede CONSOLIDATED in the import lifecycle. Attaching or
 *  allocating a consolidation only advances orders still at these statuses —
 *  an order already PRICED (or later) is left alone so allocate() re-runs
 *  don't regress it, since price() is called again right after anyway. */
const PRE_CONSOLIDATED_STATUSES: ImportStatus[] = [ImportStatus.DRAFT, ImportStatus.SUBMITTED];

@Injectable()
export class ConsolidationsService {
  constructor(
    private prisma: PrismaService,
    private imports: ImportsService,
  ) {}

  private async nextConsolidationNumber(): Promise<string> {
    const count = await this.prisma.importConsolidation.count();
    return `MF-C${String(count + 1).padStart(3, '0')}`;
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.importConsolidation.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Consolidation not found');
  }

  async create(body: CreateConsolidationDto) {
    const number = await this.nextConsolidationNumber();
    return this.prisma.importConsolidation.create({
      data: {
        number,
        forwarderName: body.forwarderName,
        trackingRaw: body.trackingRaw,
        status: 'open',
      },
    });
  }

  async findAll() {
    return this.prisma.importConsolidation.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        number: true,
        forwarderName: true,
        forwarderInvoiceIdr: true,
        status: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    });
  }

  async findOne(id: string) {
    const consolidation = await this.prisma.importConsolidation.findUnique({
      where: { id },
      include: {
        orders: {
          select: {
            id: true,
            number: true,
            vendorName: true,
            origin: true,
            currency: true,
            status: true,
            subtotalNative: true,
            lines: {
              select: {
                id: true,
                weightKg: true,
                qty: true,
                allocatedForwarderIdr: true,
                landedCostIdr: true,
              },
            },
          },
        },
      },
    });
    if (!consolidation) throw new NotFoundException('Consolidation not found');

    let totalUnits = 0;
    let totalWeightKg = 0;
    for (const order of consolidation.orders) {
      for (const line of order.lines) {
        totalUnits += line.qty;
        totalWeightKg += Number(line.weightKg) * line.qty;
      }
    }

    return {
      ...consolidation,
      totals: {
        orderCount: consolidation.orders.length,
        totalUnits,
        totalWeightKg,
      },
    };
  }

  async update(id: string, body: UpdateConsolidationDto) {
    await this.ensureExists(id);
    return this.prisma.importConsolidation.update({
      where: { id },
      data: {
        ...(body.forwarderName !== undefined ? { forwarderName: body.forwarderName } : {}),
        ...(body.forwarderInvoiceIdr !== undefined ? { forwarderInvoiceIdr: body.forwarderInvoiceIdr } : {}),
        ...(body.weightKgTotal !== undefined ? { weightKgTotal: body.weightKgTotal } : {}),
        ...(body.trackingRaw !== undefined ? { trackingRaw: body.trackingRaw } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });
  }

  /** Attaches an international import order to this consolidation. Rejects
   *  domestic orders (nothing to consolidate with a forwarder for) and
   *  orders already claimed by a different consolidation. Advances a
   *  SUBMITTED order to CONSOLIDATED. */
  async attachOrder(id: string, importOrderId: string) {
    await this.ensureExists(id);

    const order = await this.prisma.importOrder.findUnique({ where: { id: importOrderId } });
    if (!order) throw new NotFoundException('Import order not found');

    if (order.origin !== ImportOrigin.INTERNATIONAL) {
      throw new BadRequestException('Only international orders can be consolidated');
    }
    if (order.consolidationId && order.consolidationId !== id) {
      throw new BadRequestException('Order already in another consolidation');
    }

    await this.prisma.importOrder.update({
      where: { id: importOrderId },
      data: {
        consolidationId: id,
        ...(order.status === ImportStatus.SUBMITTED ? { status: ImportStatus.CONSOLIDATED } : {}),
      },
    });

    return this.findOne(id);
  }

  /** Detaches an order from this consolidation, resetting any forwarder-cost
   *  allocation on its lines and reverting a CONSOLIDATED status back to
   *  SUBMITTED since it no longer has a forwarder to be consolidated with. */
  async detachOrder(id: string, importOrderId: string) {
    await this.ensureExists(id);

    const order = await this.prisma.importOrder.findUnique({
      where: { id: importOrderId },
      include: { lines: { select: { id: true } } },
    });
    if (!order) throw new NotFoundException('Import order not found');
    if (order.consolidationId !== id) {
      throw new BadRequestException('Order does not belong to this consolidation');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const line of order.lines) {
        await tx.importOrderLine.update({ where: { id: line.id }, data: { allocatedForwarderIdr: 0 } });
      }
      await tx.importOrder.update({
        where: { id: importOrderId },
        data: {
          consolidationId: null,
          ...(order.status === ImportStatus.CONSOLIDATED ? { status: ImportStatus.SUBMITTED } : {}),
        },
      });
    });

    return this.findOne(id);
  }

  /** Splits the forwarder invoice across every line of every attached order,
   *  proportional to weightKg*qty, then re-prices each order so landed cost
   *  (and channel prices) reflect the new forwarder freight share. */
  async allocate(id: string) {
    const consolidation = await this.prisma.importConsolidation.findUnique({
      where: { id },
      include: { orders: { include: { lines: true } } },
    });
    if (!consolidation) throw new NotFoundException('Consolidation not found');

    const lines = consolidation.orders.flatMap(order => order.lines);
    const weights = lines.map(line => Number(line.weightKg) * line.qty);
    const totalFreightIdr = Number(consolidation.forwarderInvoiceIdr);
    const allocated = allocateByWeight(weights, totalFreightIdr);
    const totalWeightKg = weights.reduce((sum, w) => sum + w, 0);

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < lines.length; i++) {
        await tx.importOrderLine.update({
          where: { id: lines[i].id },
          data: { allocatedForwarderIdr: allocated[i] },
        });
      }
      await tx.importConsolidation.update({
        where: { id },
        data: { weightKgTotal: totalWeightKg, status: 'allocated' },
      });
      for (const order of consolidation.orders) {
        if (PRE_CONSOLIDATED_STATUSES.includes(order.status)) {
          await tx.importOrder.update({ where: { id: order.id }, data: { status: ImportStatus.CONSOLIDATED } });
        }
      }
    });

    // Re-price outside the transaction: price() resolves FX, opens its own
    // transaction per order, and reflects the freshly allocated forwarder
    // share in landed cost + channel prices (moving orders to PRICED).
    for (const order of consolidation.orders) {
      await this.imports.price(order.id);
    }

    const detail = await this.findOne(id);
    return {
      ...detail,
      allocation: {
        totalFreightIdr,
        lineCount: lines.length,
        orderCount: consolidation.orders.length,
        ...(totalFreightIdr === 0 ? { note: 'Forwarder invoice is 0 — every line was allocated Rp 0.' } : {}),
      },
    };
  }
}
