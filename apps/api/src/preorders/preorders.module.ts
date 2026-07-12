import { Module } from '@nestjs/common';
import { PreordersController } from './preorders.controller';
import { PreordersService } from './preorders.service';

@Module({
  controllers: [PreordersController],
  providers: [PreordersService],
  exports: [PreordersService],
})
export class PreordersModule {}
