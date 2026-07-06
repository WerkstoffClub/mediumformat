import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

export class PagedQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 50;
}

export class CustomersQueryDto extends PagedQueryDto {
  @IsOptional() @IsIn(['vip', 'new', 'repeat']) segment?: 'vip' | 'new' | 'repeat';
}

export class OrdersQueryDto extends PagedQueryDto {
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsString() payment?: string;
  @IsOptional() @IsString() fulfillment?: string;
}

export class ChannelsQueryDto {
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
}
