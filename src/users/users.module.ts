import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { StatisticsService } from './statistics.service';
import { FileUploadService } from '../common/services/file-upload.service';
import { LoggingService } from '../common/services/logging.service';

@Module({
  providers: [UsersService, StatisticsService, FileUploadService, LoggingService],
  controllers: [UsersController],
  exports: [UsersService, StatisticsService],
})
export class UsersModule {}
