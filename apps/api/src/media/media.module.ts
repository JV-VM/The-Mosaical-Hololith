import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { LocalMediaStorageService } from './local-media-storage.service';
import { MediaService } from './media.service';
import { MEDIA_STORAGE } from './media.storage';

@Module({
  providers: [
    MediaService,
    LocalMediaStorageService,
    {
      provide: MEDIA_STORAGE,
      useExisting: LocalMediaStorageService,
    },
  ],
  controllers: [MediaController],
  exports: [MediaService],
})
export class MediaModule {}
