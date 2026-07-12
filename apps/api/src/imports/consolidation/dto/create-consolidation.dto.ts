import { IsOptional, IsString } from 'class-validator';

export class CreateConsolidationDto {
  @IsString() forwarderName!: string;
  @IsOptional() @IsString() trackingRaw?: string;
}
