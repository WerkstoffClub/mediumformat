import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@mf/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('locations')
export class LocationsController {
  constructor(private locations: LocationsService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.SHOPKEEPER)
  @Get()
  findAll() {
    return this.locations.findAll();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() body: CreateLocationDto) {
    return this.locations.create(body);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateLocationDto) {
    return this.locations.update(id, body);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.locations.remove(id);
  }
}
