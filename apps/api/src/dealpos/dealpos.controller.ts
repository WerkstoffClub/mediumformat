import { BadRequestException, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@mf/shared';
import { DealposSyncService, SYNC_ENTITIES, SyncEntity } from './dealpos-sync.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dealpos')
export class DealposController {
  constructor(private sync: DealposSyncService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('sync')
  async runSync(@Query('entity') entity?: string) {
    if (entity && !SYNC_ENTITIES.includes(entity as SyncEntity)) {
      throw new BadRequestException(`Unknown entity "${entity}". Valid: ${SYNC_ENTITIES.join(', ')}`);
    }
    const results = await this.sync.syncAll(entity as SyncEntity | undefined);
    return { results };
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('sync/status')
  async status() {
    return { running: this.sync.isRunning, entities: await this.sync.getStatus() };
  }
}
