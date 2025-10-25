import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileUploadService } from '../common/services/file-upload.service';
import { LoggingService } from '../common/services/logging.service';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private fileUploadService: FileUploadService,
    private loggingService: LoggingService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        profile_picture_url: true,
        tokenVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      profilePictureUrl: user.profile_picture_url,
      profile_picture_url: undefined,
    };
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        profile_picture_url: true,
        tokenVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      profilePictureUrl: user.profile_picture_url,
      profile_picture_url: undefined,
    };
  }

  async findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async createUser(
    name: string,
    surname: string,
    email: string,
    password: string,
    profilePictureUrl?: string,
  ) {
    const user = await this.prisma.user.create({
      data: {
        name,
        surname,
        email,
        password,
        profile_picture_url: profilePictureUrl,
      },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        profile_picture_url: true,
        tokenVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...user,
      profilePictureUrl: user.profile_picture_url,
      profile_picture_url: undefined,
    };
  }

  async updateUser(
    id: string,
    data: Partial<{
      name: string;
      surname: string;
      email: string;
      profilePictureUrl: string;
    }>,
  ) {
    const dbData = {
      ...data,
      profile_picture_url: data.profilePictureUrl,
      profilePictureUrl: undefined,
    };

    const user = await this.prisma.user.update({
      where: { id },
      data: dbData,
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        profile_picture_url: true,
        tokenVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...user,
      profilePictureUrl: user.profile_picture_url,
      profile_picture_url: undefined,
    };
  }

  async updatePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedNewPassword },
    });

    return { message: 'Password updated successfully' };
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        profile_picture_url: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...user,
      profilePictureUrl: user.profile_picture_url,
      profile_picture_url: undefined,
    };
  }

  async incrementTokenVersion(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { tokenVersion: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const newTokenVersion = user.tokenVersion + 1;

    await this.prisma.user.update({
      where: { id },
      data: { tokenVersion: newTokenVersion },
    });

    return {
      message: 'Token version incremented successfully',
      newTokenVersion,
    };
  }

  async updateProfilePicture(userId: string, file: Express.Multer.File) {
    // Validate input parameters
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID provided');
    }

    if (!file || !file.buffer || !file.originalname) {
      throw new BadRequestException('Invalid file provided');
    }

    let savedFileName: string | null = null;

    try {
      // Save the profile picture and get the URL
      const profilePictureUrl = await this.fileUploadService.saveProfilePicture(
        userId,
        file,
      );

      // Extract filename from URL for cleanup
      const urlParts = profilePictureUrl.split('/');
      savedFileName = urlParts[urlParts.length - 1];

      // Update user's profile picture URL in database
      const updatedUser = await this.updateUser(userId, {
        profilePictureUrl,
      });

      // Clean up old profile pictures after successful database update
      await this.fileUploadService.cleanupOldProfilePictures(userId, savedFileName);

      return {
        message: 'Profile picture updated successfully',
        profilePictureUrl,
        user: updatedUser,
      };

    } catch (error) {
      // If database update failed, clean up the newly saved file
      if (savedFileName) {
        try {
          const filePath = `./uploads/profile-pictures/${savedFileName}`;
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupError) {
          // Log but don't throw cleanup errors
          console.error('Failed to cleanup file after database error:', cleanupError);
        }
      }

      // Re-throw the original error
      throw error;
    }
  }

  async removeProfilePicture(userId: string) {
    // Validate input parameters
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID provided');
    }

    try {
      // Delete the profile picture file
      await this.fileUploadService.deleteProfilePicture(userId);

      // Update user's profile picture URL in database to null
      const updatedUser = await this.updateUser(userId, {
        profilePictureUrl: null,
      });

      return {
        message: 'Profile picture removed successfully',
        user: updatedUser,
      };

    } catch (error) {
      this.loggingService.logError('Failed to remove profile picture', error, {
        userId,
      });

      // If it's a BadRequestException, re-throw it as-is
      if (error instanceof BadRequestException) {
        throw error;
      }

      // For other errors, wrap them in a BadRequestException
      throw new BadRequestException('Failed to remove profile picture');
    }
  }
}
