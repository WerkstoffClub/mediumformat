import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { ORDER_STATUSES } from '../order-status';

export class PagedQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 50;
}

export class CustomersQueryDto extends PagedQueryDto {
  @IsOptional() @IsIn(['vip', 'new', 'repeat', 'wholesale']) segment?: 'vip' | 'new' | 'repeat' | 'wholesale';
}

export class OrdersQueryDto extends PagedQueryDto {
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsString() payment?: string;
  @IsOptional() @IsString() fulfillment?: string;
  /** Resolved channel label (placeholder customer → marketplace, else tag). */
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsIn([...ORDER_STATUSES]) status?: (typeof ORDER_STATUSES)[number];
  /** dealpos = DealPOS invoices, mf = orders placed on the website or in the back-office. */
  @IsOptional() @IsIn(['dealpos', 'mf']) source?: 'dealpos' | 'mf';
}

export class ChannelsQueryDto {
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
}

const PHONE = /^\+?[0-9 ()-]{8,20}$/;

export class CreateCustomerDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @ValidateIf((_, v) => v !== '') @IsEmail() @MaxLength(160) email?: string;
  @IsOptional() @ValidateIf((_, v) => v !== '') @Matches(PHONE, { message: 'phone must be a valid phone number' }) phone?: string;
  @IsOptional() @IsString() @MaxLength(40) channel?: string;
  @IsOptional() @IsBoolean() wholesale?: boolean;
  @IsOptional() @IsString() @MaxLength(600) notes?: string;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @ValidateIf((_, v) => v !== '') @IsEmail() @MaxLength(160) email?: string;
  @IsOptional() @ValidateIf((_, v) => v !== '') @Matches(PHONE, { message: 'phone must be a valid phone number' }) phone?: string;
  @IsOptional() @IsString() @MaxLength(40) channel?: string;
  @IsOptional() @IsBoolean() wholesale?: boolean;
  @IsOptional() @IsString() @MaxLength(600) notes?: string;
}

export class UpdateTrackingDto {
  /** null clears tracking (back to what DealPOS / the order status says). */
  @IsOptional() @IsIn(['PACKED', 'SHIPPED', 'DELIVERED', null]) stage!: 'PACKED' | 'SHIPPED' | 'DELIVERED' | null;
  @IsOptional() @IsString() @MaxLength(60) courier?: string;
  @IsOptional() @IsString() @MaxLength(80) trackingNo?: string;
}
