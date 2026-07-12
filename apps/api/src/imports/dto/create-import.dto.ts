import {
  IsArray, IsEnum, IsISO8601, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ImportOrigin, PaymentMethod, RecordFormat } from '@prisma/client';

export class CreateImportLineDto {
  @IsString() artist!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() catNumber?: string;
  @IsOptional() @IsString() barcode?: string;
  @IsString() formatRaw!: string;
  @IsEnum(RecordFormat) format!: RecordFormat;
  @IsOptional() @IsString() edition?: string;
  @IsInt() @Min(0) qty!: number;
  @IsOptional() @IsInt() @Min(0) qtyBackorder?: number;
  @IsNumber() @Min(0) unitPriceNative!: number;
  @IsNumber() @Min(0) extendedNative!: number;
  @IsOptional() @IsNumber() @Min(0) weightKg?: number;
}

export class CreateImportDto {
  @IsString() vendorName!: string;
  @IsEnum(ImportOrigin) origin!: ImportOrigin;
  @IsString() currency!: string;
  @IsISO8601() orderDate!: string;
  @IsOptional() @IsNumber() fxRate?: number;
  @IsOptional() @IsString() fxRateSource?: string;
  @IsOptional() @IsNumber() @Min(0) vendorShippingNative?: number;
  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
  @IsOptional() @IsString() paidBy?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateImportLineDto) lines!: CreateImportLineDto[];
}
