import { Injectable, NotFoundException } from '@nestjs/common';
import { NewsletterSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { SubscriberFilterDto } from './dto/filter.dto';

const CSV_HEADER = 'email,name,source,tags,subscribedAt';

@Injectable()
export class SubscribersService {
  constructor(private prisma: PrismaService) {}

  async findAll(f: SubscriberFilterDto) {
    const page = Math.max(1, Number(f.page ?? 1));
    const limit = Math.min(200, Number(f.limit ?? 25));
    const where: Prisma.NewsletterSubscriberWhereInput = {};
    if (f.source) where.source = f.source as NewsletterSource;
    if (f.q) where.email = { contains: f.q, mode: 'insensitive' };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { subscribedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const s = await this.prisma.newsletterSubscriber.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Subscriber not found');
    return s;
  }

  create(body: CreateSubscriberDto) {
    const email = body.email.trim().toLowerCase();
    const source = (body.source ?? 'MANUAL') as NewsletterSource;
    return this.prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {
        name: body.name ?? undefined,
        tags: body.tags ?? undefined,
        unsubscribedAt: null,
      },
      create: {
        email,
        name: body.name,
        source,
        tags: body.tags ?? [],
      },
    });
  }

  async update(id: string, body: UpdateSubscriberDto) {
    await this.findOne(id);
    const data: Prisma.NewsletterSubscriberUpdateInput = {};
    if (body.email !== undefined) data.email = body.email.trim().toLowerCase();
    if (body.name !== undefined) data.name = body.name;
    if (body.source !== undefined) data.source = body.source as NewsletterSource;
    if (body.tags !== undefined) data.tags = body.tags;
    return this.prisma.newsletterSubscriber.update({ where: { id }, data });
  }

  async unsubscribe(id: string) {
    await this.findOne(id);
    return this.prisma.newsletterSubscriber.update({
      where: { id },
      data: { unsubscribedAt: new Date() },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.newsletterSubscriber.delete({ where: { id } });
    return { deleted: true, id };
  }

  /** Parse a naive CSV (email,name[,tags]) and upsert each row.
   *  Tags column uses pipe-separated tokens. First line is the header. */
  async importCsv(text: string): Promise<{ added: number; skipped: number }> {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) return { added: 0, skipped: 0 };
    const [, ...rows] = lines;
    let added = 0;
    let skipped = 0;
    for (const row of rows) {
      const cols = row.split(',').map(c => c.trim());
      const [rawEmail, rawName, rawTags] = cols;
      const email = (rawEmail ?? '').toLowerCase();
      if (!email || !email.includes('@')) {
        skipped++;
        continue;
      }
      const tags = rawTags ? rawTags.split('|').map(t => t.trim()).filter(Boolean) : [];
      try {
        await this.prisma.newsletterSubscriber.upsert({
          where: { email },
          update: {
            name: rawName || undefined,
            tags: tags.length ? tags : undefined,
            unsubscribedAt: null,
          },
          create: {
            email,
            name: rawName || undefined,
            source: 'IMPORT',
            tags,
          },
        });
        added++;
      } catch {
        skipped++;
      }
    }
    return { added, skipped };
  }

  async exportCsv(): Promise<string> {
    const rows = await this.prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: 'desc' },
    });
    const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const body = rows
      .map(r =>
        [
          escape(r.email),
          escape(r.name ?? ''),
          escape(r.source),
          escape((r.tags ?? []).join('|')),
          escape(r.subscribedAt.toISOString()),
        ].join(','),
      )
      .join('\n');
    return `${CSV_HEADER}\n${body}`;
  }
}
