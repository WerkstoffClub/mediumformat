import { IsEnum } from 'class-validator';
import { ImportAttachmentKind } from '@prisma/client';

export class CreateAttachmentDto {
  @IsEnum(ImportAttachmentKind) kind!: ImportAttachmentKind;
}
