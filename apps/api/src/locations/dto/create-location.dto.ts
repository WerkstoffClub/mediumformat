import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, IsInt, IsDateString, IsNumber, Max, Min, MinLength } from 'class-validator';
import { LocationKind, StoreLocation } from '@prisma/client';

export class CreateLocationDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsEnum(LocationKind)
  kind?: LocationKind;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  shelves?: string[];

  @IsOptional()
  @IsString()
  matchKey?: string;

  @IsOptional()
  @IsEnum(StoreLocation)
  storeLocation?: StoreLocation;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  /** Consignment partner's cut of sales, 0–100 (%). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionPct?: number;
}
