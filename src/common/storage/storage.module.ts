import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggingService } from '../services/logging.service';
import { IStorageProvider } from '../services/storage/storage-provider.interface';
import { StorageFactory } from '../services/storage/storage-factory.service';
import { FileUploadService } from '../services/file-upload.service';
import { LocalStorageProvider } from '../services/storage/local-storage.provider';
import { ImageKitStorageProvider } from '../services/storage/imagekit-storage.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    LoggingService,
    LocalStorageProvider,
    ImageKitStorageProvider,
    StorageFactory,
    FileUploadService,
    {
      provide: 'IStorageProvider',
      useFactory: (storageFactory: StorageFactory) =>
        storageFactory.getStorageProvider(),
      inject: [StorageFactory],
    },
  ],
  exports: [FileUploadService, StorageFactory, 'IStorageProvider'],
})
export class StorageModule {}
