import { Injectable, BadRequestException } from '@nestjs/common';
import { LoggingService, LogContext } from './logging.service';
import { StorageFactory } from './storage/storage-factory.service';
import { IStorageProvider } from './storage/storage-provider.interface';

@Injectable()
export class FileUploadService {
  constructor(
    private readonly storageFactory: StorageFactory,
    private readonly loggingService: LoggingService,
  ) {}

  private getStorageProvider(): IStorageProvider {
    return this.storageFactory.getStorageProvider();
  }

  async saveProfilePicture(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const storageProvider = this.getStorageProvider();

    this.loggingService.logInfo('Saving profile picture', {
      userId,
      fileName: file.originalname,
      fileSize: file.size,
      storageProvider: this.storageFactory.getStorageProviderName(),
    } as LogContext);

    try {
      return await storageProvider.uploadProfilePicture(userId, file);
    } catch (error) {
      this.loggingService.logError('Failed to save profile picture', error, {
        userId,
        fileName: file.originalname,
        fileSize: file.size,
        storageProvider: this.storageFactory.getStorageProviderName(),
      } as LogContext);
      throw error;
    }
  }

  async deleteProfilePicture(userId: string): Promise<void> {
    const storageProvider = this.getStorageProvider();

    this.loggingService.logInfo('Deleting profile picture', {
      userId,
      storageProvider: this.storageFactory.getStorageProviderName(),
    } as LogContext);

    try {
      await storageProvider.deleteProfilePicture(userId);
    } catch (error) {
      this.loggingService.logError('Failed to delete profile picture', error, {
        userId,
        storageProvider: this.storageFactory.getStorageProviderName(),
      } as LogContext);
      throw error;
    }
  }

  async cleanupOldProfilePictures(
    userId: string,
    excludeFileName?: string,
  ): Promise<void> {
    const storageProvider = this.getStorageProvider();

    this.loggingService.logInfo('Cleaning up old profile pictures', {
      userId,
      excludeFileName,
      storageProvider: this.storageFactory.getStorageProviderName(),
    } as LogContext);

    try {
      await storageProvider.cleanupOldProfilePictures(userId, excludeFileName);
    } catch (error) {
      this.loggingService.logError(
        'Failed to cleanup old profile pictures',
        error,
        {
          userId,
          excludeFileName,
          storageProvider: this.storageFactory.getStorageProviderName(),
        } as LogContext,
      );
      throw error;
    }
  }

  async getProfilePictureUrl(userId: string): Promise<string | null> {
    const storageProvider = this.getStorageProvider();

    try {
      return await storageProvider.getProfilePictureUrl(userId);
    } catch (error) {
      this.loggingService.logError('Failed to get profile picture URL', error, {
        userId,
        storageProvider: this.storageFactory.getStorageProviderName(),
      } as LogContext);
      return null;
    }
  }

  async cleanupUserProfilePictures(userIds: string[]): Promise<void> {
    const storageProvider = this.getStorageProvider();

    this.loggingService.logInfo('Cleaning up user profile pictures', {
      userIds,
      storageProvider: this.storageFactory.getStorageProviderName(),
    } as LogContext);

    try {
      await storageProvider.cleanupUserProfilePictures(userIds);
    } catch (error) {
      this.loggingService.logError(
        'Failed to cleanup user profile pictures',
        error,
        {
          userIds,
          storageProvider: this.storageFactory.getStorageProviderName(),
        } as LogContext,
      );
      throw error;
    }
  }

  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    directory: string;
  }> {
    const storageProvider = this.getStorageProvider();

    try {
      return await storageProvider.getStorageStats();
    } catch (error) {
      this.loggingService.logError('Failed to get storage stats', error, {
        storageProvider: this.storageFactory.getStorageProviderName(),
      } as LogContext);
      return {
        totalFiles: 0,
        totalSize: 0,
        directory: 'unknown',
      };
    }
  }

  async saveAuctionImage(file: Express.Multer.File): Promise<string> {
    const storageProvider = this.getStorageProvider();

    this.loggingService.logInfo('Saving auction image', {
      fileName: file.originalname,
      fileSize: file.size,
      storageProvider: this.storageFactory.getStorageProviderName(),
    } as LogContext);

    try {
      return await storageProvider.uploadAuctionImage(file);
    } catch (error) {
      this.loggingService.logError('Failed to save auction image', error, {
        fileName: file.originalname,
        fileSize: file.size,
        storageProvider: this.storageFactory.getStorageProviderName(),
      } as LogContext);
      throw error;
    }
  }

  async deleteAuctionImage(imageUrl: string): Promise<void> {
    const storageProvider = this.getStorageProvider();

    this.loggingService.logInfo('Deleting auction image', {
      imageUrl,
      storageProvider: this.storageFactory.getStorageProviderName(),
    } as LogContext);

    try {
      await storageProvider.deleteAuctionImage(imageUrl);
    } catch (error) {
      this.loggingService.logError('Failed to delete auction image', error, {
        imageUrl,
        storageProvider: this.storageFactory.getStorageProviderName(),
      } as LogContext);
      throw error;
    }
  }

  async cleanupOrphanedAuctionImages(
    existingImageUrls: string[],
  ): Promise<void> {
    const storageProvider = this.getStorageProvider();

    this.loggingService.logInfo('Cleaning up orphaned auction images', {
      existingImageUrls,
      storageProvider: this.storageFactory.getStorageProviderName(),
    } as LogContext);

    try {
      await storageProvider.cleanupOrphanedAuctionImages(existingImageUrls);
    } catch (error) {
      this.loggingService.logError(
        'Failed to cleanup orphaned auction images',
        error,
        {
          existingImageUrls,
          storageProvider: this.storageFactory.getStorageProviderName(),
        } as LogContext,
      );
      throw error;
    }
  }
}
