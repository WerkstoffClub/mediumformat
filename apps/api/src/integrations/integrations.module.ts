import { Module } from '@nestjs/common';
import { DiscogsModule } from './discogs/discogs.module';
import { AppleModule } from './apple/apple.module';
import { BandcampModule } from './bandcamp/bandcamp.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [UploadModule, DiscogsModule, AppleModule, BandcampModule],
  exports: [DiscogsModule, AppleModule, BandcampModule, UploadModule],
})
export class IntegrationsModule {}
