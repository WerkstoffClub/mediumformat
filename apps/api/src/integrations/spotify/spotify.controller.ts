import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SpotifyService, SpotifySearchResult } from './spotify.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@mf/shared';

interface SpotifySearchBody {
  artist?: string;
  title?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations/spotify')
export class SpotifyController {
  constructor(private spotify: SpotifyService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('search')
  async search(
    @Body() body: SpotifySearchBody,
  ): Promise<{ results: SpotifySearchResult[] }> {
    if (!body.artist || !body.title) return { results: [] };
    return { results: await this.spotify.search(body.artist, body.title) };
  }
}
