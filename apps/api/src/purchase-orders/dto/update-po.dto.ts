import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreatePoDto } from './create-po.dto';

const PO_STATUSES = ['DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED'] as const;

export class UpdatePoDto extends PartialType(CreatePoDto) {
  @IsOptional() @IsIn(PO_STATUSES as unknown as string[]) status?: (typeof PO_STATUSES)[number];
}
