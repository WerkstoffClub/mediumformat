import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsBooleanString, IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';

export class StockLineDto {
  @IsString() @MinLength(1) @MaxLength(64) releaseId!: string;
  @IsInt() @Min(1) @Max(10_000) qty!: number;
}

export class CreateTransferDto {
  @IsString() @MinLength(1) fromLocationId!: string;
  @IsString() @MinLength(1) toLocationId!: string;
  @ArrayMinSize(1) @ArrayMaxSize(200)
  @ValidateNested({ each: true }) @Type(() => StockLineDto)
  lines!: StockLineDto[];
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class StockQueryDto {
  @IsOptional() @IsString() @MaxLength(80) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsBooleanString() inStock?: string;
}

export class ReportQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class TransferQueryDto {
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
