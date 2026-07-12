import { Module } from '@nestjs/common';
import { BandcampController } from './bandcamp.controller';
import { BandcampService } from './bandcamp.service';

@Module({
  controllers: [BandcampController],
  providers: [BandcampService],
  exports: [BandcampService],
})
export class BandcampModule {}
