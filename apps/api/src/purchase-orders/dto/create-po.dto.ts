import { IsArray, IsInt, IsISO8601, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePoLineDto {
  @IsOptional() @IsString() releaseId?: string;
  @IsString() description!: string;
  @IsInt() qtyOrdered!: number;
  @IsInt() unitCostIdr!: number;
}

export class CreatePoDto {
  @IsOptional() @IsString() supplierId?: string;
  @IsString() supplierName!: string;
  @IsOptional() @IsISO8601() etaAt?: string;
  @IsOptional() @IsISO8601() orderedAt?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreatePoLineDto) lines!: CreatePoLineDto[];
}
