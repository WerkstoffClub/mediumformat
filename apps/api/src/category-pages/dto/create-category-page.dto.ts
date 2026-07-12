import {
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';
import {
  CategoryPageStatus,
  CategoryPageTemplate,
  CategoryPageKind,
  PostCategory,
  RecordFormat,
} from '@prisma/client';

export class CreateCategoryPageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  slug!: string;

  @IsOptional()
  @IsEnum(RecordFormat)
  formatFilter?: RecordFormat;

  @IsOptional()
  @IsEnum(CategoryPageTemplate)
  template?: CategoryPageTemplate;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  kicker?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  salesCopy?: string;

  @IsOptional()
  @IsUrl()
  heroImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ctaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ctaHref?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string;

  @IsOptional()
  @IsEnum(CategoryPageStatus)
  status?: CategoryPageStatus;

  @IsOptional()
  @IsEnum(CategoryPageKind)
  kind?: CategoryPageKind;

  @IsOptional()
  @IsEnum(PostCategory)
  newsCategoryKey?: PostCategory;
}
