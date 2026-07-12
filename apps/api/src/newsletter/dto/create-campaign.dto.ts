import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const CAMPAIGN_STATUSES = ['DRAFT', 'SCHEDULED', 'SENT'] as const;

export class CreateCampaignDto {
  @IsString() subject!: string;
  @IsOptional() @IsString() previewText?: string;
  @IsString() body!: string;
  @IsOptional() @IsIn(CAMPAIGN_STATUSES as unknown as string[]) status?: (typeof CAMPAIGN_STATUSES)[number];
  @IsOptional() @IsString() scheduledAt?: string;
  @IsOptional() @IsInt() @Min(0) recipientCount?: number;
}
