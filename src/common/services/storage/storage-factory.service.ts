import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  ) {}

  getStorageProvider(): IStorageProvider {
    if (this.storageProvider) {
      return this.storageProvider;
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const useImageKit = this.configService.get<string>('USE_IMAGEKIT', "false")  === "true";

    if (nodeEnv === 'production' || useImageKit) {
      this.storageProvider = this.imageKitStorageProvider;
    } else {
      this.storageProvider = this.localStorageProvider;
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