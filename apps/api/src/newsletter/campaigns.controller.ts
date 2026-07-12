import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, STAFF_ROLES } from '@mf/shared';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignFilterDto } from './dto/filter.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('newsletter/campaigns')
export class CampaignsController {
  constructor(private svc: CampaignsService) {}

  @Roles(...STAFF_ROLES)
  @Get()
  list(@Query() f: CampaignFilterDto) {
    return this.svc.findAll(f);
  }

  @Roles(...STAFF_ROLES)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() body: CreateCampaignDto) {
    return this.svc.create(body);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateCampaignDto) {
    return this.svc.update(id, body);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.svc.duplicate(id);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
