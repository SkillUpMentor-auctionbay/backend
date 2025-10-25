import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { LoggingService, LogContext } from './logging.service';

@Injectable()
export class FileUploadService {
  private readonly uploadsDir = './uploads';
  private readonly profilePicturesDir = path.join(this.uploadsDir, 'profile-pictures');

  constructor(private loggingService: LoggingService) {
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
    } catch (error) {
      this.loggingService.logError(
        'Failed to create upload directories',
        error,
        {
          uploadsDir: this.uploadsDir,
          profilePicturesDir: this.profilePicturesDir,
        } as LogContext,
      );
      throw new BadRequestException('Failed to initialize upload directories');
    }
  }

  /**
   * Save profile picture for a user with transaction safety
   */
  async saveProfilePicture(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    // Validate input parameters
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID provided');
    }

    if (!file || !file.buffer || !file.originalname) {
      throw new BadRequestException('Invalid file provided');
    }

    let newFilePath: string | null = null;
    let oldFiles: string[] = [];

    try {
      // Find existing profile pictures for cleanup after successful save
      try {
        const files = fs.readdirSync(this.profilePicturesDir);
        oldFiles = files.filter(file => file.startsWith(`${userId}_avatar`));
      } catch (error) {
        this.loggingService.logWarning('Could not read profile pictures directory for cleanup check', {
          userId,
          error: error.message,
        } as LogContext);
      }

      // Generate unique filename with sanitized extension
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

      if (!allowedExtensions.includes(fileExtension)) {
        throw new BadRequestException(`File extension ${fileExtension} is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
      }

      const fileName = `${userId}_avatar${fileExtension}`;
      newFilePath = path.join(this.profilePicturesDir, fileName);

      this.ensureDirectoriesExist();

      fs.writeFileSync(newFilePath, file.buffer);

      try {
        const stats = fs.statSync(newFilePath);
        if (stats.size !== file.buffer.length) {
          throw new Error('File size mismatch after write');
        }
      } catch (error) {
        if (newFilePath && fs.existsSync(newFilePath)) {
          try {
            fs.unlinkSync(newFilePath);
          } catch (cleanupError) {
            this.loggingService.logError('Failed to cleanup partial file', cleanupError, {
              filePath: newFilePath,
            } as LogContext);
          }
        }
        throw new BadRequestException('File verification failed after save');
      }

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
      if (newFilePath && fs.existsSync(newFilePath)) {
        try {
          fs.unlinkSync(newFilePath);
          this.loggingService.logInfo('Cleaned up new profile picture due to error', {
            userId,
            filePath: newFilePath,
          } as LogContext);
        } catch (cleanupError) {
          this.loggingService.logError('Failed to cleanup new file after error', cleanupError, {
            filePath: newFilePath,
          } as LogContext);
        }
      }

      this.loggingService.logError(
        'Failed to save profile picture',
        error,
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
      throw new BadRequestException('Failed to save profile picture');
    }
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
}