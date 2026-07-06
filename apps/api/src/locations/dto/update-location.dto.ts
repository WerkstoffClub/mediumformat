import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, IsInt, IsDateString, MinLength } from 'class-validator';
import { LocationKind, StoreLocation } from '@prisma/client';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

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
}
