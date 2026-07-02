import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { ReleaseFilterDto } from './dto/release-filter.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReleaseDto) {
    if (dto.barcode) {
      const exists = await this.prisma.release.findUnique({ where: { barcode: dto.barcode } });
      if (exists) throw new ConflictException('Barcode already in use');
    }
    return this.prisma.release.create({ data: dto });
  }

  async findAll(filter: ReleaseFilterDto) {
    const { page = 1, limit = 50, lowStockOnly, q, ...rest } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.ReleaseWhereInput = {};
    if (q) {
      where.OR = [
        { artist:    { contains: q, mode: 'insensitive' } },
        { title:     { contains: q, mode: 'insensitive' } },
        { label:     { contains: q, mode: 'insensitive' } },
        { catNumber: { contains: q, mode: 'insensitive' } },
        { barcode:   q },
      ];
    }
    if (rest.artist)        where.artist        = { contains: rest.artist, mode: 'insensitive' };
    if (rest.title)         where.title         = { contains: rest.title,  mode: 'insensitive' };
    if (rest.label)         where.label         = { contains: rest.label,  mode: 'insensitive' };
    if (rest.format)        where.format        = rest.format;
    if (rest.condition)     where.condition     = rest.condition;
    if (rest.storeLocation) where.storeLocation = rest.storeLocation;
    if (rest.shelfLocation) where.shelfLocation = { contains: rest.shelfLocation, mode: 'insensitive' };
    // Phase 2: replace with per-item threshold comparison via raw query
    if (lowStockOnly)       where.stock         = { lte: 2 };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.release.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' } }),
      this.prisma.release.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const release = await this.prisma.release.findUnique({ where: { id } });
    if (!release) throw new NotFoundException('Release not found');
    return release;
  }

  async update(id: string, dto: UpdateReleaseDto) {
    await this.findOne(id);
    return this.prisma.release.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.release.delete({ where: { id } });
  }

  async adjustStock(id: string, delta: number) {
    const release = await this.findOne(id);
    const newStock = Math.max(0, release.stock + delta);
    return this.prisma.release.update({ where: { id }, data: { stock: newStock } });
  }
}
