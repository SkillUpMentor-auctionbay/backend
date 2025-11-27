import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileUploadService } from '../common/services/file-upload.service';
import { LoggingService } from '../common/services/logging.service';
import * as bcrypt from 'bcryptjs';
import * as fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileUploadService: FileUploadService,
    private readonly loggingService: LoggingService,
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
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID provided');
    }

    if (!file?.buffer || !file?.originalname) {
      throw new BadRequestException('Invalid file provided');
    }

    let savedFileName: string | null = null;

    try {
      const profilePictureUrl = await this.fileUploadService.saveProfilePicture(
        userId,
        file,
      );

      const urlParts = profilePictureUrl.split('/');
      savedFileName = urlParts.at(-1);

      const updatedUser = await this.updateUser(userId, {
        profilePictureUrl,
      });

      await this.fileUploadService.cleanupOldProfilePictures(
        userId,
        savedFileName,
      );

      return {
        message: 'Profile picture updated successfully',
        profilePictureUrl,
        user: updatedUser,
      };
    } catch (error) {
      if (savedFileName) {
        try {
          const filePath = `./uploads/profile-pictures/${savedFileName}`;
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupError) {
          this.loggingService.logError(
            'Failed to cleanup file after database error',
            cleanupError,
            {
              userId,
              fileName: savedFileName,
            },
          );
        }
      }

      throw error;
    }
  }

  async removeProfilePicture(userId: string) {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID provided');
    }

    try {
      await this.fileUploadService.deleteProfilePicture(userId);

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

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to remove profile picture');
    }
  }

  async setPasswordResetToken(
    email: string,
  ): Promise<{ token: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    this.loggingService.logInfo('Password reset token generated', {
      userId: user.id,
      email: user.email,
    });

    return { token: resetToken };
  }

  async findByResetToken(token: string) {
    return this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.findByResetToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        tokenVersion: user.tokenVersion + 1,
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

    this.loggingService.logInfo('Password reset completed successfully', {
      userId: user.id,
      email: user.email,
    });

    return {
      ...updatedUser,
      profilePictureUrl: updatedUser.profile_picture_url,
      profile_picture_url: undefined,
    };
  }

  async clearPasswordResetToken(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
  }

  async clearPasswordResetTokenByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });
    }
  }
}
