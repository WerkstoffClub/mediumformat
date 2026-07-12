import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryPageDto } from './dto/create-category-page.dto';
import { UpdateCategoryPageDto } from './dto/update-category-page.dto';
import { CategoryPageFilterDto } from './dto/category-page-filter.dto';
import { CategoryPageStatus, Prisma } from '@prisma/client';

@Injectable()
export class CategoryPagesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryPageDto) {
    const exists = await this.prisma.categoryPage.findUnique({
      where: { slug: dto.slug },
    });
    if (exists) throw new ConflictException('Slug already in use');

    return this.prisma.categoryPage.create({
      data: {
        ...dto,
        publishedAt:
          dto.status === CategoryPageStatus.PUBLISHED ? new Date() : null,
      },
    });
  }

  async findAll(filter: CategoryPageFilterDto) {
    const { page = 1, limit = 50, status, template, search, kind } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.CategoryPageWhereInput = {};
    if (status) where.status = status;
    if (template) where.template = template;
    if (kind) where.kind = kind;
    if (search)
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug:  { contains: search, mode: 'insensitive' } },
      ];

    const [data, total] = await this.prisma.$transaction([
      this.prisma.categoryPage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.categoryPage.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const page = await this.prisma.categoryPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Category page not found');
    return page;
  }

  async findBySlug(slug: string) {
    const page = await this.prisma.categoryPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException('Category page not found');
    return page;
  }

  async update(id: string, dto: UpdateCategoryPageDto) {
    const existing = await this.findOne(id);

    // If we're transitioning DRAFT → PUBLISHED, stamp publishedAt now.
    const nextStatus = dto.status ?? existing.status;
    const publishedAt =
      nextStatus === CategoryPageStatus.PUBLISHED &&
      existing.status !== CategoryPageStatus.PUBLISHED
        ? new Date()
        : existing.publishedAt;

    return this.prisma.categoryPage.update({
      where: { id },
      data: { ...dto, publishedAt },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.categoryPage.delete({ where: { id } });
  }
}
