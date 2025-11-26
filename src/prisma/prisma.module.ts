import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { LoggingService } from '../common/services/logging.service';

@Global()
@Module({
  providers: [PrismaService, LoggingService],
  exports: [PrismaService, LoggingService],
})
export class PrismaModule {}
