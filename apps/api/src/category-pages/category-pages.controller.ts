import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CategoryPagesService } from './category-pages.service';
import { CreateCategoryPageDto } from './dto/create-category-page.dto';
import { UpdateCategoryPageDto } from './dto/update-category-page.dto';
import { CategoryPageFilterDto } from './dto/category-page-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, STAFF_ROLES } from '@mf/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('category-pages')
export class CategoryPagesController {
  constructor(private pages: CategoryPagesService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() body: CreateCategoryPageDto) {
    return this.pages.create(body);
  }

  @Roles(...STAFF_ROLES)
  @Get()
  findAll(@Query() filter: CategoryPageFilterDto) {
    return this.pages.findAll(filter);
  }

  @Roles(...STAFF_ROLES)
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.pages.findBySlug(slug);
  }

  @Roles(...STAFF_ROLES)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pages.findOne(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateCategoryPageDto) {
    return this.pages.update(id, body);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.pages.remove(id);
  }
}
