import { IsOptional, IsString, IsInt, IsEnum, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { RecordFormat, RecordCondition, StoreLocation } from '@prisma/client';

export class ReleaseFilterDto {
  @IsOptional() @IsString() artist?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsEnum(RecordFormat) format?: RecordFormat;
  @IsOptional() @IsEnum(RecordCondition) condition?: RecordCondition;
  @IsOptional() @IsEnum(StoreLocation) storeLocation?: StoreLocation;
  @IsOptional() @IsString() shelfLocation?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() lowStockOnly?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 50;
}
