import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryPageDto } from './create-category-page.dto';

export class UpdateCategoryPageDto extends PartialType(CreateCategoryPageDto) {}
