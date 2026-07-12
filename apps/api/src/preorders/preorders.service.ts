import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PreorderScope = 'all' | 'upcoming' | 'overdue';

@Injectable()
export class PreordersService {
  constructor(private prisma: PrismaService) {}

  list(f: { q?: string; scope?: PreorderScope } = {}) {
    const now = new Date();
    const where: Prisma.ReleaseWhereInput = { preorder: true };
    if (f.scope === 'upcoming') where.preorderEta = { gt: now };
    if (f.scope === 'overdue') where.preorderEta = { lte: now };
    if (f.q) {
      where.OR = [
        { artist: { contains: f.q, mode: 'insensitive' } },
        { title: { contains: f.q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.release.findMany({ where, orderBy: [{ preorderEta: 'asc' }] });
  }

  set(releaseId: string, body: { eta: string; notes?: string }) {
    return this.prisma.release.update({
      where: { id: releaseId },
      data: {
        preorder: true,
        preorderEta: new Date(body.eta),
        notes: body.notes ?? undefined,
      },
    });
  }

  unset(releaseId: string) {
    return this.prisma.release.update({
      where: { id: releaseId },
      data: { preorder: false, preorderEta: null },
    });
  }
}
