import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingService } from '../logging.service';
import { IStorageProvider } from './storage-provider.interface';
import { LocalStorageProvider } from './local-storage.provider';
import { ImageKitStorageProvider } from './imagekit-storage.provider';

@Injectable()
export class StorageFactory {
  private storageProvider: IStorageProvider | null = null;

  constructor(
    private readonly localStorageProvider: LocalStorageProvider,
    private readonly imageKitStorageProvider: ImageKitStorageProvider,
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
  ) {}

  getStorageProvider(): IStorageProvider {
    if (this.storageProvider) {
      return this.storageProvider;
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const useImageKit =
      this.configService.get<string>('USE_IMAGEKIT', 'false') === 'true';

    if (nodeEnv === 'production' || useImageKit) {
      this.storageProvider = this.imageKitStorageProvider;
      this.loggingService.logInfo(
        `Using ImageKit storage provider (NODE_ENV: ${nodeEnv}, USE_IMAGEKIT: ${useImageKit})`,
      );
    } else {
      this.storageProvider = this.localStorageProvider;
      this.loggingService.logInfo(
        `Using Local storage provider (NODE_ENV: ${nodeEnv}, USE_IMAGEKIT: ${useImageKit})`,
      );
    }

    return this.storageProvider;
  }

  getStorageProviderName(): string {
    const provider = this.getStorageProvider();

    if (provider instanceof ImageKitStorageProvider) {
      return 'ImageKit';
    } else if (provider instanceof LocalStorageProvider) {
      return 'LocalStorage';
    }

    return 'Unknown';
  }
}
