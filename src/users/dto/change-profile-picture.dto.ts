import { ApiProperty } from '@nestjs/swagger';

export enum AllowedFileType {
  JPEG = 'image/jpeg',
  JPG = 'image/jpg',
  PNG = 'image/png',
  WEBP = 'image/webp'
}

export enum AllowedFileExtension {
  JPEG = '.jpeg',
  JPG = '.jpg',
  PNG = '.png',
  WEBP = '.webp'
}

export class ChangeProfilePictureResponseDto {
  @ApiProperty({
    description: 'Success message indicating the profile picture was updated',
    example: 'Profile picture updated successfully',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'The new profile picture URL accessible via static file serving',
    example: '/static/profile-pictures/abc123_avatar.jpg',
    type: String,
    pattern: String.raw`^/static/profile-pictures/[a-zA-Z0-9_-]+_avatar\\.(jpg|jpeg|png|webp)$`,
  })
  profilePictureUrl: string;

  @ApiProperty({
    description: 'The updated user data with new profile picture URL',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        example: '507f1f77bcf86cd799439011',
        description: 'Unique user identifier'
      },
      name: {
        type: 'string',
        example: 'John',
        description: 'User first name'
      },
      surname: {
        type: 'string',
        example: 'Doe',
        description: 'User last name'
      },
      email: {
        type: 'string',
        example: 'john.doe@example.com',
        format: 'email',
        description: 'User email address'
      },
      profilePictureUrl: {
        type: 'string',
        example: '/static/profile-pictures/abc123_avatar.jpg',
        nullable: true,
        description: 'URL to user profile picture or null if not set'
      },
      createdAt: {
        type: 'string',
        example: '2023-12-01T12:00:00.000Z',
        format: 'date-time',
        description: 'Account creation timestamp'
      },
      updatedAt: {
        type: 'string',
        example: '2023-12-01T12:30:00.000Z',
        format: 'date-time',
        description: 'Last update timestamp'
      },
      tokenVersion: {
        type: 'number',
        example: 0,
        description: 'JWT token version for logout invalidation'
      },
    },
  })
  user: {
    id: string;
    name: string;
    surname: string;
    email: string;
    profilePictureUrl?: string;
    createdAt: Date;
    updatedAt: Date;
    tokenVersion: number;
  };
}

export class ProfilePictureUploadDto {
  @ApiProperty({
    description: 'Profile picture image file',
    type: 'string',
    format: 'binary',
    required: true,
  })
  file: Express.Multer.File;
}

export class FileUploadErrorDto {
  @ApiProperty({
    description: 'Human-readable error message explaining what went wrong',
    examples: [
      'File type image/gif is not allowed. Allowed types: image/jpeg, image/png, image/webp',
      'File size exceeds maximum allowed size of 5MB',
      'Filename contains invalid characters',
      'File extension .txt is not allowed. Allowed extensions: .jpg, .jpeg, .png, .webp',
      'File is required for profile picture upload',
      'Invalid filename provided',
      'Failed to save profile picture'
    ],
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'HTTP error type classification',
    example: 'Bad Request',
    enum: ['Bad Request', 'Unprocessable Entity'],
    type: String,
  })
  error: string;

  @ApiProperty({
    description: 'HTTP status code returned by the server',
    example: 400,
    enum: [400, 422],
    type: Number,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Detailed error information for debugging and validation feedback',
    type: 'object',
    properties: {
      fileName: {
        type: 'string',
        example: 'profile.gif',
        description: 'Name of the uploaded file that caused the error'
      },
      fileMimeType: {
        type: 'string',
        example: 'image/gif',
        description: 'MIME type of the uploaded file'
      },
      allowedMimeTypes: {
        type: 'array',
        items: { type: 'string' },
        example: ['image/jpeg', 'image/png', 'image/webp'],
        description: 'List of allowed MIME types for profile pictures'
      },
      fileSize: {
        type: 'number',
        example: 10485760,
        description: 'Size of the uploaded file in bytes'
      },
      maxSize: {
        type: 'number',
        example: 5242880,
        description: 'Maximum allowed file size in bytes (5MB)'
      },
      fileExtension: {
        type: 'string',
        example: '.gif',
        description: 'File extension of the uploaded file'
      },
      allowedExtensions: {
        type: 'array',
        items: { type: 'string' },
        example: ['.jpg', '.jpeg', '.png', '.webp'],
        description: 'List of allowed file extensions for profile pictures'
      },
    },
  })
  details?: {
    fileName?: string;
    fileMimeType?: string;
    allowedMimeTypes?: string[];
    fileSize?: number;
    maxSize?: number;
    fileExtension?: string;
    allowedExtensions?: string[];
  };
}

export class RemoveProfilePictureResponseDto {
  @ApiProperty({
    description: 'Success message indicating the profile picture was removed',
    example: 'Profile picture removed successfully',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'The updated user data with profile picture URL set to null',
    type: 'object',
    properties: {
      id: { type: 'string', example: '507f1f77bcf86cd799439011' },
      name: { type: 'string', example: 'John' },
      surname: { type: 'string', example: 'Doe' },
      email: { type: 'string', example: 'john.doe@example.com' },
      profilePictureUrl: {
        type: 'string',
        example: null,
        nullable: true,
        description: 'Always null after successful removal'
      },
      createdAt: { type: 'string', example: '2023-12-01T12:00:00.000Z' },
      updatedAt: { type: 'string', example: '2023-12-01T12:45:00.000Z' },
      tokenVersion: { type: 'number', example: 0 },
    },
  })
  user: {
    id: string;
    name: string;
    surname: string;
    email: string;
    profilePictureUrl?: null;
    createdAt: Date;
    updatedAt: Date;
    tokenVersion: number;
  };
}