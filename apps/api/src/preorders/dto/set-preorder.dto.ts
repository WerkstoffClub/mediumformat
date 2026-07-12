import { IsOptional, IsString } from 'class-validator';

export class SetPreorderDto {
  @IsString() eta!: string;
  @IsOptional() @IsString() notes?: string;
}
