import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const ID = /^[A-Za-z0-9-]{8,64}$/;

/** Storefront page-view beacon. Public endpoint: everything is validated and capped. */
export class TrackDto {
  @IsString() @MaxLength(500) @Matches(/^\//)
  path!: string;

  @IsOptional() @IsString() @MaxLength(500)
  referrer?: string;

  @IsString() @Matches(ID)
  visitorId!: string;

  @IsString() @Matches(ID)
  sessionId!: string;
}

export class VisitorsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @IsIn([7, 30, 90])
  days?: number;
}
