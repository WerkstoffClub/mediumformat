import { Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignFilterDto } from './dto/filter.dto';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async findAll(f: CampaignFilterDto) {
    const page = Math.max(1, Number(f.page ?? 1));
    const limit = Math.min(100, Number(f.limit ?? 25));
    const where: Prisma.NewsletterCampaignWhereInput = {};
    if (f.status) where.status = f.status as CampaignStatus;
    if (f.q) where.subject = { contains: f.q, mode: 'insensitive' };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.newsletterCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.newsletterCampaign.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const c = await this.prisma.newsletterCampaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }

  create(body: CreateCampaignDto) {
    return this.prisma.newsletterCampaign.create({
      data: {
        subject: body.subject,
        previewText: body.previewText,
        body: body.body,
        status: (body.status ?? 'DRAFT') as CampaignStatus,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        recipientCount: body.recipientCount ?? 0,
      },
    });
  }

  async update(id: string, body: UpdateCampaignDto) {
    await this.findOne(id);
    const data: Prisma.NewsletterCampaignUpdateInput = {};
    if (body.subject !== undefined) data.subject = body.subject;
    if (body.previewText !== undefined) data.previewText = body.previewText;
    if (body.body !== undefined) data.body = body.body;
    if (body.status !== undefined) data.status = body.status as CampaignStatus;
    if (body.scheduledAt !== undefined) {
      data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }
    if (body.recipientCount !== undefined) data.recipientCount = body.recipientCount;
    return this.prisma.newsletterCampaign.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.newsletterCampaign.delete({ where: { id } });
    return { deleted: true, id };
  }

  async duplicate(id: string) {
    const orig = await this.findOne(id);
    return this.prisma.newsletterCampaign.create({
      data: {
        subject: `${orig.subject} (copy)`,
        previewText: orig.previewText,
        body: orig.body,
        status: 'DRAFT',
        scheduledAt: null,
        sentAt: null,
        recipientCount: 0,
      },
    });
  }
}
