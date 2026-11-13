import { IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SubscribeDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(32) source?: string;
}

export class ValidateVoucherDto {
  @IsString() @MaxLength(64) code!: string;
  @IsInt() @Min(0) @Max(1_000_000_000_000) subtotalIdr!: number;
}
