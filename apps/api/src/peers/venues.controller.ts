import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role, STAFF_ROLES } from '@mf/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VenuesService } from './venues.service';
import { CreateVenueDto, UpdateVenueDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('venues')
export class VenuesController {
  constructor(private svc: VenuesService) {}

  @Roles(...STAFF_ROLES) @Get()
  list() { return this.svc.findAll(); }

  @Roles(...STAFF_ROLES) @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Roles(Role.ADMIN, Role.MANAGER) @Post()
  create(@Body() b: CreateVenueDto) { return this.svc.create(b); }

  @Roles(Role.ADMIN, Role.MANAGER) @Patch(':id')
  update(@Param('id') id: string, @Body() b: UpdateVenueDto) { return this.svc.update(id, b); }

  @Roles(Role.ADMIN) @Delete(':id')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
