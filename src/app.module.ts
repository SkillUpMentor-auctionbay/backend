import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuctionModule } from './auctions/auction.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StorageModule } from './common/storage/storage.module';
import { LoggingService } from './common/services/logging.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from './common/pipes/validation.pipe';

// Determine the appropriate .env file based on NODE_ENV
const getEnvFile = () => {
  const nodeEnv = process.env.NODE_ENV;
  return nodeEnv === 'production' ? '.env.prod' : '.env';
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFile(),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'),
      serveRoot: '/static',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AuctionModule,
    NotificationsModule,
    StorageModule,
  ],
  controllers: [],
  providers: [LoggingService, HttpExceptionFilter, ValidationPipe],
  exports: [LoggingService],
})
export class AppModule {}
