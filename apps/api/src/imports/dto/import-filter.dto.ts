import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const IMPORT_STATUSES = [
  'DRAFT', 'SUBMITTED', 'CONSOLIDATED', 'PRICED', 'RECEIVED', 'INVENTORY_UPDATED', 'CANCELLED',
] as const;
const IMPORT_ORIGINS = ['INTERNATIONAL', 'DOMESTIC'] as const;

export class ImportFilterDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(IMPORT_STATUSES as unknown as string[]) status?: (typeof IMPORT_STATUSES)[number];
  @IsOptional() @IsIn(IMPORT_ORIGINS as unknown as string[]) origin?: (typeof IMPORT_ORIGINS)[number];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 25;
}
