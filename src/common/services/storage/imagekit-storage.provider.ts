import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageProvider } from './storage-provider.interface';
import { LoggingService, LogContext } from '../logging.service';
import { randomUUID } from 'node:crypto';
import ImageKit = require('imagekit');

@Injectable()
export class ImageKitStorageProvider implements IStorageProvider {
  private readonly imagekit: ImageKit | null;
  private readonly allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  constructor(
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
  ) {
    const publicKey = this.configService.get<string>('IMAGEKIT_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('IMAGEKIT_PRIVATE_KEY');
    const urlEndpoint = this.configService.get<string>('IMAGEKIT_URL_ENDPOINT');

    if (publicKey && privateKey && urlEndpoint) {
      this.imagekit = new ImageKit({
        publicKey,
        privateKey,
        urlEndpoint,
      });

      this.loggingService.logInfo('ImageKit storage provider initialized', {
        urlEndpoint,
      } as LogContext);
    } else {
      this.imagekit = null;
      this.loggingService.logWarning(
        'ImageKit storage provider skipped - missing configuration',
        {
          publicKey: publicKey ? 'configured' : 'missing',
          privateKey: privateKey ? 'configured' : 'missing',
          urlEndpoint: urlEndpoint ? 'configured' : 'missing',
        } as LogContext,
      );
    }
  }

  private validateFileExtension(originalName: string): string {
    const fileExtension =
      originalName.toLowerCase().match(/\.[^.]*$/)?.[0] || '';

    if (!this.allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        `File extension ${fileExtension} is not allowed. Allowed extensions: ${this.allowedExtensions.join(', ')}`,
      );
    }

    return fileExtension;
  }

  private toError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    if (error && typeof error === 'object') {
      return new Error(JSON.stringify(error));
    }

    return new Error('Unknown error occurred');
  }

  async uploadProfilePicture(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (!this.imagekit) {
      throw new BadRequestException(
        'ImageKit storage provider not initialized',
      );
    }

    this.validateProfilePictureInput(userId, file);

    const fileExtension = this.validateFileExtension(file.originalname);

    try {
      const timestamp = Date.now();
      const fileName = `${userId}_avatar_${timestamp}${fileExtension}`;

      const uploadResult = await this.imagekit.upload({
        file: file.buffer.toString('base64'),
        fileName,
        folder: 'profile-pictures',
        useUniqueFileName: false,
        tags: [`user-${userId}`, 'profile-picture'],
      });

      this.loggingService.logInfo(
        'Profile picture uploaded to ImageKit successfully',
        {
          userId,
          fileName,
          fileId: uploadResult.fileId,
          url: uploadResult.url,
          fileSize: file.size,
          mimeType: file.mimetype,
        } as LogContext,
      );

      return uploadResult.url;
    } catch (error) {
      this.loggingService.logError(
        'Failed to upload profile picture to ImageKit',
        this.toError(error),
        {
          userId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
        } as LogContext,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to upload profile picture');
    }
  }

  private validateProfilePictureInput(
    userId: string,
    file: Express.Multer.File,
  ): void {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID provided');
    }

    if (!file?.buffer || !file?.originalname) {
      throw new BadRequestException('Invalid file provided');
    }
  }

  private async deleteExistingProfilePictures(userId: string): Promise<void> {
    try {
      const searchResult = await this.imagekit.listFiles({
        path: 'profile-pictures/',
        searchQuery: `name:${userId}_avatar*`,
      });

      const files = Array.isArray(searchResult) ? searchResult : [];

      if (files.length > 0) {
        const deletePromises = files.map((file) =>
          this.imagekit.deleteFile(file.fileId),
        );

        await Promise.allSettled(deletePromises);

        this.loggingService.logInfo(
          'Deleted existing profile pictures from ImageKit',
          {
            userId,
            deletedCount: files.length,
          } as LogContext,
        );
      }
    } catch (error) {
      this.loggingService.logWarning(
        'Could not delete existing profile pictures from ImageKit',
        {
          userId,
          error: this.toError(error).message,
        } as LogContext,
      );
    }
  }

  async uploadAuctionImage(file: Express.Multer.File): Promise<string> {
    if (!this.imagekit) {
      throw new BadRequestException(
        'ImageKit storage provider not initialized',
      );
    }

    this.validateAuctionImageInput(file);

    const fileExtension = this.validateFileExtension(file.originalname);
    const fileName = this.generateUniqueFileName(fileExtension);

    try {
      const uploadResult = await this.imagekit.upload({
        file: file.buffer.toString('base64'),
        fileName,
        folder: 'auction-images',
        useUniqueFileName: false,
        tags: ['auction-image'],
      });

      this.loggingService.logInfo(
        'Auction image uploaded to ImageKit successfully',
        {
          fileName,
          fileId: uploadResult.fileId,
          url: uploadResult.url,
          fileSize: file.size,
          mimeType: file.mimetype,
        } as LogContext,
      );

      return uploadResult.url;
    } catch (error) {
      this.loggingService.logError(
        'Failed to upload auction image to ImageKit',
        this.toError(error),
        {
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
        } as LogContext,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to upload auction image');
    }
  }

  private validateAuctionImageInput(file: Express.Multer.File): void {
    if (!file?.buffer || !file?.originalname) {
      throw new BadRequestException('Invalid file provided');
    }
  }

  private generateUniqueFileName(fileExtension: string): string {
    const timestamp = Date.now();
    const randomString = randomUUID().substring(0, 8);
    return `auction_${timestamp}_${randomString}${fileExtension}`;
  }

  async deleteProfilePicture(userId: string): Promise<void> {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID provided');
    }

    if (!this.imagekit) {
      throw new BadRequestException(
        'ImageKit storage provider not initialized',
      );
    }

    try {
      const searchResult = await this.imagekit.listFiles({
        path: 'profile-pictures/',
        searchQuery: `name HAS "${userId}"`,
      });

      let files = Array.isArray(searchResult) ? searchResult : [];

      // Additional safety: only keep files that actually belong to this user
      files = files.filter(
        (file) =>
          file.name.startsWith(`${userId}_avatar`) ||
          file.name.startsWith(`${userId}_`),
      );

      if (files.length > 0) {
        const deletePromises = files.map((file) =>
          this.imagekit.deleteFile(file.fileId),
        );

        const results = await Promise.allSettled(deletePromises);
        const deletedCount = results.filter(
          (result) => result.status === 'fulfilled',
        ).length;
        const failedResults = results.filter(
          (result) => result.status === 'rejected',
        );

        this.loggingService.logInfo('Manual delete - deletion results', {
          userId,
          deletedCount,
          failedCount: failedResults.length,
          totalFound: files.length,
          failureReasons: failedResults.map((r) =>
            r.status === 'rejected' ? r.reason : 'unknown',
          ),
        } as LogContext);

        if (failedResults.length > 0) {
          this.loggingService.logError(
            'Manual delete - some files failed to delete',
            new Error(
              failedResults
                .map((r) => (r.status === 'rejected' ? r.reason : 'unknown'))
                .join('; '),
            ),
            {
              userId,
              failedCount: failedResults.length,
            } as LogContext,
          );
        }
      } else {
        this.loggingService.logInfo(
          'Manual delete - no existing profile picture found in ImageKit',
          {
            userId,
          } as LogContext,
        );
      }
    } catch (error) {
      this.loggingService.logError(
        'Failed to delete profile picture from ImageKit',
        error,
        {
          userId,
        } as LogContext,
      );
    }
  }

  async deleteAuctionImage(imageUrl: string): Promise<void> {
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new BadRequestException('Invalid image URL provided');
    }

    if (!this.imagekit) {
      throw new BadRequestException(
        'ImageKit storage provider not initialized',
      );
    }

    try {
      const fileName = imageUrl.split('/').pop();
      if (!fileName) {
        throw new BadRequestException('Invalid image URL format');
      }

      const searchResult = await this.imagekit.listFiles({
        path: 'auction-images/',
        searchQuery: `name:${fileName}`,
      });

      const files = Array.isArray(searchResult) ? searchResult : [];

      if (files.length > 0) {
        const fileId = files[0].fileId;
        await this.imagekit.deleteFile(fileId);

        this.loggingService.logInfo(
          'Auction image deleted from ImageKit successfully',
          {
            imageUrl,
            fileName,
            fileId,
          } as LogContext,
        );
      } else {
        this.loggingService.logWarning(
          'Auction image not found in ImageKit for deletion',
          {
            imageUrl,
            fileName,
          } as LogContext,
        );
      }
    } catch (error) {
      this.loggingService.logError(
        'Failed to delete auction image from ImageKit',
        error,
        {
          imageUrl,
        } as LogContext,
      );
      throw new BadRequestException('Failed to delete auction image');
    }
  }

  async getProfilePictureUrl(userId: string): Promise<string | null> {
    if (!this.imagekit) {
      return null;
    }

    try {
      const searchResult = await this.imagekit.listFiles({
        path: 'profile-pictures/',
        searchQuery: `name HAS "${userId}"`,
      });

      let files = Array.isArray(searchResult) ? searchResult : [];

      // Additional safety: only keep files that actually belong to this user
      files = files.filter(
        (file) =>
          file.name.startsWith(`${userId}_avatar`) ||
          file.name.startsWith(`${userId}_`),
      );

      if (files.length > 0) {
        const sortedFiles = files.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        return sortedFiles[0].url;
      }

      return null;
    } catch (error) {
      this.loggingService.logError(
        'Failed to get profile picture URL from ImageKit',
        error,
        {
          userId,
        } as LogContext,
      );
      return null;
    }
  }

  async cleanupOldProfilePictures(
    userId: string,
    excludeFileName?: string,
  ): Promise<void> {
    if (!userId || typeof userId !== 'string') {
      this.loggingService.logWarning('Invalid user ID provided for cleanup', {
        userId,
      } as LogContext);
      return;
    }

    if (!this.imagekit) {
      this.loggingService.logWarning(
        'ImageKit storage provider not initialized for cleanup',
        {
          userId,
        } as LogContext,
      );
      return;
    }

    try {
      const searchResult = await this.imagekit.listFiles({
        path: 'profile-pictures/',
        searchQuery: `name HAS "${userId}"`,
      });

      let files = Array.isArray(searchResult) ? searchResult : [];

      files = files.filter(
        (file) =>
          file.name.startsWith(`${userId}_avatar`) ||
          file.name.startsWith(`${userId}_`),
      );

      if (files.length > 0) {
        const filesToDelete = excludeFileName
          ? files.filter((file) => file.name !== excludeFileName)
          : files;

        this.loggingService.logInfo('Files marked for deletion', {
          userId,
          filesToDelete: filesToDelete.map((f) => ({
            name: f.name,
            fileId: f.fileId,
          })),
          filesToDeleteCount: filesToDelete.length,
        } as LogContext);

        if (filesToDelete.length > 0) {
          const deletePromises = filesToDelete.map((file) =>
            this.imagekit.deleteFile(file.fileId),
          );

          const results = await Promise.allSettled(deletePromises);
          const deletedCount = results.filter(
            (result) => result.status === 'fulfilled',
          ).length;
          const failedResults = results.filter(
            (result) => result.status === 'rejected',
          );

          this.loggingService.logInfo('Profile picture deletion results', {
            userId,
            deletedCount,
            failedCount: failedResults.length,
            totalAttempted: filesToDelete.length,
            excludedFile: excludeFileName,
            failureReasons: failedResults.map((r) =>
              r.status === 'rejected' ? r.reason : 'unknown',
            ),
          } as LogContext);

          if (failedResults.length > 0) {
            this.loggingService.logError(
              'Some profile pictures failed to delete',
              new Error(
                failedResults
                  .map((r) => (r.status === 'rejected' ? r.reason : 'unknown'))
                  .join('; '),
              ),
              {
                userId,
                failedCount: failedResults.length,
              } as LogContext,
            );
          }
        } else {
          this.loggingService.logInfo(
            'No files to delete (all files excluded)',
            {
              userId,
              excludedFile: excludeFileName,
              totalFilesFound: files.length,
            } as LogContext,
          );
        }
      } else {
        this.loggingService.logInfo('No profile pictures found for cleanup', {
          userId,
          searchQuery: `name:${userId}_avatar*`,
        } as LogContext);
      }
    } catch (error) {
      this.loggingService.logError(
        'Failed to cleanup old profile pictures from ImageKit',
        error,
        {
          userId,
          excludeFileName,
        } as LogContext,
      );
    }
  }

  async cleanupUserProfilePictures(userIds: string[]): Promise<void> {
    if (!this.imagekit) {
      this.loggingService.logWarning(
        'ImageKit storage provider not initialized for user profile pictures cleanup',
        {
          userIds,
        } as LogContext,
      );
      return;
    }

    try {
      const searchResult = await this.imagekit.listFiles({
        path: 'profile-pictures/',
      });

      const files = Array.isArray(searchResult) ? searchResult : [];

      if (files.length > 0) {
        const filesToDelete: string[] = [];

        for (const file of files) {
          const userId = file.name.split('_avatar')[0];
          if (!userIds.includes(userId)) {
            filesToDelete.push(file.fileId);
          }
        }

        if (filesToDelete.length > 0) {
          const deletePromises = filesToDelete.map((fileId) =>
            this.imagekit.deleteFile(fileId),
          );

          const results = await Promise.allSettled(deletePromises);
          const deletedCount = results.filter(
            (result) => result.status === 'fulfilled',
          ).length;

          this.loggingService.logInfo(
            'Orphaned profile pictures cleaned up from ImageKit',
            {
              deletedCount,
              totalFound: filesToDelete.length,
            } as LogContext,
          );
        }
      }
    } catch (error) {
      this.loggingService.logError(
        'Failed to cleanup user profile pictures from ImageKit',
        error,
        {
          userIds,
        } as LogContext,
      );
    }
  }

  async cleanupOrphanedAuctionImages(
    existingImageUrls: string[],
  ): Promise<void> {
    if (!this.imagekit) {
      this.loggingService.logWarning(
        'ImageKit storage provider not initialized for orphaned auction images cleanup',
        {} as LogContext,
      );
      return;
    }

    try {
      const searchResult = await this.imagekit.listFiles({
        path: 'auction-images/',
      });

      const files = Array.isArray(searchResult) ? searchResult : [];

      if (files.length > 0) {
        const existingFileNames = new Set(
          existingImageUrls.map((url) => url.split('/').pop()),
        );
        const filesToDelete: string[] = [];

        for (const file of files) {
          if (!existingFileNames.has(file.name)) {
            const fileAgeMs = Date.now() - new Date(file.createdAt).getTime();
            const twentyFourHoursMs = 24 * 60 * 60 * 1000;

            if (fileAgeMs > twentyFourHoursMs) {
              filesToDelete.push(file.fileId);
            }
          }
        }

        if (filesToDelete.length > 0) {
          const deletePromises = filesToDelete.map((fileId) =>
            this.imagekit.deleteFile(fileId),
          );

          const results = await Promise.allSettled(deletePromises);
          const deletedCount = results.filter(
            (result) => result.status === 'fulfilled',
          ).length;

          this.loggingService.logInfo(
            'Orphaned auction images cleaned up from ImageKit',
            {
              deletedCount,
              totalFound: filesToDelete.length,
            } as LogContext,
          );
        }
      }
    } catch (error) {
      this.loggingService.logError(
        'Failed to cleanup orphaned auction images from ImageKit',
        error,
        {} as LogContext,
      );
    }
  }

  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    directory: string;
  }> {
    if (!this.imagekit) {
      return {
        totalFiles: 0,
        totalSize: 0,
        directory: 'profile-pictures',
      };
    }

    try {
      const profilePicturesResult = await this.imagekit.listFiles({
        path: 'profile-pictures/',
      });

      const files = Array.isArray(profilePicturesResult)
        ? profilePicturesResult
        : [];
      const totalFiles = files.length;
      let totalSize = 0;
      for (const file of files) {
        totalSize += (file as any).size || 0;
      }

      return {
        totalFiles,
        totalSize,
        directory: 'profile-pictures',
      };
    } catch (error) {
      this.loggingService.logError(
        'Failed to get storage stats from ImageKit',
        error,
        {} as LogContext,
      );
      return {
        totalFiles: 0,
        totalSize: 0,
        directory: 'profile-pictures',
      };
    }
  }
}
