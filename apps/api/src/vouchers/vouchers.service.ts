import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VoucherKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VoucherFilterDto } from './dto/voucher-filter.dto';

@Injectable()
export class VouchersService {
  constructor(private prisma: PrismaService) {}

  async findAll(f: VoucherFilterDto) {
    const page = Math.max(1, Number(f.page ?? 1));
    const limit = Math.min(100, Number(f.limit ?? 25));
    const now = new Date();
    const where: Prisma.VoucherWhereInput = {};
    if (f.q) where.code = { contains: f.q, mode: 'insensitive' };
    if (f.status === 'active') {
      where.active = true;
      where.AND = [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      ];
    } else if (f.status === 'scheduled') {
      where.active = true;
      where.startsAt = { gt: now };
    } else if (f.status === 'expired') {
      where.expiresAt = { lt: now };
    } else if (f.status === 'disabled') {
      where.active = false;
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.voucher.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.voucher.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const v = await this.prisma.voucher.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Voucher not found');
    return v;
  }

  create(body: CreateVoucherDto) {
    return this.prisma.voucher.create({
      data: {
        code: body.code.trim().toUpperCase(),
        kind: body.kind as VoucherKind,
        value: body.value,
        minOrderIdr: body.minOrderIdr ?? 0,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        usageLimit: body.usageLimit ?? null,
        active: body.active ?? true,
        notes: body.notes,
      },
    });
  }

  async update(id: string, body: UpdateVoucherDto) {
    await this.findOne(id);
    const data: Prisma.VoucherUpdateInput = {};
    if (body.code !== undefined) data.code = body.code.trim().toUpperCase();
    if (body.kind !== undefined) data.kind = body.kind as VoucherKind;
    if (body.value !== undefined) data.value = body.value;
    if (body.minOrderIdr !== undefined) data.minOrderIdr = body.minOrderIdr;
    if (body.startsAt !== undefined) data.startsAt = body.startsAt ? new Date(body.startsAt) : null;
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.usageLimit !== undefined) data.usageLimit = body.usageLimit ?? null;
    if (body.active !== undefined) data.active = body.active;
    if (body.notes !== undefined) data.notes = body.notes;
    return this.prisma.voucher.update({ where: { id }, data });
  }

  async remove(id: string) {
    const v = await this.findOne(id);
    if (v.usageCount > 0) {
      return this.prisma.voucher.update({ where: { id }, data: { active: false } });
    }
    await this.prisma.voucher.delete({ where: { id } });
    return { deleted: true, id };
  }
}
