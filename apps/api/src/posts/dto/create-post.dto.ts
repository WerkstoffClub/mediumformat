import { IsString, IsOptional, IsEnum, IsUrl, MinLength } from 'class-validator';
import { PostCategory, PostStatus } from '@prisma/client';

export class CreatePostDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(3)
  slug!: string;

  @IsString()
  @MinLength(10)
  body!: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @IsOptional()
  @IsEnum(PostCategory)
  category?: PostCategory;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}
