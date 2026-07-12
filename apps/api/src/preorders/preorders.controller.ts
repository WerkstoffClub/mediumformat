import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PreordersService } from './preorders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, STAFF_ROLES } from '@mf/shared';
import { SetPreorderDto } from './dto/set-preorder.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('preorders')
export class PreordersController {
  constructor(private svc: PreordersService) {}

  @Roles(...STAFF_ROLES)
  @Get()
  list(@Query() q: { q?: string; scope?: 'all' | 'upcoming' | 'overdue' }) {
    return this.svc.list(q);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':releaseId')
  set(@Param('releaseId') id: string, @Body() b: SetPreorderDto) {
    return this.svc.set(id, b);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete(':releaseId')
  unset(@Param('releaseId') id: string) {
    return this.svc.unset(id);
  }
}
