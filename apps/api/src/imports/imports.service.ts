import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import {
  ImportAttachmentKind, ImportOrigin, ImportStatus, PaymentMethod, Prisma, ReimbursementStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateImportDto } from './dto/create-import.dto';
import { ImportFilterDto } from './dto/import-filter.dto';

@Injectable()
export class ImportsService {
  constructor(private prisma: PrismaService) {}

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
        lines: { orderBy: { lineNo: 'asc' } },
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
}
