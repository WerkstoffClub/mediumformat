import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateChannelPricingDto {
  @IsOptional() @IsNumber() @Min(0) @Max(1) feePct?: number;
  @IsOptional() @IsIn(['NEAREST_1000', 'X900']) rounding?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
