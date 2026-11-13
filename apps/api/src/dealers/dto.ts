import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export const DEALER_STATUSES = ['PROSPECT', 'ONBOARDING', 'LIVE', 'PAUSED'] as const;

export class CreateDealerDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(60) kind?: string;
  @IsOptional() @IsString() @MaxLength(80) area?: string;
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsIn(DEALER_STATUSES as unknown as string[]) status?: (typeof DEALER_STATUSES)[number];
  @IsOptional() @IsNumber() @Min(0) @Max(100) feePct?: number;
  @IsOptional() @IsString() @MaxLength(200) contact?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
}
export class UpdateDealerDto extends PartialType(CreateDealerDto) {}

export class TxnItemDto {
  @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @IsInt() @Min(1) qty!: number;
  @IsInt() @Min(0) priceIdr!: number;
}

export class TxnDto {
  @IsString() @MinLength(1) @MaxLength(40) txnNo!: string;
  @IsString() occurredAt!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => TxnItemDto) items!: TxnItemDto[];
  @IsString() @MaxLength(40) payment!: string;
  @IsOptional() @IsString() @MaxLength(80) cashier?: string;
  @IsOptional() @IsIn(['PAID', 'REFUNDED']) status?: 'PAID' | 'REFUNDED';
}

/** Batch ingest from a dealer's POS — idempotent on (dealer, txnNo). */
export class IngestTxnsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => TxnDto) transactions!: TxnDto[];
}

export class TxnFilterDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number = 50;
}

export class SummaryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) days?: number = 30;
}
