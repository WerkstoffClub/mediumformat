import { IsBoolean, IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class UpdateSocialSettingsDto {
  @IsOptional()
  @Matches(/^[\d+\-\s()]{6,20}$/, { message: 'waPhone must be a phone number' })
  waPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  waTemplate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  igUsername?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  fbPageUrl?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  storefrontUrlBase?: string;

  @IsOptional()
  @IsBoolean()
  feedEnabled?: boolean;
}
