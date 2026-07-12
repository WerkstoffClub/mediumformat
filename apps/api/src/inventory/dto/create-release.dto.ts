import { IsArray, IsBoolean, IsDateString, IsString, IsOptional, IsInt, IsEnum, Min, IsPositive, IsUrl } from 'class-validator';
import { RecordFormat, RecordCondition, StoreLocation } from '@prisma/client';

export class CreateReleaseDto {
  @IsString() artist!: string;
  @IsString() title!: string;
  @IsEnum(RecordFormat) format!: RecordFormat;
  @IsEnum(RecordCondition) condition!: RecordCondition;
  @IsInt() @IsPositive() priceIdr!: number;
  @IsInt() @Min(0) stock!: number;

  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() catNumber?: string;
  @IsOptional() @IsInt() year?: number;
  @IsOptional() @IsString() genre?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsUrl() imageUrl?: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsEnum(StoreLocation) storeLocation?: StoreLocation;
  @IsOptional() @IsString() shelfLocation?: string;
  @IsOptional() @IsInt() @Min(0) lowStockThreshold?: number;
  @IsOptional() @IsInt() @Min(0) costIdr?: number;
  @IsOptional() @IsString() discogsId?: string;

  // Editorial fields (release-edit prototype)
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsInt() @Min(0) compareAtIdr?: number;
  @IsOptional() @IsEnum(RecordCondition) mediaGrade?: RecordCondition;
  @IsOptional() @IsEnum(RecordCondition) sleeveGrade?: RecordCondition;
  @IsOptional() @IsArray() tracks?: Array<Record<string, unknown>>;
  @IsOptional() @IsArray() sizing?: Array<Record<string, unknown>>;
  @IsOptional() @IsArray() channelListings?: string[];
  /** Extra images beyond `imageUrl`; populated by the Discogs Get media flow. */
  @IsOptional() @IsArray() gallery?: string[];
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsBoolean() preorder?: boolean;
  @IsOptional() @IsDateString() preorderEta?: string;
  @IsOptional() @IsBoolean() onSale?: boolean;
}
