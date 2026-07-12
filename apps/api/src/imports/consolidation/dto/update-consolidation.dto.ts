import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateConsolidationDto {
  @IsOptional() @IsString() forwarderName?: string;
  @IsOptional() @IsNumber() @Min(0) forwarderInvoiceIdr?: number;
  @IsOptional() @IsNumber() @Min(0) weightKgTotal?: number;
  @IsOptional() @IsString() trackingRaw?: string;
  @IsOptional() @IsString() status?: string;
}
