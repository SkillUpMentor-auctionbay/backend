import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { HealthController } from '../health/health.controller';

@Module({
  providers: [DatabaseService],
  controllers: [HealthController],
  exports: [DatabaseService],
})
export class DatabaseModule {}