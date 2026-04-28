import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PostCategory, PostStatus } from '@prisma/client';

export class PostFilterDto {
  @IsOptional() @IsEnum(PostCategory) category?: PostCategory;
  @IsOptional() @IsEnum(PostStatus)   status?: PostStatus;
  @IsOptional() @IsString()           search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
}
