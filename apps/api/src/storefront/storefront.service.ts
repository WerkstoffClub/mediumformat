import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NewsletterSource, Prisma, RecordFormat } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { validateVoucher } from '../vouchers/vouchers.validator';

const KNOWN_SOURCES: readonly NewsletterSource[] = [
  'STOREFRONT',
  'CHECKOUT',
  'POS',
  'MANUAL',
  'IMPORT',
];

const KNOWN_FORMATS: readonly RecordFormat[] = [
  'LP',
  'TWO_LP',
  'THREE_LP',
  'TWELVE_INCH',
  'SEVEN_INCH',
  'CD',
  'TWO_CD',
  'CASSETTE',
  'MERCH',
];

@Injectable()
export class StorefrontService {
  constructor(private prisma: PrismaService) {}

  releases(f: { page?: string; limit?: string; format?: string; q?: string }) {
    const page = Math.max(1, Number(f.page ?? 1));
    const limit = Math.min(48, Number(f.limit ?? 24));
    const where: Prisma.ReleaseWhereInput = { stock: { gt: 0 } };
    if (f.format && (KNOWN_FORMATS as readonly string[]).includes(f.format)) {
      where.format = f.format as RecordFormat;
    }
    if (f.q) {
      where.OR = [
        { artist: { contains: f.q, mode: 'insensitive' } },
        { title: { contains: f.q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.release.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async releaseBySlug(slug: string) {
    const r = await this.prisma.release.findUnique({ where: { slug } });
    if (!r) throw new NotFoundException();
    return r;
  }

  preorders() {
    return this.prisma.release.findMany({
      where: { preorder: true },
      orderBy: { preorderEta: 'asc' },
    });
  }

  posts() {
    return this.prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
  }

  async postBySlug(slug: string) {
    const p = await this.prisma.post.findUnique({ where: { slug } });
    if (!p || p.status !== 'PUBLISHED') throw new NotFoundException();
    return p;
  }

  async categoryPage(slug: string) {
    const p = await this.prisma.categoryPage.findUnique({ where: { slug } });
    if (!p || p.status !== 'PUBLISHED') throw new NotFoundException();

    if (p.kind === 'NEWS_CATEGORY' && p.newsCategoryKey) {
      const posts = await this.prisma.post.findMany({
        where: { status: 'PUBLISHED', category: p.newsCategoryKey },
        orderBy: { publishedAt: 'desc' },
        take: 50,
      });
      return { ...p, posts };
    }

    return p;
  }

  async subscribe(body: { email: string; name?: string; source?: string }) {
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes('@')) throw new BadRequestException('Invalid email');
    const requested = body.source as NewsletterSource | undefined;
    const source: NewsletterSource =
      requested && KNOWN_SOURCES.includes(requested) ? requested : 'STOREFRONT';
    try {
      return await this.prisma.newsletterSubscriber.create({
        data: { email, name: body.name, source },
      });
    } catch (e: unknown) {
      if (typeof e === 'object' && e && 'code' in e && (e as { code: string }).code === 'P2002') {
        return { email, already: true };
      }
      throw e;
    }
  }

  async validateVoucher(body: { code: string; subtotalIdr: number }) {
    const code = body.code?.trim().toUpperCase();
    if (!code) return { valid: false, discountIdr: 0, reason: 'not_found' } as const;
    const v = await this.prisma.voucher.findUnique({ where: { code } });
    if (!v) return { valid: false, discountIdr: 0, reason: 'not_found' } as const;
    return validateVoucher(v, body.subtotalIdr);
  }
}
