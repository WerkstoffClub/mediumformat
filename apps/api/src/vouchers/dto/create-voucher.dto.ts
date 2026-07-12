import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateVoucherDto {
  @IsString() @MinLength(2) code!: string;
  @IsIn(['PERCENT', 'FIXED_IDR']) kind!: 'PERCENT' | 'FIXED_IDR';
  @IsInt() @Min(0) value!: number;
  @IsOptional() @IsInt() @Min(0) minOrderIdr?: number;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() @IsInt() @Min(1) usageLimit?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() notes?: string;
}
