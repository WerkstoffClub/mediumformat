import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { BandcampService, BandcampSearchResult } from './bandcamp.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@mf/shared';

interface BandcampSearchBody {
  artist?: string;
  title?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations/bandcamp')
export class BandcampController {
  constructor(private bandcamp: BandcampService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('search')
  async search(
    @Body() body: BandcampSearchBody,
  ): Promise<BandcampSearchResult | { searchUrl: null }> {
    if (!body.artist || !body.title) return { searchUrl: null };
    return this.bandcamp.search(body.artist, body.title);
  }
}
