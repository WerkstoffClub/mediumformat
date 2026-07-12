import { Injectable } from '@nestjs/common';
import { ImportLineMatchStatus, RecordFormat } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Subset of ImportOrderLine fields matchLine() needs to resolve a Release. */
export interface MatchLineInput {
  artist: string;
  title: string;
  format: RecordFormat;
  barcode?: string | null;
  catNumber?: string | null;
  discogsId?: string | null;
}

export interface MatchResult {
  releaseId: string | null;
  matchStatus: ImportLineMatchStatus;
}

/** Resolves an import line to a catalog Release, trying (in order): exact
 *  barcode, exact discogsId, catNumber+format, then a fuzzy artist/title
 *  match scoped to format. First strategy that yields a hit wins; multiple
 *  hits within a strategy are reported AMBIGUOUS rather than guessed at. */
@Injectable()
export class MatchService {
  constructor(private prisma: PrismaService) {}

  async matchLine(line: MatchLineInput): Promise<MatchResult> {
    const barcode = line.barcode?.trim();
    if (barcode) {
      const hit = await this.prisma.release.findFirst({ where: { barcode } });
      if (hit) return { releaseId: hit.id, matchStatus: ImportLineMatchStatus.MATCHED };
    }

    const discogsId = line.discogsId?.trim();
    if (discogsId) {
      const hit = await this.prisma.release.findFirst({ where: { discogsId } });
      if (hit) return { releaseId: hit.id, matchStatus: ImportLineMatchStatus.MATCHED };
    }

    const catNumber = line.catNumber?.trim();
    if (catNumber) {
      const hits = await this.prisma.release.findMany({
        where: { catNumber, format: line.format },
      });
      if (hits.length === 1) return { releaseId: hits[0].id, matchStatus: ImportLineMatchStatus.MATCHED };
      if (hits.length > 1) return { releaseId: null, matchStatus: ImportLineMatchStatus.AMBIGUOUS };
    }

    const hits = await this.prisma.release.findMany({
      where: {
        format: line.format,
        artist: { contains: line.artist, mode: 'insensitive' },
        title: { contains: line.title, mode: 'insensitive' },
      },
    });
    if (hits.length === 1) return { releaseId: hits[0].id, matchStatus: ImportLineMatchStatus.MATCHED };
    if (hits.length > 1) return { releaseId: null, matchStatus: ImportLineMatchStatus.AMBIGUOUS };

    return { releaseId: null, matchStatus: ImportLineMatchStatus.NEW };
  }
}
