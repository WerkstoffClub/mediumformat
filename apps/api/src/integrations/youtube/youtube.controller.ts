import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { YoutubeService, YoutubeSearchResult } from './youtube.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@mf/shared';

interface YoutubeSearchBody {
  artist?: string;
  title?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations/youtube')
export class YoutubeController {
  constructor(private youtube: YoutubeService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('search')
  async search(
    @Body() body: YoutubeSearchBody,
  ): Promise<{ results: YoutubeSearchResult[] }> {
    if (!body.artist || !body.title) return { results: [] };
    return { results: await this.youtube.search(body.artist, body.title) };
  }
}
