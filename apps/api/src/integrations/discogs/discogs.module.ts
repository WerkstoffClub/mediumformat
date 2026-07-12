import { Module } from '@nestjs/common';
import { DiscogsController } from './discogs.controller';
import { DiscogsService } from './discogs.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [DiscogsController],
  providers: [DiscogsService],
  exports: [DiscogsService],
})
export class DiscogsModule {}
