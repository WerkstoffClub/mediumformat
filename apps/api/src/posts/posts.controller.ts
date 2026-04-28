import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostFilterDto } from './dto/post-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@mf/shared';

interface AuthUser { id: string; role: string; }

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('posts')
export class PostsController {
  constructor(private posts: PostsService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() body: CreatePostDto, @CurrentUser() user: AuthUser) {
    return this.posts.create(body, user.id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  findAll(@Query() filter: PostFilterDto) {
    return this.posts.findAll(filter);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.posts.findBySlug(slug);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.posts.findOne(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdatePostDto, @CurrentUser() user: AuthUser) {
    return this.posts.update(id, body, user.id, user.role);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.posts.remove(id);
  }
}
