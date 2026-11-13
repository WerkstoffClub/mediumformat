import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsEmail, IsIn, IsInt, IsOptional, IsString,
  Matches, MaxLength, Min, Max, MinLength, ValidateIf, ValidateNested,
} from 'class-validator';

export const MAX_LINES = 30;
export const MAX_QTY_PER_LINE = 10;

export class WebOrderLineDto {
  @IsString() @MinLength(1) @MaxLength(64) releaseId!: string;
  @IsInt() @Min(1) @Max(MAX_QTY_PER_LINE) qty!: number;
}

export class CreateWebOrderDto {
  @IsString() @MinLength(2) @MaxLength(120) customerName!: string;
  @IsEmail() @MaxLength(160) email!: string;
  @Matches(/^\+?[0-9 ()-]{8,20}$/, { message: 'phone must be a valid phone number' }) phone!: string;
  @IsIn(['PICKUP', 'DELIVERY']) fulfilment!: 'PICKUP' | 'DELIVERY';

  @ValidateIf(o => o.fulfilment === 'DELIVERY') @IsString() @MinLength(5) @MaxLength(400) address?: string;
  @ValidateIf(o => o.fulfilment === 'DELIVERY') @IsString() @MinLength(2) @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(10) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(600) notes?: string;
  @IsOptional() @IsString() @MaxLength(40) voucherCode?: string;

  @ArrayMinSize(1) @ArrayMaxSize(MAX_LINES)
  @ValidateNested({ each: true }) @Type(() => WebOrderLineDto)
  lines!: WebOrderLineDto[];
}

export class UpdateWebOrderStatusDto {
  @IsIn(['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'])
  status!: 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
}

export class WebOrderFilterDto {
  @IsOptional() @IsIn(['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED']) status?: string;
  @IsOptional() @IsString() @MaxLength(80) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
