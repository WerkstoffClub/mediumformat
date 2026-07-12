import { IsArray, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

const SOURCES = ['STOREFRONT', 'CHECKOUT', 'POS', 'MANUAL', 'IMPORT'] as const;

export class CreateSubscriberDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsIn(SOURCES as unknown as string[]) source?: (typeof SOURCES)[number];
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}
