import { IsString, IsOptional, IsInt, IsEnum, Min, IsPositive, IsUrl } from 'class-validator';
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
  @IsOptional() @IsString() discogsId?: string;
}
