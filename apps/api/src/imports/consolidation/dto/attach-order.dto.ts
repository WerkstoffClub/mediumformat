import { IsString } from 'class-validator';

export class AttachOrderDto {
  @IsString() importOrderId!: string;
}
