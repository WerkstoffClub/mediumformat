import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AiAssistService, AssistKind } from './ai-assist.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { ReleaseFilterDto } from './dto/release-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, STAFF_ROLES } from '@mf/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    private inventory: InventoryService,
    private aiAssist: AiAssistService,
  ) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('ai-assist')
  async assist(@Body() body: { kind: AssistKind; release: { artist: string; title: string; label?: string; year?: number; format?: string; genre?: string; priceIdr?: number } }) {
    const text = await this.aiAssist.generate(body.kind, body.release);
    return { text };
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() body: CreateReleaseDto) {
    return this.inventory.create(body);
  }

  @Roles(...STAFF_ROLES)
  @Get()
  findAll(@Query() filter: ReleaseFilterDto) {
    return this.inventory.findAll(filter);
  }

  @Roles(...STAFF_ROLES)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventory.findOne(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateReleaseDto) {
    return this.inventory.update(id, body);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.inventory.remove(id);
  }
}
