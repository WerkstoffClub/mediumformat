import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const PO_STATUSES = ['DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED'] as const;

export class PoFilterDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(PO_STATUSES as unknown as string[]) status?: (typeof PO_STATUSES)[number];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 25;
}
