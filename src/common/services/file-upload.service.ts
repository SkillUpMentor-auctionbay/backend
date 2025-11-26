import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LoggingService, LogContext } from './logging.service';
import { randomUUID } from 'node:crypto';

@Injectable()
export class FileUploadService {
  private readonly uploadsDir = './uploads';
  private readonly profilePicturesDir = path.join(this.uploadsDir, 'profile-pictures');
  private readonly auctionImagesDir = path.join(this.uploadsDir, 'auction-images');
  private readonly allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  constructor(private readonly loggingService: LoggingService) {
    this.ensureDirectoriesExist();
  }

  private ensureDirectoriesExist(): void {
    try {
      if (!fs.existsSync(this.uploadsDir)) {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
        this.loggingService.logInfo('Created uploads directory', {
          directory: this.uploadsDir,
        } as LogContext);
      }

      if (!fs.existsSync(this.profilePicturesDir)) {
        fs.mkdirSync(this.profilePicturesDir, { recursive: true });
        this.loggingService.logInfo('Created profile pictures directory', {
          directory: this.profilePicturesDir,
        } as LogContext);
      }

      if (!fs.existsSync(this.auctionImagesDir)) {
        fs.mkdirSync(this.auctionImagesDir, { recursive: true });
        this.loggingService.logInfo('Created auction images directory', {
          directory: this.auctionImagesDir,
        } as LogContext);
      }
    } catch (error) {
      this.loggingService.logError(
        'Failed to create upload directories',
        error,
        {
          uploadsDir: this.uploadsDir,
          profilePicturesDir: this.profilePicturesDir,
          auctionImagesDir: this.auctionImagesDir,
        } as LogContext,
      );
      throw new BadRequestException('Failed to initialize upload directories');
    }
  }


  private validateFileExtension(originalName: string): string {
    const fileExtension = path.extname(originalName).toLowerCase();

    if (!this.allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        `File extension ${fileExtension} is not allowed. Allowed extensions: ${this.allowedExtensions.join(', ')}`
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

  async saveProfilePicture(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    this.validateProfilePictureInput(userId, file);

    const fileExtension = this.validateFileExtension(file.originalname);
    const oldFiles = await this.getUserProfilePictureFiles(userId);

    let newFilePath: string | null = null;

    try {
      const fileName = `${userId}_avatar${fileExtension}`;
      newFilePath = path.join(this.profilePicturesDir, fileName);

      await this.writeProfilePictureFile(newFilePath, file.buffer);
      await this.verifyFileIntegrity(newFilePath, file.buffer.length);

      this.loggingService.logInfo('Profile picture saved successfully', {
        userId,
        fileName,
        filePath: newFilePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        oldFilesDeleted: oldFiles.length,
      } as LogContext);

      return `/static/profile-pictures/${fileName}`;

    } catch (error) {
      await this.cleanupFailedFile(newFilePath, userId);
      throw this.handleProfilePictureError(error, userId, file);
    }
  }

  private validateProfilePictureInput(userId: string, file: Express.Multer.File): void {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID provided');
    }

    if (!file?.buffer || !file?.originalname) {
      throw new BadRequestException('Invalid file provided');
    }
  }

  private async getUserProfilePictureFiles(userId: string): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.profilePicturesDir);
      return files.filter(file => file.startsWith(`${userId}_avatar`));
    } catch (error) {
      this.loggingService.logWarning('Could not read profile pictures directory for cleanup check', {
        userId,
        error: error.message,
      } as LogContext);
      return [];
    }
  }

  private async writeProfilePictureFile(filePath: string, buffer: Buffer): Promise<void> {
    this.ensureDirectoriesExist();
    fs.writeFileSync(filePath, buffer);
  }

  private async verifyFileIntegrity(filePath: string, expectedSize: number): Promise<void> {
    const stats = fs.statSync(filePath);
    if (stats.size !== expectedSize) {
      throw new Error('File size mismatch after write');
    }
  }

  private async cleanupFailedFile(filePath: string | null, userId: string): Promise<void> {
    if (!filePath || !fs.existsSync(filePath)) {
      return;
    }

    try {
      fs.unlinkSync(filePath);
      this.loggingService.logInfo('Cleaned up new profile picture due to error', {
        userId,
        filePath,
      } as LogContext);
    } catch (cleanupError) {
      this.loggingService.logError('Failed to cleanup new file after error', cleanupError, {
        filePath,
      } as LogContext);
    }
  }

  private async safeDeleteFile(filePath: string, errorContext: string): Promise<void> {
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      this.loggingService.logError(errorContext, cleanupError, { filePath } as LogContext);
    }
  }

  private handleProfilePictureError(
    error: unknown,
    userId: string,
    file: Express.Multer.File
  ): BadRequestException {
    this.loggingService.logError(
      'Failed to save profile picture',
      this.toError(error),
      {
        userId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      } as LogContext,
    );

    if (error instanceof BadRequestException) {
      return error;
    }

    return new BadRequestException('Failed to save profile picture');
  }

  async deleteProfilePicture(userId: string): Promise<void> {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID provided');
    }

    try {
      const files = fs.readdirSync(this.profilePicturesDir);
      const userFiles = files.filter(file => file.startsWith(`${userId}_avatar`));

      for (const file of userFiles) {
        const filePath = path.join(this.profilePicturesDir, file);
        fs.unlinkSync(filePath);

        this.loggingService.logInfo('Profile picture deleted successfully', {
          userId,
          fileName: file,
          filePath,
        } as LogContext);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.loggingService.logInfo('No existing profile picture to delete', {
          userId,
        } as LogContext);
        return;
      }

      this.loggingService.logError(
        'Failed to delete profile picture',
        error,
        {
          userId,
        } as LogContext,
      );
    }
  }

  async cleanupOldProfilePictures(userId: string, excludeFileName?: string): Promise<void> {
    if (!userId || typeof userId !== 'string') {
      this.loggingService.logWarning('Invalid user ID provided for cleanup', {
        userId,
      } as LogContext);
      return;
    }

    try {
      const files = fs.readdirSync(this.profilePicturesDir);
      const userFiles = files.filter(file => file.startsWith(`${userId}_avatar`));

      const filesToDelete = excludeFileName
        ? userFiles.filter(file => file !== excludeFileName)
        : userFiles;

      for (const file of filesToDelete) {
        const filePath = path.join(this.profilePicturesDir, file);
        try {
          fs.unlinkSync(filePath);
          this.loggingService.logInfo('Cleaned up old profile picture', {
            userId,
            fileName: file,
            filePath,
          } as LogContext);
        } catch (deleteError) {
          this.loggingService.logError('Failed to delete old profile picture file', deleteError, {
            userId,
            fileName: file,
            filePath,
          } as LogContext);
        }
      }

      if (filesToDelete.length > 0) {
        this.loggingService.logInfo('Profile picture cleanup completed', {
          userId,
          filesDeleted: filesToDelete.length,
          excludedFile: excludeFileName,
        } as LogContext);
      }
    } catch (error) {
      this.loggingService.logError(
        'Failed to cleanup old profile pictures',
        error,
        {
          userId,
          excludeFileName,
        } as LogContext,
      );
    }
  }

  async getProfilePictureUrl(userId: string): Promise<string | null> {
    try {
      const files = fs.readdirSync(this.profilePicturesDir);
      const userFile = files.find(file => file.startsWith(`${userId}_avatar`));

      if (userFile) {
        return `/static/profile-pictures/${userFile}`;
      }

      return null;
    } catch (error) {
      this.loggingService.logError(
        'Failed to get profile picture URL',
        error,
        {
          userId,
        } as LogContext,
      );
      return null;
    }
  }

  async cleanupUserProfilePictures(userIds: string[]): Promise<void> {
    try {
      const files = fs.readdirSync(this.profilePicturesDir);

      for (const file of files) {
        const userId = file.split('_avatar')[0];

        if (!userIds.includes(userId)) {
          const filePath = path.join(this.profilePicturesDir, file);
          fs.unlinkSync(filePath);

          this.loggingService.logInfo('Cleaned up orphaned profile picture', {
            userId,
            fileName: file,
            filePath,
          } as LogContext);
        }
      }
    } catch (error) {
      this.loggingService.logError(
        'Failed to cleanup profile pictures',
        error,
        {
          userIds,
        } as LogContext,
      );
    }
  }

  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    directory: string;
  }> {
    try {
      const files = fs.readdirSync(this.profilePicturesDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(this.profilePicturesDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }

      return {
        totalFiles: files.length,
        totalSize,
        directory: this.profilePicturesDir,
      };
    } catch (error) {
      this.loggingService.logError(
        'Failed to get storage stats',
        error,
        {} as LogContext,
      );
      return {
        totalFiles: 0,
        totalSize: 0,
        directory: this.profilePicturesDir,
      };
    }
  }

  async saveAuctionImage(file: Express.Multer.File): Promise<string> {
    this.validateAuctionImageInput(file);

    const fileExtension = this.validateFileExtension(file.originalname);
    const fileName = this.generateUniqueFileName(fileExtension);
    const filePath = path.join(this.auctionImagesDir, fileName);

    try {
      await this.writeAndVerifyAuctionImage(filePath, file.buffer);

      this.loggingService.logInfo('Auction image saved successfully', {
        fileName,
        filePath,
        fileSize: file.size,
        mimeType: file.mimetype,
      } as LogContext);

      return `/static/auction-images/${fileName}`;

    } catch (error) {
      await this.cleanupFailedAuctionImage(filePath);
      throw this.handleAuctionImageError(error, file);
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

  private async writeAndVerifyAuctionImage(filePath: string, buffer: Buffer): Promise<void> {
    this.ensureDirectoriesExist();
    fs.writeFileSync(filePath, buffer);

    const stats = fs.statSync(filePath);
    if (stats.size !== buffer.length) {
      throw new Error('File size mismatch after write');
    }
  }

  private async cleanupFailedAuctionImage(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      return;
    }

    try {
      fs.unlinkSync(filePath);
      this.loggingService.logInfo('Cleaned up new auction image due to error', {
        filePath,
      } as LogContext);
    } catch (cleanupError) {
      this.loggingService.logError('Failed to cleanup new file after error', cleanupError, {
        filePath,
      } as LogContext);
    }
  }

  private handleAuctionImageError(
    error: unknown,
    file: Express.Multer.File
  ): BadRequestException {
    this.loggingService.logError(
      'Failed to save auction image',
      this.toError(error),
      {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      } as LogContext,
    );

    if (error instanceof BadRequestException) {
      return error;
    }

    return new BadRequestException('Failed to save auction image');
  }

  async deleteAuctionImage(imageUrl: string): Promise<void> {
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new BadRequestException('Invalid image URL provided');
    }

    try {
      const fileName = imageUrl.split('/').at(-1);
      if (!fileName) {
        throw new BadRequestException('Invalid image URL format');
      }

      const filePath = path.join(this.auctionImagesDir, fileName);

      if (!fs.existsSync(filePath)) {
        this.loggingService.logWarning('Auction image file not found for deletion', {
          imageUrl,
          fileName,
          filePath,
        } as LogContext);
        return;
      }

      fs.unlinkSync(filePath);

      this.loggingService.logInfo('Auction image deleted successfully', {
        imageUrl,
        fileName,
        filePath,
      } as LogContext);

    } catch (error) {
      this.loggingService.logError(
        'Failed to delete auction image',
        error,
        {
          imageUrl,
        } as LogContext,
      );
      throw new BadRequestException('Failed to delete auction image');
    }
  }

  async cleanupOrphanedAuctionImages(existingImageUrls: string[]): Promise<void> {
    try {
      const files = fs.readdirSync(this.auctionImagesDir);
      const existingFileNames = new Set(existingImageUrls.map(url => url.split('/').at(-1)));

      for (const file of files) {
        if (!existingFileNames.has(file)) {
          const filePath = path.join(this.auctionImagesDir, file);
          const stats = fs.statSync(filePath);

          // Delete files older than 24 hours
          const fileAgeMs = Date.now() - stats.mtime.getTime();
          const twentyFourHoursMs = 24 * 60 * 60 * 1000;

          if (fileAgeMs > twentyFourHoursMs) {
            try {
              fs.unlinkSync(filePath);
              this.loggingService.logInfo('Cleaned up orphaned auction image', {
                fileName: file,
                filePath,
                fileAgeHours: fileAgeMs / (1000 * 60 * 60),
              } as LogContext);
            } catch (deleteError) {
              this.loggingService.logError('Failed to delete orphaned auction image', deleteError, {
                fileName: file,
                filePath,
              } as LogContext);
            }
          }
        }
      }
    } catch (error) {
      this.loggingService.logError(
        'Failed to cleanup orphaned auction images',
        error,
        {} as LogContext,
      );
    }
  }
}