import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Module({
  providers: [DatabaseService],
  controllers: [],
  exports: [DatabaseService],
})
export class DatabaseModule {}