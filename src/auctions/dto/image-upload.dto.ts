import { ApiProperty } from '@nestjs/swagger';

export class ImageUploadResponseDto {
  @ApiProperty({
    description: 'Success message indicating the image was uploaded successfully',
    example: 'Image uploaded successfully',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'The accessible URL of the uploaded image',
    example: '/static/auction-images/auction_abc123.jpg',
    type: String,
    pattern: String.raw`^/static/auction-images/[a-zA-Z0-9_-]+\\.(jpg|jpeg|png|webp)$`,
  })
  imageUrl: string;
}

export class ImageUploadDto {
  @ApiProperty({
    description: 'Auction image file',
    type: 'string',
    format: 'binary',
    required: true,
  })
  file: Express.Multer.File;
}

export class ImageDeletionResponseDto {
  @ApiProperty({
    description: 'Success message indicating the image was deleted successfully',
    example: 'Image deleted successfully',
    type: String,
  })
  message: string;
}