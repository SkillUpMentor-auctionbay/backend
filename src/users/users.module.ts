import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { StatisticsService } from './statistics.service';
import { StorageModule } from '../common/storage/storage.module';
import { LoggingService } from '../common/services/logging.service';

@Module({
  imports: [StorageModule],
  providers: [UsersService, StatisticsService, LoggingService],
  controllers: [UsersController],
  exports: [UsersService, StatisticsService],
})
export class UsersModule {}
