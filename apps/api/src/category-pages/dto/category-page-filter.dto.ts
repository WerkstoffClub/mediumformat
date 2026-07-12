import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CategoryPageStatus, CategoryPageTemplate } from '@prisma/client';

export class CategoryPageFilterDto {
  @IsOptional() @IsEnum(CategoryPageStatus)   status?: CategoryPageStatus;
  @IsOptional() @IsEnum(CategoryPageTemplate) template?: CategoryPageTemplate;
  @IsOptional() @IsString()                   search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 50;
}
