import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { DiscogsService, DiscogsSearchResult } from './discogs.service';
import { DiscogsMapped } from './discogs.mapper';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@mf/shared';

interface DiscogsLookupBody {
  discogsId?: string;
  artist?: string;
  title?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations/discogs')
export class DiscogsController {
  constructor(private discogs: DiscogsService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('lookup')
  async lookup(
    @Body() body: DiscogsLookupBody,
  ): Promise<DiscogsMapped | { results: DiscogsSearchResult[] }> {
    if (body.discogsId) return this.discogs.lookupById(body.discogsId);
    if (body.artist && body.title) {
      return { results: await this.discogs.search(body.artist, body.title) };
    }
    return { results: [] };
  }
}
