import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const STATUSES = ['active', 'scheduled', 'expired', 'disabled'] as const;

export class VoucherFilterDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: (typeof STATUSES)[number];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 25;
}
