import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AppleService, AppleSearchResult } from './apple.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@mf/shared';

interface AppleSearchBody {
  artist?: string;
  title?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations/apple')
export class AppleController {
  constructor(private apple: AppleService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('search')
  async search(
    @Body() body: AppleSearchBody,
  ): Promise<{ results: AppleSearchResult[] }> {
    if (!body.artist || !body.title) return { results: [] };
    return { results: await this.apple.search(body.artist, body.title) };
  }
}
