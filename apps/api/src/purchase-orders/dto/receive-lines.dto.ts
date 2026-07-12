import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveLineDto {
  @IsString() id!: string;
  @IsInt() @Min(0) qtyReceived!: number;
}

export class ReceiveLinesDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReceiveLineDto) lines!: ReceiveLineDto[];
}
