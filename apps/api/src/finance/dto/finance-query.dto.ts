import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export const GRANULARITIES = ['day', 'week', 'month'] as const;
export type Granularity = (typeof GRANULARITIES)[number];

export const MARGIN_GROUPS = ['release', 'category', 'tag'] as const;
export type MarginGroup = (typeof MARGIN_GROUPS)[number];

export const EXPORT_REPORTS = ['summary', 'timeseries', 'payments', 'margins'] as const;
export type ExportReport = (typeof EXPORT_REPORTS)[number];

export class FinanceQueryDto {
  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;

  @IsOptional()
  @IsString()
  outlet?: string;

  @IsOptional()
  @IsString()
  tag?: string;
}

export class TimeseriesQueryDto extends FinanceQueryDto {
  @IsOptional()
  @IsIn(GRANULARITIES)
  granularity?: Granularity;
}

export class MarginsQueryDto extends FinanceQueryDto {
  @IsOptional()
  @IsIn(MARGIN_GROUPS)
  groupBy?: MarginGroup;
}

export class ExportQueryDto extends FinanceQueryDto {
  @IsIn(EXPORT_REPORTS)
  report!: ExportReport;

  @IsOptional()
  @IsIn(GRANULARITIES)
  granularity?: Granularity;

  @IsOptional()
  @IsIn(MARGIN_GROUPS)
  groupBy?: MarginGroup;
}
