import { Type } from 'class-transformer';
import {
  IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export const VENUE_STATUSES = ['ONBOARDING', 'LIVE', 'PAUSED'] as const;
export const EVENT_STATUSES = ['DRAFT', 'SCHEDULED', 'ON_SALE', 'SOLD_OUT', 'ENDED', 'CANCELLED'] as const;
export const SELL_CHANNELS = ['BOX_OFFICE', 'COMP'] as const;
export const PAYMENTS = ['CASH', 'QRIS', 'EDC', 'NONE'] as const;

export class CreateVenueDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(60) kind?: string;
  @IsOptional() @IsString() @MaxLength(80) area?: string;
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number | null;
  @IsOptional() @IsIn(VENUE_STATUSES as unknown as string[]) status?: (typeof VENUE_STATUSES)[number];
  @IsOptional() @IsNumber() @Min(0) @Max(100) feePct?: number;
  @IsOptional() @IsString() @MaxLength(200) contact?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
}
export class UpdateVenueDto extends PartialType(CreateVenueDto) {}

export class CreateEventDto {
  @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @IsString() venueId!: string;
  @IsString() startsAt!: string;
  @IsOptional() @IsString() doorsAt?: string | null;
  @IsOptional() @IsString() endsAt?: string | null;
  @IsOptional() @IsString() @MaxLength(500) lineup?: string | null;
  @IsOptional() @IsIn(EVENT_STATUSES as unknown as string[]) status?: (typeof EVENT_STATUSES)[number];
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
}
export class UpdateEventDto extends PartialType(CreateEventDto) {}

export class EventFilterDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() venueId?: string;
  @IsOptional() @IsIn([...EVENT_STATUSES, 'all']) status?: string;
  @IsOptional() @IsIn(['upcoming', 'past', 'all']) scope?: 'upcoming' | 'past' | 'all';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number = 50;
}

export class CreateTierDto {
  @IsString() @MinLength(1) @MaxLength(80) name!: string;
  @IsInt() @Min(0) priceIdr!: number;
  @IsInt() @Min(1) quota!: number;
  @IsOptional() @IsString() salesStart?: string | null;
  @IsOptional() @IsString() salesEnd?: string | null;
  @IsOptional() @IsInt() sortOrder?: number;
}
export class UpdateTierDto extends PartialType(CreateTierDto) {}

export class SellTicketsDto {
  @IsString() tierId!: string;
  @IsInt() @Min(1) @Max(20) qty!: number;
  @IsOptional() @IsString() @MaxLength(120) holderName?: string;
  @IsOptional() @IsEmail() holderEmail?: string;
  @IsIn(SELL_CHANNELS as unknown as string[]) channel!: (typeof SELL_CHANNELS)[number];
  @IsIn(PAYMENTS as unknown as string[]) payment!: (typeof PAYMENTS)[number];
}

export class TicketFilterDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number = 50;
}

export class CheckinDto {
  @IsString() @MinLength(3) @MaxLength(40) code!: string;
  @IsOptional() @IsString() @MaxLength(40) gate?: string;
}

export class SummaryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) days?: number = 30;
}
