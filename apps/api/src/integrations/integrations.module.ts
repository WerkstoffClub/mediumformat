import { Module } from '@nestjs/common';
import { DiscogsModule } from './discogs/discogs.module';
import { AppleModule } from './apple/apple.module';
import { SpotifyModule } from './spotify/spotify.module';
import { YoutubeModule } from './youtube/youtube.module';
import { BandcampModule } from './bandcamp/bandcamp.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [UploadModule, DiscogsModule, AppleModule, SpotifyModule, YoutubeModule, BandcampModule],
  exports: [DiscogsModule, AppleModule, SpotifyModule, YoutubeModule, BandcampModule, UploadModule],
})
export class IntegrationsModule {}
