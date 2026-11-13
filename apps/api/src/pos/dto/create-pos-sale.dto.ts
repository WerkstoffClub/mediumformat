import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsEmail, IsIn, IsInt, IsOptional, IsString,
  Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested,
} from 'class-validator';

export class PosSaleLineDto {
  @IsString() @MinLength(1) @MaxLength(64) releaseId!: string;
  @IsInt() @Min(1) @Max(99) qty!: number;
}

export class PosDiscountDto {
  @IsIn(['PERCENT', 'FIXED_IDR']) kind!: 'PERCENT' | 'FIXED_IDR';
  @IsInt() @Min(0) @Max(1_000_000_000) value!: number;
}

export class PosCustomerDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @Matches(/^\+?[0-9 ()-]{6,20}$/, { message: 'phone must be a valid phone number' }) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(160) email?: string;
}

export class PosPaymentDto {
  @IsIn(['CASH', 'EDC', 'XENDIT', 'OTHER']) method!: 'CASH' | 'EDC' | 'XENDIT' | 'OTHER';

  // CASH
  @ValidateIf(o => o.method === 'CASH') @IsInt() @Min(0) tenderedIdr?: number;

  // EDC — copied from the terminal slip
  @ValidateIf(o => o.method === 'EDC') @IsString() @MinLength(2) @MaxLength(40) edcBank?: string;
  @ValidateIf(o => o.method === 'EDC') @Matches(/^[A-Z0-9]{6}$/, { message: 'approvalCode is 6 letters/digits' }) approvalCode?: string;
  @IsOptional() @Matches(/^\d{6,12}$/, { message: 'rrn is 6–12 digits' }) rrn?: string;
  @IsOptional() @Matches(/^\d{4}$/, { message: 'cardLast4 is 4 digits' }) cardLast4?: string;
  @IsOptional() @IsString() @MaxLength(20) cardScheme?: string;

  // XENDIT
  @ValidateIf(o => o.method === 'XENDIT') @IsIn(['QRIS', 'VA', 'EWALLET', 'CARD']) channel?: 'QRIS' | 'VA' | 'EWALLET' | 'CARD';
  @IsOptional() @IsString() @MaxLength(20) ewallet?: string;

  // OTHER — a DealPOS payment method name
  @ValidateIf(o => o.method === 'OTHER') @IsString() @MinLength(1) @MaxLength(80) otherMethodName?: string;
}

export class CreatePosSaleDto {
  @ArrayMinSize(1) @ArrayMaxSize(60)
  @ValidateNested({ each: true }) @Type(() => PosSaleLineDto)
  lines!: PosSaleLineDto[];

  @IsOptional() @ValidateNested() @Type(() => PosDiscountDto) discount?: PosDiscountDto;
  @IsOptional() @IsString() @MaxLength(40) voucherCode?: string;
  @IsOptional() @ValidateNested() @Type(() => PosCustomerDto) customer?: PosCustomerDto;

  @ValidateNested() @Type(() => PosPaymentDto) payment!: PosPaymentDto;
}

export class PosSaleFilterDto {
  @IsOptional() @IsIn(['PENDING', 'PAID', 'EXPIRED', 'VOIDED']) status?: string;
  @IsOptional() @IsString() @MaxLength(80) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
