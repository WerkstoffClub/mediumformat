import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const SOURCES = ['STOREFRONT', 'CHECKOUT', 'POS', 'MANUAL', 'IMPORT'] as const;
const CAMPAIGN_STATUSES = ['DRAFT', 'SCHEDULED', 'SENT'] as const;

export class SubscriberFilterDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(SOURCES as unknown as string[]) source?: (typeof SOURCES)[number];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 25;
}

export class CampaignFilterDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(CAMPAIGN_STATUSES as unknown as string[]) status?: (typeof CAMPAIGN_STATUSES)[number];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 25;
}
