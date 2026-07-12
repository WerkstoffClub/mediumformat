import { Module } from '@nestjs/common';
import { CategoryPagesService } from './category-pages.service';
import { CategoryPagesController } from './category-pages.controller';

@Module({
  providers: [CategoryPagesService],
  controllers: [CategoryPagesController],
  exports: [CategoryPagesService],
})
export class CategoryPagesModule {}
