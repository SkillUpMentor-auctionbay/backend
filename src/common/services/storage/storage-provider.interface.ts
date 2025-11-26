export interface IStorageProvider {

  uploadProfilePicture(userId: string, file: Express.Multer.File): Promise<string>;

  uploadAuctionImage(file: Express.Multer.File): Promise<string>;

  deleteProfilePicture(userId: string): Promise<void>;

  deleteAuctionImage(imageUrl: string): Promise<void>;

  getProfilePictureUrl(userId: string): Promise<string | null>;

  cleanupOldProfilePictures(userId: string, excludeFileName?: string): Promise<void>;

  cleanupOrphanedAuctionImages(existingImageUrls: string[]): Promise<void>;

  cleanupUserProfilePictures(userIds: string[]): Promise<void>;

  getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    directory: string;
  }>;
}