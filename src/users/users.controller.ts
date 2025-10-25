import {
  Controller,
  Get,
  Patch,
  Delete,
  UseGuards,
  Request,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserDto } from './dto/user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import {
  ChangeProfilePictureResponseDto,
  FileUploadErrorDto,
  ProfilePictureUploadDto,
  RemoveProfilePictureResponseDto
} from './dto/change-profile-picture.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LoggingService } from '../common/services/logging.service';

@ApiTags('users')
@ApiBearerAuth('JWT')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private usersService: UsersService,
    private loggingService: LoggingService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token is missing or invalid',
  })
  async getMe(@Request() req): Promise<UserDto> {
    return req.user;
  }

  @Patch('me/update-password')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: UpdatePasswordDto, description: 'Password update data' })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password updated successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation error or same password',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Current password is incorrect',
  })
  async updatePassword(
    @Request() req,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(
      req.user.id,
      updatePasswordDto.currentPassword,
      updatePasswordDto.newPassword,
    );
  }

  @Patch('me/change-profile-picture')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Profile picture file to upload (max 5MB, allowed formats: JPEG, PNG, WebP)',
    type: ProfilePictureUploadDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Profile picture updated successfully',
    type: ChangeProfilePictureResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid file format, size too large, filename issues, or upload error',
    type: FileUploadErrorDto,
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - File validation failed',
    type: FileUploadErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token is missing or invalid',
  })
  async changeProfilePicture(
    @Request() req,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpeg|jpg|png|webp)$/,
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024, // 5MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    // Null check for file - this should never happen with ParseFilePipe but added for safety
    if (!file) {
      this.loggingService.logWarning('Profile picture upload attempted without file', {
        userId: req.user.id,
      });
      throw new BadRequestException('File is required for profile picture upload');
    }

    // Validate filename to prevent path traversal attacks
    if (!file.originalname || typeof file.originalname !== 'string') {
      this.loggingService.logWarning('Profile picture upload with invalid filename', {
        userId: req.user.id,
        fileName: file.originalname,
      });
      throw new BadRequestException('Invalid filename provided');
    }

    // Additional security validation for filename
    const sanitizedFilename = this.sanitizeFilename(file.originalname);
    if (sanitizedFilename !== file.originalname) {
      this.loggingService.logWarning('Profile picture upload with potentially malicious filename', {
        userId: req.user.id,
        originalFilename: file.originalname,
        sanitizedFilename,
      });
      throw new BadRequestException('Filename contains invalid characters');
    }

    this.loggingService.logInfo('Profile picture upload request', {
      userId: req.user.id,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    try {
      return await this.usersService.updateProfilePicture(req.user.id, file);
    } catch (error) {
      this.loggingService.logError('Profile picture upload failed', error, {
        userId: req.user.id,
        fileName: file.originalname,
        fileSize: file.size,
      });
      throw error;
    }
  }

  @Delete('me/remove-profile-picture')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Profile picture removed successfully',
    type: RemoveProfilePictureResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token is missing or invalid',
  })
  async removeProfilePicture(@Request() req) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('Invalid user context');
    }

    this.loggingService.logInfo('Profile picture removal request', {
      userId: req.user.id,
    });

    try {
      return await this.usersService.removeProfilePicture(req.user.id);
    } catch (error) {
      this.loggingService.logError('Profile picture removal failed', error, {
        userId: req.user.id,
      });
      throw error;
    }
  }

  /**
   * Sanitize filename to prevent path traversal and injection attacks
   */
  private sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      return '';
    }

    // Remove path separators and dangerous characters
    const sanitized = filename
      .replace(/[\\\/]/g, '_') // Replace path separators
      .replace(/\.\./g, '_') // Replace directory traversal attempts
      .replace(/[<>:"|?*]/g, '_') // Replace Windows forbidden characters
      .replace(/[\x00-\x1f\x80-\x9f]/g, '_') // Replace control characters
      .replace(/^\.+/, '') // Remove leading dots
      .trim();

    // Limit filename length to prevent buffer overflow attacks
    const maxLength = 255;
    return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
  }
}
