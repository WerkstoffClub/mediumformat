import { IsIn, IsOptional, IsString, IsInt, IsEnum, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { RecordFormat, RecordCondition, StoreLocation } from '@prisma/client';

export const STOCK_STATES = ['in', 'low', 'out'] as const;
export type StockState = (typeof STOCK_STATES)[number];
export const SORTS = ['newest', 'price_asc', 'price_desc', 'artist', 'stock_asc'] as const;
export type ReleaseSort = (typeof SORTS)[number];

export class ReleaseFilterDto {
  /** Free-text search across artist, title, label, cat#/SKU and barcode */
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() artist?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsEnum(RecordFormat) format?: RecordFormat;
  @IsOptional() @IsEnum(RecordCondition) condition?: RecordCondition;
  @IsOptional() @IsEnum(StoreLocation) storeLocation?: StoreLocation;
  @IsOptional() @IsString() shelfLocation?: string;
  @IsOptional() @IsString() genre?: string;
  @IsOptional() @IsIn(STOCK_STATES) stock?: StockState;
  @IsOptional() @IsIn(SORTS) sort?: ReleaseSort;
  @IsOptional() @Type(() => Boolean) @IsBoolean() lowStockOnly?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 50;
}
