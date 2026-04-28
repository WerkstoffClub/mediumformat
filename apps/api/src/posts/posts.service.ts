import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostFilterDto } from './dto/post-filter.dto';
import { PostStatus, Prisma } from '@prisma/client';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePostDto, authorId: string) {
    const exists = await this.prisma.post.findUnique({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('Slug already in use');

    return this.prisma.post.create({
      data: {
        ...dto,
        authorId,
        publishedAt: dto.status === PostStatus.PUBLISHED ? new Date() : null,
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async findAll(filter: PostFilterDto) {
    const { page = 1, limit = 20, category, status, search } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {};
    if (category) where.category = category;
    if (status)   where.status   = status;
    if (search)   where.OR = [
      { title:   { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
    ];

    const [data, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { author: { select: { id: true, name: true } } },
      }),
      this.prisma.post.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true } } },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.post.findUnique({
      where: { slug },
      include: { author: { select: { id: true, name: true } } },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async update(id: string, dto: UpdatePostDto, requesterId: string, requesterRole: string) {
    const post = await this.findOne(id);

    // Only the author or ADMIN can edit
    if (post.authorId !== requesterId && requesterRole !== 'ADMIN') {
      throw new ForbiddenException('You can only edit your own posts');
    }

    const publishedAt =
      dto.status === PostStatus.PUBLISHED && post.status !== PostStatus.PUBLISHED
        ? new Date()
        : post.publishedAt;

    return this.prisma.post.update({
      where: { id },
      data: { ...dto, publishedAt },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.post.delete({ where: { id } });
  }
}
